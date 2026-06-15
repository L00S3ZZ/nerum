"""Email send via Resend (replaces V1's dead Gmail OAuth / token.json)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from core.security import get_current_user
from models.models import User
from services.email import send_email

router = APIRouter()


class EmailSend(BaseModel):
    to: EmailStr
    subject: str = "Message from Nerum"
    body: str = ""


@router.post("/send")
async def send(body: EmailSend, _user: User = Depends(get_current_user)):
    html = f"<div style='font-family:sans-serif;line-height:1.6'>{body.body}</div>"
    return await send_email(to=str(body.to), subject=body.subject, html=html)
