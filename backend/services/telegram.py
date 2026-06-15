"""Telegram via Bot API. One canonical env var: TELEGRAM_BOT_TOKEN."""
import httpx
from fastapi import HTTPException

from core.config import settings


def _base() -> str:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram not configured (TELEGRAM_BOT_TOKEN)")
    return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"


async def send_telegram_message(chat_id: str, message: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{_base()}/sendMessage", json={"chat_id": chat_id, "text": message[:4096], "parse_mode": "HTML"})
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Telegram error: {resp.text}")
    return {"success": True, "raw": resp.json()}


async def telegram_status() -> dict:
    if not settings.TELEGRAM_BOT_TOKEN:
        return {"connected": False, "reason": "not configured"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe")
    data = resp.json() if resp.status_code == 200 else {}
    return {"connected": bool(data.get("ok")), "bot": data.get("result", {}).get("username")}
