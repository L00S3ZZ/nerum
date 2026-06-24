"""Neru Agent — the tool-calling agent engine over SSE.

POST /agent/run        run the agent loop on a goal, streaming events as SSE
GET  /agent/runs       recent runs for the current user
GET  /agent/runs/{id}/steps   the executed steps of one run
GET  /agent/conversations     (kept for the existing frontend; no history yet)
"""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agent.engine import AgentEngine
from core.config import settings
from core.database import AsyncSessionLocal, get_db
from core.encryption import decrypt_data
from core.ratelimit import limiter, user_key
from core.security import check_quota, get_current_user
from models.models import AgentRun, AgentStep, User, UserIntegration
from routes.integrations import get_user_byok

router = APIRouter()


class AgentRequest(BaseModel):
    message: str
    language: str = "english"
    session_id: str | None = None


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False, default=str)}\n\n"


async def _rl_capture_user(request: Request, user: User = Depends(get_current_user)) -> None:
    """Stash the authenticated user's id on request.state so the rate-limit key
    function can bucket per-user. Reuses the cached get_current_user result, so no
    extra DB lookup."""
    request.state.rl_user = user.id


async def _load_credentials(db: AsyncSession, user_id: int) -> dict:
    """Decrypt the user's connected (non-BYOK) integration credentials.

    Returns {provider: {fields}}. A credential that fails to decrypt is skipped
    rather than aborting the run — the tool that needs it will report it missing.
    """
    rows = (
        await db.scalars(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.is_active.is_(True),
            )
        )
    ).all()
    creds: dict = {}
    for r in rows:
        if not r.integration_type or r.integration_type.startswith("byok_"):
            continue
        try:
            creds[r.integration_type] = decrypt_data(r.encrypted_credentials)
        except Exception:  # noqa: BLE001 — a corrupt row shouldn't block the agent
            continue
    return creds


@router.post("/run")
@limiter.limit("10/minute", key_func=user_key)
async def agent_run(
    request: Request,
    body: AgentRequest,
    user: User = Depends(get_current_user),
    _rl: None = Depends(_rl_capture_user),
):
    goal = body.message.strip()
    if not goal:
        raise HTTPException(400, "Message cannot be empty")

    # Quota gate BEFORE opening the stream — a 429 returns as a normal JSON error
    # response, never as an SSE event-stream.
    await check_quota(user)

    # Short session (H3): load BYOK + connected credentials, then close it BEFORE
    # building the engine / returning the StreamingResponse. The agent loop is the
    # longest-lived request in the app; it must NOT hold a pooled connection for
    # its whole duration. The engine already persists every step through its own
    # short-lived AsyncSessionLocal sessions (see agent/engine.py), so it needs no
    # request-scoped session — we pass db=None.
    async with AsyncSessionLocal() as db:
        byok = await get_user_byok(db, user.id)
        credentials = await _load_credentials(db, user.id)

    # Prefer the user's own Anthropic BYOK key; fall back to the server key.
    api_key = byok.get("anthropic") or settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(503, "AI not configured — add an Anthropic key (BYOK) or set ANTHROPIC_API_KEY")

    session_id = body.session_id or uuid.uuid4().hex

    engine = AgentEngine(user=user, db=None, api_key=api_key, credentials=credentials)

    async def stream():
        # Tell the client its session id up front so follow-ups can reuse it.
        yield _sse({"type": "session", "session_id": session_id})
        try:
            async for event in engine.run(goal, body.language, session_id):
                yield _sse(event)
        except Exception as exc:  # noqa: BLE001 — never leak a raw traceback to the client
            yield _sse({"type": "error", "content": str(exc)[:300]})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/runs")
async def get_runs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(AgentRun)
            .where(AgentRun.user_id == user.id)
            .order_by(AgentRun.id.desc())
            .limit(20)
        )
    ).all()
    return {
        "runs": [
            {
                "id": r.id,
                "session_id": r.session_id,
                "goal": r.goal,
                "status": r.status,
                "steps_count": r.steps_count,
                "result_summary": r.result_summary,
                "created_at": r.created_at,
                "completed_at": r.completed_at,
            }
            for r in rows
        ]
    }


@router.get("/runs/{run_id}/steps")
async def get_run_steps(
    run_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    run = await db.get(AgentRun, run_id)
    if not run or run.user_id != user.id:
        raise HTTPException(404, "Run not found")
    rows = (
        await db.scalars(
            select(AgentStep)
            .where(AgentStep.run_id == run_id)
            .order_by(AgentStep.id.asc())
        )
    ).all()
    return {
        "run_id": run_id,
        "steps": [
            {
                "id": s.id,
                "tool_name": s.tool_name,
                "tool_input": s.tool_input,
                "tool_result": s.tool_result,
                "success": s.success,
                "executed_at": s.executed_at,
            }
            for s in rows
        ],
    }


@router.get("/conversations")
async def conversations(_user: User = Depends(get_current_user)):
    # Conversation persistence not implemented yet — return an empty list, not fake data.
    return {"items": []}
