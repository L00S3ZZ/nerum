"""Telegram send + status (Bot API)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.security import get_current_user
from models.models import User
from services.telegram import send_telegram_message, telegram_status

router = APIRouter()


class TGSend(BaseModel):
    chat_id: str
    message: str


@router.get("/status")
async def status():
    return await telegram_status()


@router.post("/send")
async def send(body: TGSend, _user: User = Depends(get_current_user)):
    return await send_telegram_message(body.chat_id, body.message)
