"""Inbound webhooks: Meta WhatsApp verify/receive + custom workflow triggers."""
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.models import User, Workflow, WorkflowRun
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


@router.post("/meta")
async def meta_incoming(request: Request):
    """Receive WhatsApp messages. Acknowledged immediately (200) per Meta's spec."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    # Routing incoming WA messages to per-user workflows requires a
    # phone-number-id → user mapping, which isn't modelled yet. We acknowledge
    # so Meta doesn't retry; processing is a future step (not faked here).
    print(f"[nerum] WhatsApp inbound: {json.dumps(body)[:500]}")
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
