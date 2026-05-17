from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from models.database import SessionLocal, Chatbot
from security import sanitize_input
from jose import jwt, JWTError
import os
import uuid

router = APIRouter()

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        # get user id from db
        db = SessionLocal()
        try:
            from models.database import User
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return user.id
        finally:
            db.close()
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== MODELS =====
class ChatbotCreate(BaseModel):
    name: str
    business_description: str
    language: str = "both"

class ChatbotMessage(BaseModel):
    message: str

# ===== DUMMY REPLIES (AI disabled for now) =====
DUMMY_REPLIES = {
    "both": [
        "Hi! How can I help you today? / வணக்கம்! எப்படி உதவலாம்?",
        "Thanks for reaching out! Our team will get back to you shortly.",
        "That's a great question! Please contact us for more details.",
        "We're here to help! Feel free to ask anything.",
        "நன்றி! உங்கள் கேள்விக்கு விரைவில் பதில் தருவோம்.",
    ],
    "english": [
        "Hi! How can I help you today?",
        "Thanks for reaching out! Our team will get back to you shortly.",
        "That's a great question! Please contact us for more details.",
        "We're here to help! Feel free to ask anything.",
        "Please leave your number and we'll call you back.",
    ],
    "tamil": [
        "வணக்கம்! எப்படி உதவலாம்?",
        "நன்றி! உங்கள் கேள்விக்கு விரைவில் பதில் தருவோம்.",
        "தயவுசெய்து உங்கள் தொலைபேசி எண் தரவும், திரும்ப அழைக்கிறோம்.",
        "உங்கள் விசாரணைக்கு மிக்க நன்றி!",
        "எங்கள் குழு உங்களுக்கு உதவ எப்போதும் தயாராக உள்ளது.",
    ]
}

import random

def get_dummy_reply(language: str, message: str) -> str:
    replies = DUMMY_REPLIES.get(language, DUMMY_REPLIES["both"])
    msg = message.lower()
    if any(w in msg for w in ["price", "cost", "fee", "rate", "விலை", "கட்டணம்"]):
        return "Please contact us directly for pricing details. We'd love to help! 😊"
    if any(w in msg for w in ["time", "hour", "open", "நேரம்", "திறந்திருக்கும்"]):
        return "We're open Monday to Saturday, 9 AM to 6 PM. Feel free to visit us!"
    if any(w in msg for w in ["hi", "hello", "hey", "வணக்கம்", "நமஸ்கார்"]):
        return replies[0]
    if any(w in msg for w in ["thank", "thanks", "நன்றி"]):
        return "You're welcome! Is there anything else I can help you with? 😊"
    return random.choice(replies)

# ===== ROUTES =====

# Create chatbot
@router.post("/create")
async def create_chatbot(data: ChatbotCreate, authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    db = SessionLocal()
    try:
        chatbot = Chatbot(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=sanitize_input(data.name, max_length=100),
            business_description=sanitize_input(data.business_description, max_length=1000),
            language=data.language,
        )
        db.add(chatbot)
        db.commit()
        db.refresh(chatbot)
        return {
            "success": True,
            "chatbot_id": chatbot.id,
            "embed_script": f'<script src="https://nerum.in/static/chatbot-embed.js?id={chatbot.id}"></script>'
        }
    finally:
        db.close()

# List user's chatbots
@router.get("/list")
async def list_chatbots(authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    db = SessionLocal()
    try:
        bots = db.query(Chatbot).filter(Chatbot.user_id == user_id).all()
        return {"chatbots": [
            {
                "id": b.id,
                "name": b.name,
                "business_description": b.business_description,
                "language": b.language,
                "is_active": b.is_active,
                "created_at": str(b.created_at),
                "embed_script": f'<script src="https://nerum.in/static/chatbot-embed.js?id={b.id}"></script>'
            } for b in bots
        ]}
    finally:
        db.close()

# Delete chatbot
@router.delete("/{chatbot_id}")
async def delete_chatbot(chatbot_id: str, authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    db = SessionLocal()
    try:
        bot = db.query(Chatbot).filter(Chatbot.id == chatbot_id, Chatbot.user_id == user_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        db.delete(bot)
        db.commit()
        return {"success": True}
    finally:
        db.close()

# Toggle active
@router.post("/{chatbot_id}/toggle")
async def toggle_chatbot(chatbot_id: str, authorization: str = Header(None)):
    user_id = get_current_user(authorization)
    db = SessionLocal()
    try:
        bot = db.query(Chatbot).filter(Chatbot.id == chatbot_id, Chatbot.user_id == user_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        bot.is_active = not bot.is_active
        db.commit()
        return {"success": True, "is_active": bot.is_active}
    finally:
        db.close()

# Public chat endpoint — no auth needed (called from customer's website)
@router.post("/chat/{chatbot_id}")
async def chat(chatbot_id: str, data: ChatbotMessage):
    db = SessionLocal()
    try:
        bot = db.query(Chatbot).filter(Chatbot.id == chatbot_id, Chatbot.is_active == True).first()
        if not bot:
            return {"reply": "Sorry, this chatbot is currently unavailable."}
        message = sanitize_input(data.message, max_length=500)
        reply = get_dummy_reply(bot.language, message)
        return {"reply": reply, "bot_name": bot.name}
    finally:
        db.close()

# Get chatbot info (public — for embed script)
@router.get("/info/{chatbot_id}")
async def get_chatbot_info(chatbot_id: str):
    db = SessionLocal()
    try:
        bot = db.query(Chatbot).filter(Chatbot.id == chatbot_id, Chatbot.is_active == True).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        return {
            "name": bot.name,
            "language": bot.language,
            "is_active": bot.is_active
        }
    finally:
        db.close()