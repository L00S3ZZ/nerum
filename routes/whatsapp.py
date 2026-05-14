from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os

router = APIRouter()

META_WHATSAPP_TOKEN = os.environ.get("META_WHATSAPP_TOKEN")
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID")
META_VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "nerum_verify_2026")

GRAPH_API_URL = f"https://graph.facebook.com/v19.0/{META_PHONE_NUMBER_ID}/messages"


class WhatsAppMessage(BaseModel):
    to: str
    message: str


@router.get("/status")
def whatsapp_status():
    connected = bool(META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID)
    return {
        "connected": connected,
        "provider": "Meta Cloud API",
        "phone_number_id": META_PHONE_NUMBER_ID or "not configured"
    }


@router.post("/send")
def send_whatsapp(req: WhatsAppMessage):
    if not META_WHATSAPP_TOKEN or not META_PHONE_NUMBER_ID:
        raise HTTPException(status_code=500, detail="Meta WhatsApp not configured")

    # Clean phone number — remove + and spaces
    to = req.to.strip().lstrip("+").replace(" ", "")

    headers = {
        "Authorization": f"Bearer {META_WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": req.message
        }
    }

    try:
        response = httpx.post(GRAPH_API_URL, json=payload, headers=headers, timeout=10)
        data = response.json()

        if response.status_code == 200:
            msg_id = data.get("messages", [{}])[0].get("id", "unknown")
            return {
                "success": True,
                "message": f"WhatsApp sent to {req.to}!",
                "message_id": msg_id
            }
        else:
            error = data.get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=400, detail=f"Meta API error: {error}")

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="WhatsApp API timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-template")
def send_whatsapp_template(to: str, template_name: str, language: str = "en_US"):
    """Send approved WhatsApp template message"""
    if not META_WHATSAPP_TOKEN or not META_PHONE_NUMBER_ID:
        raise HTTPException(status_code=500, detail="Meta WhatsApp not configured")

    to = to.strip().lstrip("+").replace(" ", "")

    headers = {
        "Authorization": f"Bearer {META_WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language}
        }
    }

    try:
        response = httpx.post(GRAPH_API_URL, json=payload, headers=headers, timeout=10)
        data = response.json()
        if response.status_code == 200:
            return {"success": True, "message": f"Template sent to {to}"}
        else:
            error = data.get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=400, detail=f"Meta API error: {error}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhook")
def verify_webhook(
    hub_mode: str = None,
    hub_verify_token: str = None,
    hub_challenge: str = None
):
    """Meta webhook verification"""
    if hub_mode == "subscribe" and hub_verify_token == META_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: dict):
    """Receive incoming WhatsApp messages"""
    # Log incoming messages for now
    print(f"WhatsApp webhook received: {request}")
    return {"status": "ok"}