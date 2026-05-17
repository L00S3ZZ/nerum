from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import httpx
import os

from models.database import get_db, UserIntegration
from security.encryption import decrypt_data
from routes.auth import get_current_user

router = APIRouter()

META_WHATSAPP_TOKEN = os.environ.get("META_WHATSAPP_TOKEN")
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID")
META_VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "nerum_verify_2026")


def _resolve_credentials(current_user, db: Session):
    """Look up per-user WhatsApp Business creds; fall back to env vars."""
    integration = db.query(UserIntegration).filter_by(
        user_id=current_user.id,
        integration_type="whatsapp_business",
        is_active=True,
    ).first()
    if integration:
        try:
            creds = decrypt_data(integration.encrypted_credentials)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to decrypt WhatsApp credentials")
        phone_number_id = creds.get("phone_number_id")
        access_token = creds.get("access_token")
    else:
        phone_number_id = META_PHONE_NUMBER_ID
        access_token = META_WHATSAPP_TOKEN
    if not phone_number_id or not access_token:
        raise HTTPException(status_code=500, detail="Meta WhatsApp not configured")
    return phone_number_id, access_token, integration


class WhatsAppMessage(BaseModel):
    to: str
    message: str


@router.get("/status")
def whatsapp_status():
    connected = bool(META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID)
    return {
        "connected": connected,
        "provider": "Meta Cloud API",
        "phone_number_id": META_PHONE_NUMBER_ID
    }


@router.post("/send")
def send_whatsapp(
    req: WhatsAppMessage,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    phone_number_id, access_token, integration = _resolve_credentials(current_user, db)
    graph_url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

    # Clean phone number — remove + and spaces
    to = req.to.strip().lstrip("+").replace(" ", "")

    headers = {
        "Authorization": f"Bearer {access_token}",
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
        response = httpx.post(graph_url, json=payload, headers=headers, timeout=10)
        data = response.json()

        if response.status_code == 200:
            msg_id = data.get("messages", [{}])[0].get("id", "unknown")
            if integration is not None:
                integration.last_used_at = datetime.utcnow()
                db.commit()
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-template")
def send_whatsapp_template(
    to: str,
    template_name: str,
    language: str = "en_US",
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send approved WhatsApp template message"""
    phone_number_id, access_token, integration = _resolve_credentials(current_user, db)
    graph_url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

    to = to.strip().lstrip("+").replace(" ", "")

    headers = {
        "Authorization": f"Bearer {access_token}",
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
        response = httpx.post(graph_url, json=payload, headers=headers, timeout=10)
        data = response.json()
        if response.status_code == 200:
            if integration is not None:
                integration.last_used_at = datetime.utcnow()
                db.commit()
            return {"success": True, "message": f"Template sent to {to}"}
        else:
            error = data.get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=400, detail=f"Meta API error: {error}")
    except HTTPException:
        raise
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
