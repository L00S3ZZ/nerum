from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.database import get_db, UserIntegration
from security.encryption import encrypt_data, decrypt_data
from routes.auth import get_current_user
import httpx, asyncio

router = APIRouter()

@router.get("")
def get_integrations(current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    integrations = db.query(UserIntegration).filter_by(user_id=current_user.id).all()
    return {"integrations": [{"type": i.integration_type, "is_active": i.is_active, "last_used_at": str(i.last_used_at)} for i in integrations]}

@router.post("/whatsapp")
def connect_whatsapp(data: dict, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    encrypted = encrypt_data(data)
    existing = db.query(UserIntegration).filter_by(user_id=current_user.id, integration_type="whatsapp_business").first()
    if existing:
        existing.encrypted_credentials = encrypted
        existing.is_active = True
    else:
        integration = UserIntegration(user_id=current_user.id, integration_type="whatsapp_business", encrypted_credentials=encrypted)
        db.add(integration)
    db.commit()
    return {"status": "connected"}

@router.post("/whatsapp/test")
def test_whatsapp(data: dict, current_user=Depends(get_current_user)):
    phone_number_id = data.get("phone_number_id")
    access_token = data.get("access_token")
    async def check():
        async with httpx.AsyncClient() as client:
            r = await client.get(f"https://graph.facebook.com/v18.0/{phone_number_id}", headers={"Authorization": f"Bearer {access_token}"})
            return r.status_code == 200
    ok = asyncio.run(check())
    if not ok:
        raise HTTPException(400, "Invalid credentials")
    return {"status": "ok"}

@router.delete("/{integration_type}")
def disconnect(integration_type: str, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    db.query(UserIntegration).filter_by(user_id=current_user.id, integration_type=integration_type).delete()
    db.commit()
    return {"status": "disconnected"}
