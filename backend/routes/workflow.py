"""Workflow CRUD + REAL execution (no fake success)."""
import json
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_user
from models.models import User, Workflow, WorkflowRun
from routes.integrations import get_user_byok
from services.workflow_executor import WorkflowExecutor

router = APIRouter()

_TRIGGERS = {"wa_received", "gmail_received", "schedule", "webhook", "form_submit", "razorpay_payment"}


class GraphConfig(BaseModel):
    nodes: list[dict] = Field(default_factory=list)
    edges: list[dict] = Field(default_factory=list)


class WorkflowBody(BaseModel):
    name: str = "Untitled workflow"
    description: str = ""
    config: GraphConfig


class AdhocRun(BaseModel):
    name: str = "Untitled workflow"
    config: GraphConfig
    input: dict = Field(default_factory=dict)


def _validate(config: dict) -> None:
    nodes = config.get("nodes", [])
    subtypes = {n.get("subtype") or n.get("type") for n in nodes}
    if not (subtypes & _TRIGGERS):
        raise HTTPException(400, "Workflow needs at least one trigger node")
    if not any(s not in _TRIGGERS and s != "note" for s in subtypes):
        raise HTTPException(400, "Workflow needs at least one action/AI/logic node")
    if not config.get("edges"):
        raise HTTPException(400, "Connect the trigger to at least one node")


def _serialize(w: Workflow) -> dict:
    return {
        "id": w.id,
        "name": w.name,
        "description": w.description,
        "config": json.loads(w.config or "{}"),
        "webhook_key": w.webhook_key,
        "is_active": w.is_active,
        "runs": w.runs or 0,
        "last_run": w.last_run.isoformat() if w.last_run else None,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


@router.post("/create", status_code=201)
async def create(body: WorkflowBody, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cfg = body.config.model_dump()
    _validate(cfg)
    w = Workflow(
        user_id=user.id,
        name=body.name,
        description=body.description,
        config=json.dumps(cfg),
        webhook_key=secrets.token_urlsafe(32),
        is_active=True,
    )
    db.add(w)
    await db.flush()
    return _serialize(w)


@router.get("")
async def list_workflows(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Workflow).where(Workflow.user_id == user.id).order_by(desc(Workflow.created_at)))).all()
    return {"items": [_serialize(w) for w in rows]}


async def _owned(db: AsyncSession, user: User, wid: int) -> Workflow:
    w = (await db.scalars(select(Workflow).where(Workflow.id == wid, Workflow.user_id == user.id))).first()
    if not w:
        raise HTTPException(404, "Workflow not found")
    return w


@router.get("/{wid}")
async def get_one(wid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return _serialize(await _owned(db, user, wid))


@router.put("/{wid}")
async def update(wid: int, body: WorkflowBody, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    w = await _owned(db, user, wid)
    cfg = body.config.model_dump()
    _validate(cfg)
    w.name, w.description, w.config = body.name, body.description, json.dumps(cfg)
    return _serialize(w)


@router.delete("/{wid}")
async def delete(wid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    w = await _owned(db, user, wid)
    for r in (await db.scalars(select(WorkflowRun).where(WorkflowRun.workflow_id == wid))).all():
        await db.delete(r)
    await db.delete(w)
    return {"success": True}


@router.post("/{wid}/toggle")
async def toggle(wid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    w = await _owned(db, user, wid)
    w.is_active = not w.is_active
    return {"id": w.id, "is_active": w.is_active}


async def _execute(db: AsyncSession, user: User, name: str, config: dict, trigger: dict, workflow_id: int) -> dict:
    """Run a graph, persist a WorkflowRun, surface real errors."""
    byok = await get_user_byok(db, user.id)
    run = WorkflowRun(user_id=user.id, workflow_id=workflow_id, workflow_name=name, action="manual", status="running", ran_at=datetime.utcnow())
    db.add(run)
    await db.flush()
    try:
        results = await WorkflowExecutor(byok).run_graph(config, trigger)
        run.status = "success"
        run.details = json.dumps(results, default=str)[:8000]
        user.tokens_used = (user.tokens_used or 0) + 1
        return {"run_id": run.id, "status": "success", "results": results}
    except HTTPException as exc:
        run.status = "failed"
        run.details = f"{exc.status_code}: {exc.detail}"
        return {"run_id": run.id, "status": "failed", "error": str(exc.detail)}
    except Exception as exc:  # pragma: no cover
        run.status = "failed"
        run.details = str(exc)[:8000]
        return {"run_id": run.id, "status": "failed", "error": str(exc)}


@router.post("/run")
async def run_adhoc(body: AdhocRun, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cfg = body.config.model_dump()
    _validate(cfg)
    return await _execute(db, user, body.name, cfg, body.input, workflow_id=0)


@router.post("/{wid}/run")
async def run_saved(wid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    w = await _owned(db, user, wid)
    cfg = json.loads(w.config or "{}")
    _validate(cfg)
    result = await _execute(db, user, w.name, cfg, {}, workflow_id=w.id)
    w.runs = (w.runs or 0) + 1
    w.last_run = datetime.utcnow()
    return result


@router.get("/{wid}/runs")
async def runs(wid: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(WorkflowRun).where(WorkflowRun.workflow_id == wid, WorkflowRun.user_id == user.id).order_by(desc(WorkflowRun.ran_at)).limit(50)
        )
    ).all()
    return {"items": [{"id": r.id, "status": r.status, "details": r.details, "ran_at": r.ran_at.isoformat() if r.ran_at else None} for r in rows]}
