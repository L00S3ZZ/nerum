"""Inbound webhooks: Meta WhatsApp verify/receive + custom workflow triggers."""
import hashlib
import hmac
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import desc, select

from core.config import settings
from core.database import AsyncSessionLocal
from core.encryption import decrypt_data
from core.ratelimit import ip_key, limiter, webhook_key_key
from core.security import token_limit_for
from models.models import User, UserIntegration, Workflow, WorkflowRun
from routes.integrations import get_user_byok
from services.workflow_executor import WorkflowExecutor


router = APIRouter()


@router.get("/meta")
async def meta_verify(request: Request):
    """Meta webhook handshake (hub.challenge)."""
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == settings.META_VERIFY_TOKEN:
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(403, "Verification failed")


def _verify_meta_signature(raw: bytes, header: str | None) -> None:
    """Authenticate an inbound Meta webhook by its X-Hub-Signature-256 HMAC.

    Fail closed and uniform: every failure (secret unconfigured, missing/malformed
    header, HMAC mismatch) returns the SAME generic 403 so the caller can't tell
    them apart; the specific reason is logged server-side only. The caller MUST run
    this before parsing the payload or triggering any workflow.
    """
    secret = settings.META_APP_SECRET
    if not secret:
        print("[nerum] meta webhook rejected: META_APP_SECRET not set")
        raise HTTPException(403, "Invalid webhook signature")
    if not header or not header.startswith("sha256="):
        print("[nerum] meta webhook rejected: missing/malformed X-Hub-Signature-256 header")
        raise HTTPException(403, "Invalid webhook signature")
    expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    received = header.split("=", 1)[1]
    if not hmac.compare_digest(expected, received):
        print("[nerum] meta webhook rejected: signature mismatch")
        raise HTTPException(403, "Invalid webhook signature")


def _extract_wa_message(body: dict):
    """Pull (phone_number_id, sender, text) from a Meta WhatsApp webhook payload.

    Meta sends many non-message events (delivery receipts, status updates). Those
    have no `messages[]`, so we return the parts we found and let the caller skip.
    Returns (phone_number_id|None, sender|None, text|None).
    """
    try:
        value = body["entry"][0]["changes"][0]["value"]
    except (KeyError, IndexError, TypeError):
        return None, None, None
    if not isinstance(value, dict):
        return None, None, None
    phone_number_id = (value.get("metadata") or {}).get("phone_number_id")
    messages = value.get("messages")
    if not isinstance(messages, list) or not messages:
        return phone_number_id, None, None  # status/receipt event — skip
    msg = messages[0] or {}
    sender = msg.get("from")
    text = (msg.get("text") or {}).get("body")
    return phone_number_id, sender, text


def _is_whatsapp_trigger(cfg: dict) -> bool:
    """True if this workflow's graph is fired by an incoming WhatsApp message.

    Honors the documented `trigger_type == "whatsapp_message"` marker AND the
    representation the builder/executor actually use today: a trigger node whose
    `subtype`/`type` is "wa_received".
    """
    if cfg.get("trigger_type") == "whatsapp_message":
        return True
    for n in cfg.get("nodes", []) or []:
        if isinstance(n, dict) and (n.get("subtype") or n.get("type")) == "wa_received":
            return True
    return False


@router.post("/meta")
@limiter.limit("60/minute", key_func=ip_key)
async def meta_incoming(request: Request):
    """Receive WhatsApp messages and fire the matching user's workflow.

    Always returns 200 ("received") so Meta never retries: non-message events
    (delivery receipts, status updates), no-match cases, and any processing error
    are logged and swallowed rather than surfaced as a non-2xx. Work is done
    synchronously for now but fully guarded — a crash can never reach Meta.

    Authentication: the request is rejected with 403 before any parsing if its
    X-Hub-Signature-256 HMAC doesn't match — a forged payload never reaches the
    workflow trigger path below.
    """
    raw = await request.body()
    _verify_meta_signature(raw, request.headers.get("X-Hub-Signature-256"))

    try:
        body = json.loads(raw)
    except Exception:
        body = {}

    try:
        phone_number_id, sender, text = _extract_wa_message(body)

        # Non-message event or malformed payload — ack and skip.
        if not phone_number_id or not sender or text is None:
            print(f"[nerum] WhatsApp inbound (non-message/ignored): {json.dumps(body)[:300]}")
            return {"status": "received"}

        # 1. Short session: resolve owner + target workflow + quota + BYOK, and
        #    create the 'running' row. Closed BEFORE run_graph so the pool stays
        #    free during the (slow, networked) execution below.
        async with AsyncSessionLocal() as db:
            # Match the incoming phone_number_id to a user's stored WhatsApp creds.
            integrations = (
                await db.scalars(
                    select(UserIntegration).where(
                        UserIntegration.integration_type == "whatsapp",
                        UserIntegration.is_active.is_(True),
                    )
                )
            ).all()
            owner_id = None
            for row in integrations:
                try:
                    creds = decrypt_data(row.encrypted_credentials)
                except Exception:
                    continue  # bad/rotated key — don't let one row break routing
                if str(creds.get("phone_number_id")) == str(phone_number_id):
                    owner_id = row.user_id
                    break

            if owner_id is None:
                print(f"[nerum] WhatsApp inbound: no active integration for phone_number_id={phone_number_id}")
                return {"status": "received"}

            # Most-recently-created active workflow for this user with a WA trigger.
            workflows = (
                await db.scalars(
                    select(Workflow)
                    .where(Workflow.user_id == owner_id, Workflow.is_active.is_(True))
                    .order_by(desc(Workflow.created_at))
                )
            ).all()
            target = None
            for w in workflows:
                try:
                    cfg = json.loads(w.config or "{}")
                except Exception:
                    continue
                if _is_whatsapp_trigger(cfg):
                    target = (w, cfg)
                    break

            if not target:
                print(f"[nerum] WhatsApp inbound: user {owner_id} has no active whatsapp_message workflow")
                return {"status": "received"}

            w, cfg = target
            wf_id, wf_name = w.id, w.name

            # Quota gate. Over quota → log and still ack 200 (never break the
            # "always 200 to Meta" contract); just skip execution.
            owner = await db.get(User, owner_id)
            if owner is None:
                print(f"[nerum] WhatsApp inbound: owner {owner_id} not found")
                return {"status": "received"}
            if (owner.tokens_used or 0) >= token_limit_for(owner.plan):
                print(f"[nerum] WhatsApp inbound: owner {owner_id} over token limit — skipping execution")
                return {"status": "received"}

            byok = await get_user_byok(db, owner_id)
            run = WorkflowRun(
                user_id=owner_id, workflow_id=wf_id, workflow_name=wf_name,
                action="whatsapp", status="running",
            )
            db.add(run)
            await db.commit()
            await db.refresh(run)
            run_id = run.id

        # 2. Execute with NO DB connection held. Sender phone + message text land
        #    in the trigger payload so Soldier nodes resolve {{trigger.phone}} /
        #    {{trigger.message}}.
        trigger_data = {"phone": sender, "message": text}
        status = "success"
        try:
            results = await WorkflowExecutor(byok).run_graph(cfg, trigger_data)
            details = json.dumps(results, default=str)[:8000]
        except Exception as exc:
            status = "failed"
            details = str(exc)[:8000]
            print(f"[nerum] WhatsApp workflow {wf_id} failed: {exc}")

        # 3. Short session: persist the outcome + bump run/token counters.
        async with AsyncSessionLocal() as db:
            run = await db.get(WorkflowRun, run_id)
            if run:
                run.status = status
                run.details = details
            if status == "success":
                w = await db.get(Workflow, wf_id)
                if w:
                    w.runs = (w.runs or 0) + 1
                u = await db.get(User, owner_id)
                if u:
                    u.tokens_used = (u.tokens_used or 0) + 1
            await db.commit()
    except Exception as exc:
        # Catch-all: log, never raise — Meta must always get a 200.
        print(f"[nerum] WhatsApp inbound handler error: {exc}")

    return {"status": "received"}


@router.post("/receive/{webhook_key}")
@limiter.limit("30/minute", key_func=webhook_key_key)
async def receive(webhook_key: str, request: Request):
    """Generic webhook trigger: find the workflow by its webhook_key and run it.

    The webhook_key is an unguessable server-generated secret (token_urlsafe(32))
    stored in its own indexed column, so this is a single indexed lookup rather
    than a scan over every active workflow.

    Pool-safe shape (H3): the DB session is only checked out for the lookup +
    'running' row creation and again for the final write — never across
    run_graph's network calls.
    """
    # 1. Short session: resolve workflow + owner + quota + BYOK, create run row.
    async with AsyncSessionLocal() as db:
        # Single indexed lookup; an empty/NULL key never matches a real row.
        w = (
            await db.scalars(
                select(Workflow).where(
                    Workflow.webhook_key == webhook_key,
                    Workflow.is_active.is_(True),
                )
            )
        ).first()
        if not w:
            raise HTTPException(404, "Webhook not found or inactive")

        try:
            cfg = json.loads(w.config or "{}")
        except Exception:
            raise HTTPException(404, "Webhook not found or inactive")

        user = await db.get(User, w.user_id)
        if not user:
            raise HTTPException(404, "Owner not found")
        # Quota gate (after the 404 checks so we know the owner first).
        if (user.tokens_used or 0) >= token_limit_for(user.plan):
            raise HTTPException(429, "Token limit reached for your plan. Upgrade or wait for reset.")

        byok = await get_user_byok(db, user.id)
        wf_id, owner_id = w.id, user.id
        run = WorkflowRun(user_id=owner_id, workflow_id=wf_id, workflow_name=w.name, action="webhook", status="running")
        db.add(run)
        await db.commit()
        await db.refresh(run)
        run_id = run.id

    # 2. Parse the incoming payload + run the graph with NO connection held.
    try:
        incoming = await request.json()
    except Exception:
        incoming = dict(await request.form())

    status = "success"
    results = None
    try:
        results = await WorkflowExecutor(byok).run_graph(cfg, incoming if isinstance(incoming, dict) else {"data": incoming})
        details = json.dumps(results, default=str)[:8000]
    except Exception as exc:
        status = "failed"
        details = str(exc)[:8000]
        # Real cause stays server-side; caller gets a generic message.
        print(f"[nerum] webhook workflow {wf_id} failed: {exc}")

    # 3. Short session: persist the outcome + bump run/token counters.
    async with AsyncSessionLocal() as db:
        run = await db.get(WorkflowRun, run_id)
        if run:
            run.status = status
            run.details = details
        if status == "success":
            w = await db.get(Workflow, wf_id)
            if w:
                w.runs = (w.runs or 0) + 1
            u = await db.get(User, owner_id)
            if u:
                u.tokens_used = (u.tokens_used or 0) + 1
        await db.commit()

    if status == "success":
        return {"success": True, "results": results}
    raise HTTPException(502, "Workflow execution failed")
