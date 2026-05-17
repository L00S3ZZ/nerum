from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import httpx

from models.database import UserIntegration, User
from routes.auth import get_current_user, get_db
from security.encryption import encrypt_credentials

router = APIRouter()


class WhatsAppConnect(BaseModel):
    phone_number_id: str
    waba_id: str
    access_token: str
    display_name: Optional[str] = None


class WhatsAppTest(BaseModel):
    phone_number_id: str
    access_token: str
    test_number: str


@router.get("")
def list_integrations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(UserIntegration).filter(UserIntegration.user_id == user.id).all()
    return {
        "integrations": [
            {
                "integration_type": r.integration_type,
                "display_name": r.display_name,
                "is_active": bool(r.is_active),
                "connected_at": r.connected_at.isoformat() if r.connected_at else None,
                "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
            }
            for r in rows
        ]
    }


@router.post("/whatsapp")
def connect_whatsapp(
    req: WhatsAppConnect,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    phone_number_id = req.phone_number_id.strip()
    waba_id = req.waba_id.strip()
    access_token = req.access_token.strip()
    if not phone_number_id or not waba_id or not access_token:
        raise HTTPException(status_code=400, detail="All credential fields are required.")

    creds = {
        "phone_number_id": phone_number_id,
        "waba_id": waba_id,
        "access_token": access_token,
    }
    try:
        blob = encrypt_credentials(creds)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    display = (req.display_name or "").strip() or None
    existing = (
        db.query(UserIntegration)
        .filter_by(user_id=user.id, integration_type="whatsapp")
        .first()
    )
    if existing:
        existing.encrypted_credentials = blob
        existing.display_name = display
        existing.is_active = True
        existing.connected_at = datetime.utcnow()
    else:
        db.add(
            UserIntegration(
                user_id=user.id,
                integration_type="whatsapp",
                encrypted_credentials=blob,
                display_name=display,
                is_active=True,
            )
        )
    db.commit()
    return {"success": True}


@router.post("/whatsapp/test")
async def test_whatsapp(req: WhatsAppTest, user: User = Depends(get_current_user)):
    phone_number_id = req.phone_number_id.strip()
    access_token = req.access_token.strip()
    test_number = req.test_number.strip().lstrip("+").replace(" ", "").replace("-", "")
    if not phone_number_id or not access_token or not test_number:
        return {"success": False, "error": "Missing required fields."}

    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    body = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": test_number,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": "Hello from Nerum 🚀 your WhatsApp Business connection is working!",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=body, headers=headers)
    except httpx.TimeoutException:
        return {"success": False, "error": "WhatsApp API timeout. Try again."}
    except Exception as e:
        return {"success": False, "error": f"Network error: {e}"}

    if r.status_code == 200:
        return {"success": True}
    try:
        err = r.json().get("error", {}).get("message", "Unknown error")
    except Exception:
        err = r.text or "Unknown error"
    return {"success": False, "error": err}


@router.delete("/{integration_type}")
def disconnect(
    integration_type: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(UserIntegration)
        .filter_by(user_id=user.id, integration_type=integration_type)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Integration not connected")
    db.delete(row)
    db.commit()
    return {"success": True}
