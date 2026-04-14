from fastapi import APIRouter
from twilio.rest import Client
import os

router = APIRouter()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886"

@router.post("/send")
def send_whatsapp(to: str, message: str):
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    msg = client.messages.create(
        from_=TWILIO_WHATSAPP_FROM,
        body=message,
        to=f"whatsapp:+{to}"
    )
    return {"message": f"WhatsApp sent to {to}!", "sid": msg.sid}