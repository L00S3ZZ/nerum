"""Inbound webhooks: Meta WhatsApp verify/receive + custom workflow triggers."""
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.encryption import decrypt_data
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
async def meta_incoming(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive WhatsApp messages and fire the matching user's workflow.

    Always returns 200 ("received") so Meta never retries: non-message events
    (delivery receipts, status updates), no-match cases, and any processing error
    are logged and swallowed rather than surfaced as a non-2xx. Work is done
    synchronously for now but fully guarded — a crash can never reach Meta.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    try:
        phone_number_id, sender, text = _extract_wa_message(body)

        # Non-message event or malformed payload — ack and skip.
        if not phone_number_id or not sender or text is None:
            print(f"[nerum] WhatsApp inbound (non-message/ignored): {json.dumps(body)[:300]}")
            return {"status": "received"}

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

        # Same execution path receive() uses: WorkflowExecutor(byok).run_graph(...).
        # Sender phone + message text land in the trigger payload so downstream
        # Soldier nodes resolve {{trigger.phone}} / {{trigger.message}}.
        w, cfg = target
        trigger_data = {"phone": sender, "message": text}
        byok = await get_user_byok(db, owner_id)
        run = WorkflowRun(
            user_id=owner_id, workflow_id=w.id, workflow_name=w.name,
            action="whatsapp", status="running",
        )
        db.add(run)
        try:
            results = await WorkflowExecutor(byok).run_graph(cfg, trigger_data)
            run.status = "success"
            run.details = json.dumps(results, default=str)[:8000]
            w.runs = (w.runs or 0) + 1
        except Exception as exc:
            run.status = "failed"
            run.details = str(exc)[:8000]
            print(f"[nerum] WhatsApp workflow {w.id} failed: {exc}")
    except Exception as exc:
        # Catch-all: log, never raise — Meta must always get a 200.
        print(f"[nerum] WhatsApp inbound handler error: {exc}")

    return {"status": "received"}


@router.post("/receive/{webhook_key}")
async def receive(webhook_key: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Generic webhook trigger: find the workflow by its webhook_key and run it."""
    if not webhook_key or len(webhook_key) < 8:
        raise HTTPException(400, "Invalid webhook key")
    try:
        incoming = await request.json()
    except Exception:
        incoming = dict(await request.form())

    workflows = (await db.scalars(select(Workflow).where(Workflow.is_active.is_(True)))).all()
    target = None
    for w in workflows:
        try:
            cfg = json.loads(w.config or "{}")
        except Exception:
            continue
        if cfg.get("webhook_key") == webhook_key:
            target = (w, cfg)
            break
    if not target:
        raise HTTPException(404, "Webhook not found or inactive")

    w, cfg = target
    user = await db.get(User, w.user_id)
    if not user:
        raise HTTPException(404, "Owner not found")
    byok = await get_user_byok(db, user.id)
    run = WorkflowRun(user_id=user.id, workflow_id=w.id, workflow_name=w.name, action="webhook", status="running")
    db.add(run)
    try:
        results = await WorkflowExecutor(byok).run_graph(cfg, incoming if isinstance(incoming, dict) else {"data": incoming})
        run.status = "success"
        run.details = json.dumps(results, default=str)[:8000]
        w.runs = (w.runs or 0) + 1
        return {"success": True, "results": results}
    except Exception as exc:
        run.status = "failed"
        run.details = str(exc)[:8000]
        raise HTTPException(502, f"Workflow failed: {exc}")
