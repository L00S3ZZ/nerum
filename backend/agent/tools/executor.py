"""Executes the tool calls the Commander decides on.

Every handler returns the SAME envelope so the agent loop never has to special
case anything::

    {"success": bool, "result": <any> | None, "error": str | None}

A handler MUST NOT raise. The existing service functions raise ``HTTPException``
when a provider isn't configured or an upstream call fails; we translate those
(and any other exception) into ``success=False`` with a human-readable message,
because a single tool failure must never abort the whole agent run.

The services in ``services/`` are server-configured (global Meta WhatsApp token,
global Telegram bot, Resend, a shared Google service account). Per-user
credentials only exist today for Razorpay, so ``self.credentials`` is consulted
there and we fall back to the server settings everywhere else.
"""
import asyncio
import logging
from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from core.encryption import decrypt_data
from models.models import UserDbConnection
from services.email import send_email as svc_send_email
from services.sheets import append_to_sheet, read_sheet
from services.telegram import send_telegram_message as svc_send_telegram
from services.whatsapp import send_whatsapp_message as svc_send_whatsapp
from . import db_guard
from .definitions import TOOL_NAMES

RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments"

# Database integrations (query_database). Both limits are enforced on every query.
DB_QUERY_TIMEOUT = 10   # seconds — skill Rule 3
DB_MAX_ROWS = 1000      # rows — skill Rule 4

logger = logging.getLogger("nerum.agent.db")

_DB_DEFAULT_PORT = {"postgresql": 5432, "mysql": 3306, "mongodb": 27017}


def _ok(result) -> dict:
    return {"success": True, "result": result, "error": None}


def _err(message: str) -> dict:
    return {"success": False, "result": None, "error": message}


def _detail(exc: HTTPException) -> str:
    """Pull a readable string out of an HTTPException detail (which may be dict)."""
    d = exc.detail
    return d if isinstance(d, str) else str(d)


class ToolExecutor:
    """Routes a tool name + input to the matching async handler."""

    def __init__(self, user_id: int, db, credentials: dict | None = None):
        self.user_id = user_id
        self.db = db
        # {provider: {decrypted credential fields}} — only populated for providers
        # the user has connected. Missing keys are normal, never an error here.
        self.credentials = credentials or {}

    async def execute(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name not in TOOL_NAMES:
            return _err(f"Unknown tool: {tool_name}")
        handler = getattr(self, f"_{tool_name}", None)
        if handler is None:  # defined in the schema but not wired — guard anyway
            return _err(f"Tool not implemented: {tool_name}")
        params = tool_input or {}
        try:
            return await handler(params)
        except HTTPException as exc:
            return _err(_detail(exc))
        except Exception as exc:  # noqa: BLE001 — last line of defence for the loop
            return _err(f"{tool_name} failed: {exc}")

    # ── Google Sheets ────────────────────────────────────────────────────
    async def _fetch_sheets_data(self, params: dict) -> dict:
        spreadsheet_id = (params.get("spreadsheet_id") or "").strip()
        if not spreadsheet_id:
            return _err("spreadsheet_id is required to fetch sheet data.")
        sheet_name = params.get("sheet_name") or "Sheet1"

        raw = await read_sheet(spreadsheet_id, sheet_name)
        if not raw:
            return _ok({"rows": [], "count": 0})

        header = [str(h).strip() for h in raw[0]]
        rows: list[dict] = []
        for line in raw[1:]:
            # Rows can be shorter than the header when trailing cells are blank.
            row = {header[i]: (line[i] if i < len(line) else "") for i in range(len(header))}
            rows.append(row)

        filter_column = params.get("filter_column")
        filter_value = params.get("filter_value")
        if filter_column and filter_value is not None:
            wanted = str(filter_value).strip().lower()
            rows = [r for r in rows if str(r.get(filter_column, "")).strip().lower() == wanted]

        return _ok({"rows": rows, "count": len(rows), "columns": header})

    async def _write_sheets_data(self, params: dict) -> dict:
        spreadsheet_id = (params.get("spreadsheet_id") or "").strip()
        if not spreadsheet_id:
            return _err("spreadsheet_id is required to write sheet data.")
        sheet_name = params.get("sheet_name") or "Sheet1"
        data = params.get("data") or []
        mode = (params.get("mode") or "append").lower()

        if not isinstance(data, list) or not data:
            return _err("data must be a non-empty list of row objects.")
        if mode == "update":
            # No safe row-level update exists yet; appending instead of guessing a
            # target range would silently corrupt data, so we surface it honestly.
            return _err("Row 'update' mode is not supported yet — call again with mode 'append'.")

        # Column order comes from the first row object; every row is aligned to it.
        columns = list(data[0].keys()) if isinstance(data[0], dict) else None
        if not columns:
            return _err("Each item in data must be an object of column->value.")
        values = [[str(row.get(col, "")) for col in columns] for row in data]

        await append_to_sheet(spreadsheet_id, sheet_name, values)
        return _ok({"appended": len(values), "columns": columns})

    # ── WhatsApp ─────────────────────────────────────────────────────────
    async def _send_whatsapp_message(self, params: dict) -> dict:
        phone = (params.get("phone_number") or "").strip()
        message = params.get("message") or ""
        if not phone:
            return _err("phone_number is required.")
        if not message.strip():
            return _err("message cannot be empty.")
        res = await svc_send_whatsapp(phone, message)
        return _ok({"phone": phone, "message_id": res.get("message_id")})

    async def _send_whatsapp_bulk(self, params: dict) -> dict:
        recipients = params.get("recipients") or []
        template = params.get("message_template") or ""
        if not recipients:
            return _err("recipients list is empty.")
        if not template.strip():
            return _err("message_template cannot be empty.")

        sent = 0
        failed = 0
        results: list[dict] = []
        for r in recipients:
            phone = str((r or {}).get("phone") or "").strip()
            name = str((r or {}).get("name") or "").strip()
            if not phone:
                failed += 1
                results.append({"phone": None, "name": name, "success": False, "error": "missing phone"})
                continue
            personalised = template.replace("{name}", name or "there")
            try:
                res = await svc_send_whatsapp(phone, personalised)
                sent += 1
                results.append({"phone": phone, "name": name, "success": True, "message_id": res.get("message_id")})
            except HTTPException as exc:
                failed += 1
                results.append({"phone": phone, "name": name, "success": False, "error": _detail(exc)})
            except Exception as exc:  # noqa: BLE001 — one bad number can't stop the batch
                failed += 1
                results.append({"phone": phone, "name": name, "success": False, "error": str(exc)})

        # The batch as a whole "succeeds" if at least one message went out, so the
        # loop can continue and report partial delivery rather than treating a few
        # bad numbers as a total failure.
        envelope = {"sent": sent, "failed": failed, "results": results}
        return _ok(envelope) if sent else _err(f"All {failed} WhatsApp messages failed.")

    # ── Email ────────────────────────────────────────────────────────────
    async def _send_email(self, params: dict) -> dict:
        to_email = (params.get("to_email") or "").strip()
        subject = params.get("subject") or "Message from Nerum"
        body = params.get("body") or ""
        if not to_email:
            return _err("to_email is required.")
        if not body.strip():
            return _err("Email body cannot be empty.")
        # Wrap plain text so it renders; if the body already looks like HTML, send as-is.
        html = body if "<" in body and ">" in body else f"<div style='font-family:sans-serif;line-height:1.6'>{body}</div>"
        await svc_send_email(to=to_email, subject=subject, html=html)
        return _ok({"to": to_email, "subject": subject})

    # ── Telegram ─────────────────────────────────────────────────────────
    async def _send_telegram_message(self, params: dict) -> dict:
        chat_id = str(params.get("chat_id") or "").strip()
        message = params.get("message") or ""
        if not chat_id:
            return _err("chat_id is required.")
        if not message.strip():
            return _err("message cannot be empty.")
        await svc_send_telegram(chat_id, message)
        return _ok({"chat_id": chat_id})

    # ── Razorpay ─────────────────────────────────────────────────────────
    async def _fetch_razorpay_payments(self, params: dict) -> dict:
        key_id, key_secret = self._razorpay_keys()
        if not key_id or not key_secret:
            return _err("Razorpay not connected. Please connect it in the Integrations page.")

        status_filter = (params.get("status") or "all").lower()
        try:
            count = int(params.get("count") or 20)
        except (TypeError, ValueError):
            count = 20
        count = max(1, min(count, 100))  # Razorpay caps page size at 100

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                RAZORPAY_PAYMENTS_URL,
                params={"count": count},
                auth=(key_id, key_secret),
            )
        if resp.status_code != 200:
            return _err(f"Razorpay API error: {resp.text[:300]}")

        items = resp.json().get("items", [])
        payments = [
            {
                "id": p.get("id"),
                "amount": (p.get("amount") or 0) / 100,  # paise -> rupees
                "currency": p.get("currency"),
                "status": p.get("status"),
                "method": p.get("method"),
                "email": p.get("email"),
                "contact": p.get("contact"),
                "created_at": p.get("created_at"),
            }
            for p in items
        ]

        if status_filter == "paid":
            payments = [p for p in payments if p["status"] == "captured"]
        elif status_filter == "unpaid":
            payments = [p for p in payments if p["status"] != "captured"]

        return _ok({"payments": payments, "count": len(payments)})

    def _razorpay_keys(self) -> tuple[str, str]:
        """Prefer the user's connected keys; fall back to the server's."""
        creds = self.credentials.get("razorpay") or {}
        key_id = creds.get("key_id") or creds.get("razorpay_key_id") or settings.RAZORPAY_KEY_ID
        key_secret = creds.get("key_secret") or creds.get("razorpay_key_secret") or settings.RAZORPAY_KEY_SECRET
        return (key_id or "").strip(), (key_secret or "").strip()

    # ── Message composition (local, no extra LLM call) ───────────────────
    async def _generate_message(self, params: dict) -> dict:
        context = params.get("context") or ""
        if not context.strip():
            return _err("context is required to generate a message.")
        variables = params.get("variables") or {}
        message = context
        if isinstance(variables, dict):
            for key, value in variables.items():
                message = message.replace("{" + str(key) + "}", str(value))
        return _ok({
            "message": message,
            "tone": params.get("tone") or "friendly",
            "language": params.get("language") or "english",
        })

    # ── Scheduling ───────────────────────────────────────────────────────
    async def _schedule_workflow(self, params: dict) -> dict:
        cron = (params.get("cron_expression") or "").strip()
        name = (params.get("workflow_name") or "").strip()
        if not cron:
            return _err("cron_expression is required to schedule a workflow.")
        if len(cron.split()) != 5:
            return _err("cron_expression must have 5 fields: 'minute hour day month weekday'.")
        if not name:
            return _err("workflow_name is required.")
        # Actual persistence/registration is handled by the scheduler subsystem;
        # here we only acknowledge so the agent can confirm to the user.
        return _ok({
            "scheduled": True,
            "cron_expression": cron,
            "workflow_name": name,
            "description": params.get("description") or "",
            "message": f"Workflow '{name}' scheduled ({cron}).",
        })

    # ── Gmail (not available) ────────────────────────────────────────────
    async def _fetch_gmail_emails(self, params: dict) -> dict:
        # Inbound Gmail reading was retired with V1's OAuth flow; Nerum currently
        # sends mail via Resend but cannot read an inbox. Be honest, don't pretend.
        return _err(
            "Reading Gmail is not available yet. Nerum can send email "
            "(send_email) but cannot fetch inbox messages."
        )

    # ── Database integrations (the "Database Soldier") ───────────────────────
    async def _query_database(self, params: dict) -> dict:
        """Run a query against one of the user's connected databases.

        Safety contract (see .claude/skills/nerum-db-integrations):
          * ownership-scoped lookup; credentials decrypted server-side only and
            never logged or returned;
          * every query is classified by db_guard BEFORE execution and rejected
            if the connection's toggles don't permit it;
          * 10s timeout AND 1000-row cap enforced together;
          * the connection is opened per-call and always closed (never pooled).
        """
        connection_id = params.get("connection_id")
        try:
            connection_id = int(connection_id)
        except (TypeError, ValueError):
            return _err("connection_id (integer) is required.")

        # 1. Ownership-scoped lookup via its own short-lived session.
        try:
            async with AsyncSessionLocal() as db:
                row = (
                    await db.scalars(
                        select(UserDbConnection).where(
                            UserDbConnection.id == connection_id,
                            UserDbConnection.user_id == self.user_id,
                        )
                    )
                ).first()
                if row is None:
                    return _err("Database connection not found.")
                if not row.is_active:
                    return _err("That database connection is disabled.")
                db_type = row.db_type
                allow_write = bool(row.allow_write)
                allow_delete = bool(row.allow_delete)
                encrypted = row.encrypted_credentials
        except Exception:  # noqa: BLE001
            return _err("Could not load the database connection.")

        # 2. Decrypt server-side only — never logged, never returned.
        try:
            creds = decrypt_data(encrypted)
        except Exception:  # noqa: BLE001
            return _err("Stored credentials for this connection could not be read.")

        # 3. Guard the query/operation BEFORE touching the database.
        if db_type in ("postgresql", "mysql"):
            query = params.get("query")
            if not isinstance(query, str) or not query.strip():
                return _err("A SQL 'query' string is required for this connection.")
            sql_params = params.get("params") or []
            if not isinstance(sql_params, list):
                return _err("'params' must be a list of values for the SQL placeholders.")
            verdict = db_guard.guard_sql(query, allow_write, allow_delete)
        elif db_type == "mongodb":
            mongo_op = params.get("mongo_operation")
            if not isinstance(mongo_op, dict) or not mongo_op:
                return _err("A 'mongo_operation' object is required for this connection.")
            verdict = db_guard.guard_mongo(mongo_op, allow_write, allow_delete)
        else:
            return _err(f"Unsupported database type: {db_type}")

        if not verdict["allowed"]:
            logger.info(
                "query_database REJECTED: connection_id=%s op_type=%s reason=%s",
                connection_id, verdict.get("operation_type"), verdict.get("reason"),
            )
            return _err(verdict.get("reason") or "This query is not permitted on this connection.")

        op_type = verdict["operation_type"]

        # 4. Execute under BOTH the timeout and the row cap; always close.
        try:
            if db_type == "postgresql":
                data = await asyncio.wait_for(
                    self._db_run_postgres(creds, verdict["query"], sql_params, op_type),
                    timeout=DB_QUERY_TIMEOUT,
                )
            elif db_type == "mysql":
                data = await asyncio.wait_for(
                    self._db_run_mysql(creds, verdict["query"], sql_params, op_type),
                    timeout=DB_QUERY_TIMEOUT,
                )
            else:  # mongodb
                data = await asyncio.wait_for(
                    self._db_run_mongo(creds, mongo_op, op_type),
                    timeout=DB_QUERY_TIMEOUT,
                )
        except asyncio.TimeoutError:
            return _err(f"The query exceeded the {DB_QUERY_TIMEOUT}s limit and was cancelled.")
        except Exception:  # noqa: BLE001 — raw driver errors may carry host/creds
            return _err("The database query failed. Check the query and the connection settings.")

        # 5. Best-effort usage stamp.
        try:
            async with AsyncSessionLocal() as db:
                r = await db.get(UserDbConnection, connection_id)
                if r:
                    r.last_used_at = datetime.utcnow()
                    await db.commit()
        except Exception:  # noqa: BLE001
            pass

        # 6. Success — operation type + results only, never credentials.
        return _ok({"operation_type": op_type, **data})

    async def _db_run_postgres(self, creds: dict, query: str, params: list, op_type: str) -> dict:
        import asyncpg

        conn = await _pg_connect(creds)
        try:
            if op_type == "read":
                rows: list[dict] = []
                async with conn.transaction():
                    # Server-side statement timeout (belt) — asyncio.wait_for is the
                    # suspenders. Cursor stops at DB_MAX_ROWS (mechanism b).
                    await conn.execute(f"SET LOCAL statement_timeout = {DB_QUERY_TIMEOUT * 1000}")
                    async for record in conn.cursor(query, *params):
                        rows.append(dict(record))
                        if len(rows) >= DB_MAX_ROWS:
                            break
                return {"rows": rows, "row_count": len(rows)}
            status = await conn.execute(query, *params)  # e.g. "UPDATE 5"
            return {"rows": None, "row_count": _affected_from_status(status), "status": status}
        finally:
            await conn.close()

    async def _db_run_mysql(self, creds: dict, query: str, params: list, op_type: str) -> dict:
        import asyncmy

        conn = await asyncmy.connect(
            host=creds.get("host"),
            port=int(creds.get("port") or _DB_DEFAULT_PORT["mysql"]),
            user=creds.get("user"),
            password=creds.get("password") or "",
            database=creds.get("database"),
            connect_timeout=DB_QUERY_TIMEOUT,
        )
        try:
            async with conn.cursor() as cur:
                # Server-side cap for SELECTs where supported (MySQL 5.7.8+); ignored
                # elsewhere. asyncio.wait_for remains the hard stop.
                try:
                    await cur.execute(f"SET SESSION max_execution_time={DB_QUERY_TIMEOUT * 1000}")
                except Exception:  # noqa: BLE001 — MariaDB / older MySQL lack this var
                    pass
                await cur.execute(query, tuple(params) if params else None)
                if op_type == "read":
                    fetched = await cur.fetchmany(DB_MAX_ROWS)  # caps the read (mechanism b)
                    columns = [d[0] for d in (cur.description or [])]
                    rows = [dict(zip(columns, r)) for r in fetched]
                    return {"rows": rows, "row_count": len(rows)}
                await conn.commit()  # asyncmy is not autocommit — persist the write
                return {"rows": None, "row_count": cur.rowcount}
        finally:
            conn.close()

    async def _db_run_mongo(self, creds: dict, op: dict, op_type: str) -> dict:
        from motor.motor_asyncio import AsyncIOMotorClient

        client = _mongo_client(creds)
        try:
            db_name = op.get("database") or creds.get("database")
            database = client[db_name] if db_name else client.get_default_database()
            coll_name = op.get("collection")
            name = str(op.get("operation") or "").lower()
            max_ms = DB_QUERY_TIMEOUT * 1000

            # Collection-level admin ops first.
            if name == "dropdatabase":
                await client.drop_database(database.name)
                return {"rows": None, "row_count": None, "result": "database dropped"}
            if not coll_name:
                return {"rows": None, "row_count": None, "result": "collection is required"}
            coll = database[coll_name]

            if name == "find":
                cursor = coll.find(
                    op.get("filter") or {},
                    op.get("projection"),
                    max_time_ms=max_ms,
                ).limit(DB_MAX_ROWS)  # caps the read (mechanism b)
                docs = await cursor.to_list(length=DB_MAX_ROWS)
                return {"rows": docs, "row_count": len(docs)}
            if name == "aggregate":
                pipeline = list(op.get("pipeline") or []) + [{"$limit": DB_MAX_ROWS}]
                cursor = coll.aggregate(pipeline, maxTimeMS=max_ms)
                docs = await cursor.to_list(length=DB_MAX_ROWS)
                return {"rows": docs, "row_count": len(docs)}
            if name in ("countdocuments", "count"):
                n = await coll.count_documents(op.get("filter") or {}, maxTimeMS=max_ms)
                return {"rows": None, "row_count": n, "result": n}
            if name == "distinct":
                vals = await coll.distinct(op.get("field") or op.get("key"), op.get("filter") or {})
                return {"rows": vals[:DB_MAX_ROWS], "row_count": len(vals[:DB_MAX_ROWS])}

            # Writes
            if name == "insertone":
                res = await coll.insert_one(op.get("document") or {})
                return {"rows": None, "row_count": 1, "result": str(res.inserted_id)}
            if name == "insertmany":
                res = await coll.insert_many(op.get("documents") or [])
                return {"rows": None, "row_count": len(res.inserted_ids)}
            if name in ("updateone", "updatemany"):
                fn = coll.update_one if name == "updateone" else coll.update_many
                res = await fn(op.get("filter") or {}, op.get("update") or {})
                return {"rows": None, "row_count": res.modified_count}
            if name == "replaceone":
                res = await coll.replace_one(op.get("filter") or {}, op.get("document") or op.get("replacement") or {})
                return {"rows": None, "row_count": res.modified_count}
            if name in ("findoneandupdate", "findoneandreplace"):
                fn = coll.find_one_and_update if name == "findoneandupdate" else coll.find_one_and_replace
                doc = await fn(op.get("filter") or {}, op.get("update") or op.get("document") or {})
                return {"rows": [doc] if doc else [], "row_count": 1 if doc else 0}

            # Destructive
            if name in ("deleteone", "deletemany"):
                fn = coll.delete_one if name == "deleteone" else coll.delete_many
                res = await fn(op.get("filter") or {})
                return {"rows": None, "row_count": res.deleted_count}
            if name == "findoneanddelete":
                doc = await coll.find_one_and_delete(op.get("filter") or {})
                return {"rows": [doc] if doc else [], "row_count": 1 if doc else 0}
            if name in ("drop", "dropcollection"):
                await coll.drop()
                return {"rows": None, "row_count": None, "result": "collection dropped"}
            if name == "renamecollection":
                await coll.rename(op.get("new_name") or op.get("to"))
                return {"rows": None, "row_count": None, "result": "collection renamed"}

            # Should be unreachable — the guard only allows known operations.
            return {"rows": None, "row_count": None, "result": "operation not executed"}
        finally:
            client.close()


# ── database connection helpers (lazy-imported drivers; short-lived) ─────────
async def _pg_connect(creds: dict):
    import asyncpg

    if creds.get("uri"):
        return await asyncpg.connect(dsn=creds["uri"], timeout=DB_QUERY_TIMEOUT)
    return await asyncpg.connect(
        host=creds.get("host"),
        port=int(creds.get("port") or _DB_DEFAULT_PORT["postgresql"]),
        user=creds.get("user"),
        password=creds.get("password"),
        database=creds.get("database"),
        ssl=creds.get("ssl"),
        timeout=DB_QUERY_TIMEOUT,
    )


def _mongo_client(creds: dict):
    from motor.motor_asyncio import AsyncIOMotorClient

    ms = DB_QUERY_TIMEOUT * 1000
    if creds.get("uri"):
        return AsyncIOMotorClient(creds["uri"], serverSelectionTimeoutMS=ms)
    return AsyncIOMotorClient(
        host=creds.get("host"),
        port=int(creds.get("port") or _DB_DEFAULT_PORT["mongodb"]),
        username=creds.get("user"),
        password=creds.get("password"),
        serverSelectionTimeoutMS=ms,
    )


def _affected_from_status(status: str) -> int | None:
    """Pull the affected-row count out of an asyncpg command status like
    'UPDATE 5' / 'DELETE 2' / 'INSERT 0 3'. Returns None if not parseable."""
    try:
        return int(str(status).split()[-1])
    except (ValueError, IndexError, AttributeError):
        return None
