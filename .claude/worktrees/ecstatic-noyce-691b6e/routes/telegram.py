from fastapi import APIRouter
import httpx
import os

router = APIRouter()

TELEGRAM_TOKEN = os.environ.get("HTTP_API")
TELEGRAM_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

@router.post("/send")
async def send_telegram(chat_id: str, message: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{TELEGRAM_URL}/sendMessage",
            json={"chat_id": chat_id, "text": message}
        )
        result = response.json()
        if result.get("ok"):
            return {"message": f"Telegram message sent to {chat_id}!"}
        else:
            return {"error": result.get("description", "Failed to send")}