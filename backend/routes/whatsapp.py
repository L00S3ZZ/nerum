"""WhatsApp send + status (Meta Cloud API). Incoming webhook lives in routes/webhook.py."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.security import get_current_user
from models.models import User
from services.whatsapp import send_whatsapp_message, whatsapp_status

router = APIRouter()


class WASend(BaseModel):
    to: str
    message: str


@router.get("/status")
async def status():
    return await whatsapp_status()


@router.post("/send")
async def send(body: WASend, _user: User = Depends(get_current_user)):
    return await send_whatsapp_message(body.to, body.message)
