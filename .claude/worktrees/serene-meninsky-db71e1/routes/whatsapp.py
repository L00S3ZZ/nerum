from fastapi import APIRouter, HTTPException, Header, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import httpx
import os
from jose import jwt, JWTError

from models.database import SessionLocal, User, UserIntegration
from security.encryption import decrypt_credentials

router = APIRouter()

META_WHATSAPP_TOKEN = os.environ.get("META_WHATSAPP_TOKEN")
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID")
META_VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "nerum_verify_2026")

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _resolve_user(authorization: Optional[str], db: Session) -> Optional[User]:
    """Best-effort JWT decode. Returns User or None — never raises."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(User.email == email).first()
    except JWTError:
        return None


def _get_credentials(user: Optional[User], db: Session):
    """Returns (phone_number_id, access_token, source). Prefer user's creds, fall back to env vars."""
    if user:
        row = (
            db.query(UserIntegration)
            .filter_by(user_id=user.id, integration_type="whatsapp", is_active=True)
            .first()
        )
        if row:
            try:
                creds = decrypt_credentials(row.encrypted_credentials)
            except Exception as e:
                print(f"⚠️ Failed to decrypt WhatsApp creds for user {user.id}: {e}")
            else:
                pid = creds.get("phone_number_id")
                tok = creds.get("access_token")
                if pid and tok:
                    row.last_used_at = datetime.utcnow()
                    db.commit()
                    return pid, tok, "user"
    if META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID:
        return META_PHONE_NUMBER_ID, META_WHATSAPP_TOKEN, "env"
    return None, None, None


class WhatsAppMessage(BaseModel):
    to: str
    message: str


@router.get("/status")
def whatsapp_status(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(_get_db),
):
    user = _resolve_user(authorization, db)
    pid, tok, source = _get_credentials(user, db)
    return {
        "connected": bool(pid and tok),
        "provider": "Meta Cloud API",
        "phone_number_id": pid,
        "source": source,
    }


@router.post("/send")
def send_whatsapp(
    req: WhatsAppMessage,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(_get_db),
):
    user = _resolve_user(authorization, db)
    pid, tok, source = _get_credentials(user, db)
    if not pid or not tok:
        raise HTTPException(status_code=500, detail="WhatsApp not configured. Please connect WhatsApp in /integrations.")

    to = req.to.strip().lstrip("+").replace(" ", "")
    url = f"https://graph.facebook.com/v19.0/{pid}/messages"
    headers = {
        "Authorization": f"Bearer {tok}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": req.message},
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=10)
        data = response.json()
        if response.status_code == 200:
            msg_id = data.get("messages", [{}])[0].get("id", "unknown")
            return {
                "success": True,
                "message": f"WhatsApp sent to {req.to}!",
                "message_id": msg_id,
                "source": source,
            }
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
    authorization: Optional[str] = Header(None),
    db: Session = Depends(_get_db),
):
    """Send approved WhatsApp template message"""
    user = _resolve_user(authorization, db)
    pid, tok, source = _get_credentials(user, db)
    if not pid or not tok:
        raise HTTPException(status_code=500, detail="WhatsApp not configured")

    to = to.strip().lstrip("+").replace(" ", "")
    url = f"https://graph.facebook.com/v19.0/{pid}/messages"
    headers = {
        "Authorization": f"Bearer {tok}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {"name": template_name, "language": {"code": language}},
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=10)
        data = response.json()
        if response.status_code == 200:
            return {"success": True, "message": f"Template sent to {to}", "source": source}
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
    hub_challenge: str = None,
):
    """Meta webhook verification"""
    if hub_mode == "subscribe" and hub_verify_token == META_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: dict):
    """Receive incoming WhatsApp messages"""
    print(f"WhatsApp webhook received: {request}")
    return {"status": "ok"}
