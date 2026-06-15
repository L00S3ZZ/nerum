"""Connect / disconnect / test integrations + BYOK AI keys.

Credentials are AES-256-GCM encrypted before they touch the DB. The provider key
is stored in UserIntegration.integration_type (V1 column name). BYOK AI keys are
stored under integration_type = "byok_<provider>".
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.encryption import decrypt_data, encrypt_data
from core.security import get_current_user
from models.models import User, UserIntegration
from services.telegram import telegram_status
from services.whatsapp import whatsapp_status

router = APIRouter()

PROVIDERS = ["whatsapp", "gmail", "telegram", "sheets", "razorpay", "notion", "slack", "shopify", "tally", "zoho"]
BYOK_PROVIDERS = ["anthropic", "openai", "groq", "gemini"]


class ConnectBody(BaseModel):
    provider: str
    credentials: dict


class ByokBody(BaseModel):
    provider: str
    key: str


async def _row(db: AsyncSession, user_id: int, integration_type: str) -> UserIntegration | None:
    return (
        await db.scalars(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id, UserIntegration.integration_type == integration_type
            )
        )
    ).first()


async def get_user_byok(db: AsyncSession, user_id: int) -> dict:
    """Return {provider: api_key} for the user's saved BYOK keys (decrypted)."""
    rows = (
        await db.scalars(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id, UserIntegration.is_active.is_(True)
            )
        )
    ).all()
    out: dict = {}
    for r in rows:
        if r.integration_type and r.integration_type.startswith("byok_"):
            try:
                out[r.integration_type[5:]] = decrypt_data(r.encrypted_credentials).get("key", "")
            except Exception:
                continue
    return out


@router.get("")
async def list_integrations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(UserIntegration).where(UserIntegration.user_id == user.id))).all()
    connected = {r.integration_type for r in rows if r.is_active}
    return {
        "integrations": [{"provider": p, "connected": p in connected} for p in PROVIDERS],
        "byok": [{"provider": p, "connected": f"byok_{p}" in connected} for p in BYOK_PROVIDERS],
    }


@router.post("/connect")
async def connect(body: ConnectBody, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.provider not in PROVIDERS:
        raise HTTPException(400, f"Unknown provider: {body.provider}")
    if not body.credentials:
        raise HTTPException(400, "Credentials required")
    enc = encrypt_data(body.credentials)
    row = await _row(db, user.id, body.provider)
    if row:
        row.encrypted_credentials = enc
        row.is_active = True
    else:
        db.add(UserIntegration(user_id=user.id, integration_type=body.provider, encrypted_credentials=enc, is_active=True))
    return {"success": True, "provider": body.provider}


@router.delete("/{provider}/disconnect")
async def disconnect(provider: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _row(db, user.id, provider)
    if not row:
        raise HTTPException(404, f"{provider} is not connected")
    await db.delete(row)
    return {"success": True, "provider": provider}


@router.get("/{provider}/test")
async def test(provider: str, _user: User = Depends(get_current_user)):
    if provider == "whatsapp":
        return await whatsapp_status()
    if provider == "telegram":
        return await telegram_status()
    if provider in PROVIDERS:
        return {"connected": None, "detail": "No live test available for this provider yet"}
    raise HTTPException(400, f"Unknown provider: {provider}")


@router.post("/byok")
async def save_byok(body: ByokBody, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.provider not in BYOK_PROVIDERS:
        raise HTTPException(400, f"Unknown AI provider: {body.provider}")
    key = body.key.strip()
    if len(key) < 10:
        raise HTTPException(400, "That doesn't look like a valid API key")
    enc = encrypt_data({"key": key})
    it = f"byok_{body.provider}"
    row = await _row(db, user.id, it)
    if row:
        row.encrypted_credentials = enc
        row.is_active = True
        row.last_used_at = datetime.utcnow()
    else:
        db.add(UserIntegration(user_id=user.id, integration_type=it, encrypted_credentials=enc, is_active=True))
    return {"success": True, "provider": body.provider, "key_hint": key[-4:]}
