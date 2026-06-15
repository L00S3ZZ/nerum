"""WhatsApp via Meta Cloud API — the single WhatsApp implementation (no Twilio)."""
import httpx
from fastapi import HTTPException

from core.config import settings

GRAPH = "https://graph.facebook.com/v19.0"


def _require() -> None:
    if not settings.META_WHATSAPP_TOKEN or not settings.META_PHONE_NUMBER_ID:
        raise HTTPException(status_code=503, detail="WhatsApp not configured (META_WHATSAPP_TOKEN / META_PHONE_NUMBER_ID)")


async def send_whatsapp_message(to: str, message: str) -> dict:
    """Send a text message. `to` = full number with country code, digits only."""
    _require()
    url = f"{GRAPH}/{settings.META_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "".join(ch for ch in to if ch.isdigit()),
        "type": "text",
        "text": {"preview_url": False, "body": message[:4096]},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}", "Content-Type": "application/json"})
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"WhatsApp API error: {resp.text}")
    data = resp.json()
    return {"success": True, "message_id": (data.get("messages") or [{}])[0].get("id"), "raw": data}


async def send_whatsapp_template(to: str, template_name: str, language: str = "en", params: list[str] | None = None) -> dict:
    _require()
    components = []
    if params:
        components = [{"type": "body", "parameters": [{"type": "text", "text": p} for p in params]}]
    url = f"{GRAPH}/{settings.META_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": "".join(ch for ch in to if ch.isdigit()),
        "type": "template",
        "template": {"name": template_name, "language": {"code": language}, "components": components},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}", "Content-Type": "application/json"})
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"WhatsApp API error: {resp.text}")
    return {"success": True, "raw": resp.json()}


async def whatsapp_status() -> dict:
    """Verify the configured token by hitting the phone-number node."""
    if not settings.META_WHATSAPP_TOKEN or not settings.META_PHONE_NUMBER_ID:
        return {"connected": False, "reason": "not configured"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{GRAPH}/{settings.META_PHONE_NUMBER_ID}", headers={"Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}"})
    return {"connected": resp.status_code == 200, "detail": resp.json() if resp.status_code == 200 else resp.text}
