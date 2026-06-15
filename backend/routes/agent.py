"""Neru Agent — real Anthropic streaming over SSE. No demo mode."""
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import get_current_user
from models.models import User
from routes.integrations import get_user_byok

router = APIRouter()

MODEL = "claude-sonnet-4-6"  # adjust to a model id your Anthropic key can access


class AgentRequest(BaseModel):
    message: str
    language: str = "english"
    session_id: str | None = None


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/run")
async def agent_run(
    body: AgentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    message = body.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")

    # Prefer the user's own Anthropic BYOK key; fall back to the server key.
    byok = await get_user_byok(db, user.id)
    api_key = byok.get("anthropic") or settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(503, "AI not configured — add an Anthropic key (BYOK) or set ANTHROPIC_API_KEY")

    lang = "Tamil" if str(body.language).lower().startswith("ta") else "English"
    system = (
        f"You are Neru, Nerum's AI automation agent for Indian small businesses. "
        f"User: {user.name}, plan: {user.plan}. "
        f"Available tools: WhatsApp, Gmail, Telegram, Google Sheets, Razorpay. "
        f"When the user describes a task, explain the workflow you'd build (trigger + actions) "
        f"clearly and concisely. Reply in {lang}."
    )

    async def stream():
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=api_key)
        yield _sse({"type": "commander_thinking", "content": "Understanding your request..."})
        try:
            async with client.messages.stream(
                model=MODEL,
                max_tokens=2000,
                system=system,
                messages=[{"role": "user", "content": message}],
            ) as s:
                async for text in s.text_stream:
                    yield _sse({"type": "response", "content": text})
            yield _sse({"type": "agent_complete"})
        except Exception as exc:
            yield _sse({"type": "agent_error", "content": str(exc)[:300]})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/conversations")
async def conversations(_user: User = Depends(get_current_user)):
    # Conversation persistence not implemented yet — return an empty list, not fake data.
    return {"items": []}
