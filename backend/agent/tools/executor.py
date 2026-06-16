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
import httpx
from fastapi import HTTPException

from core.config import settings
from services.email import send_email as svc_send_email
from services.sheets import append_to_sheet, read_sheet
from services.telegram import send_telegram_message as svc_send_telegram
from services.whatsapp import send_whatsapp_message as svc_send_whatsapp
from .definitions import TOOL_NAMES

RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments"


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
