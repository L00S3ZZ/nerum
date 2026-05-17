from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.database import get_db
from models.chatbot_model import UserChatbot, ChatbotConversation
from routes.auth import get_current_user
from security.encryption import encrypt_data, decrypt_data
import uuid, json, httpx, re

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

CHAT_LIMITS = {
    "free": 50,
    "starter": 1000,
    "pro": 5000,
    "agency": 20000,
    "business": 20000,
}

BOT_LIMITS = {
    "free": 1,
    "starter": 1,
    "pro": 3,
    "agency": 10,
    "business": 10,
}

TOKEN_LIMIT = 100


@router.get("/my-chatbots")
def get_my_chatbots(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    bots = db.query(UserChatbot).filter_by(user_id=current_user.id).all()
    return {
        "chatbots": [
            {
                "id": b.id,
                "embed_id": b.embed_id,
                "bot_name": b.bot_name,
                "company_name": b.company_name,
                "bot_type": b.bot_type,
                "is_active": b.is_active,
                "chat_count": b.chat_count,
                "monthly_chat_count": b.monthly_chat_count,
                "chat_limit": b.chat_limit,
                "brand_color": b.brand_color,
                "logo_url": b.logo_url,
                "welcome_message": b.welcome_message,
            }
            for b in bots
        ]
    }


@router.post("/create")
def create_chatbot(data: dict, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    plan = (getattr(current_user, "plan", "free") or "free").lower()
    existing = db.query(UserChatbot).filter_by(user_id=current_user.id).count()
    bot_limit = BOT_LIMITS.get(plan, 1)
    if existing >= bot_limit:
        raise HTTPException(400, f"Your {plan} plan allows max {bot_limit} chatbot(s). Upgrade to create more.")
    embed_id = str(uuid.uuid4())[:8]
    encrypted_key = None
    if data.get("api_key"):
        encrypted_key = encrypt_data({"api_key": data["api_key"], "engine": data.get("ai_engine", "claude")})
    bot = UserChatbot(
        user_id=current_user.id,
        embed_id=embed_id,
        bot_name=data.get("bot_name", "Assistant"),
        company_name=data.get("company_name", ""),
        logo_url=data.get("logo_url"),
        brand_color=data.get("brand_color", "#C50022"),
        welcome_message=data.get("welcome_message", "Hi! How can I help you?"),
        bot_type=data.get("bot_type", "nonai"),
        ai_engine=data.get("ai_engine"),
        encrypted_api_key=encrypted_key,
        knowledge_type=data.get("knowledge_type"),
        knowledge_content=data.get("knowledge_content"),
        qa_pairs=json.dumps(data.get("qa_pairs", [])),
        chat_limit=CHAT_LIMITS.get(plan, 50),
        token_limit=TOKEN_LIMIT,
    )
    db.add(bot)
    db.commit()
    db.refresh(bot)
    return {"embed_id": embed_id, "bot_id": bot.id}


@router.delete("/{bot_id}")
def delete_chatbot(bot_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    bot = db.query(UserChatbot).filter_by(id=bot_id, user_id=current_user.id).first()
    if not bot:
        raise HTTPException(404, "Chatbot not found")
    db.delete(bot)
    db.commit()
    return {"status": "deleted"}


@router.get("/widget/{embed_id}")
def get_widget_config(embed_id: str, db: Session = Depends(get_db)):
    bot = db.query(UserChatbot).filter_by(embed_id=embed_id, is_active=True).first()
    if not bot:
        raise HTTPException(404, "Chatbot not found")
    return {
        "bot_name": bot.bot_name,
        "company_name": bot.company_name,
        "logo_url": bot.logo_url,
        "brand_color": bot.brand_color,
        "welcome_message": bot.welcome_message,
        "bot_type": bot.bot_type,
        "qa_pairs": json.loads(bot.qa_pairs or "[]"),
    }


@router.post("/chat/{embed_id}")
@limiter.limit("30/minute")
async def chat_with_bot(request: Request, embed_id: str, data: dict, db: Session = Depends(get_db)):
    bot = db.query(UserChatbot).filter_by(embed_id=embed_id, is_active=True).first()
    if not bot:
        raise HTTPException(404, "Chatbot not found")
    if bot.monthly_chat_count >= bot.chat_limit:
        raise HTTPException(429, "Monthly chat limit reached")
    message = data.get("message", "")
    visitor_id = data.get("visitor_id", "anonymous")
    if bot.bot_type == "nonai":
        qa_pairs = json.loads(bot.qa_pairs or "[]")
        response = "I'm sorry, I don't have an answer for that."
        for qa in qa_pairs:
            if qa.get("question", "").lower() in message.lower():
                response = qa.get("answer", response)
                break
    else:
        if not bot.encrypted_api_key:
            raise HTTPException(400, "AI not configured")
        creds = decrypt_data(bot.encrypted_api_key)
        api_key = creds.get("api_key")
        engine = creds.get("engine", "claude")
        context = f"You are {bot.bot_name}, a helpful assistant for {bot.company_name}."
        if bot.knowledge_content:
            context += f"\n\nKnowledge base:\n{bot.knowledge_content[:3000]}"
        if engine == "claude":
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": bot.token_limit,
                        "system": context,
                        "messages": [{"role": "user", "content": message}],
                    },
                )
                result = r.json()
                response = result.get("content", [{}])[0].get("text", "Sorry, I couldn't process that.")
        elif engine == "gpt":
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "content-type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "max_tokens": bot.token_limit,
                        "messages": [
                            {"role": "system", "content": context},
                            {"role": "user", "content": message},
                        ],
                    },
                )
                result = r.json()
                response = result.get("choices", [{}])[0].get("message", {}).get("content", "Sorry, I couldn't process that.")
        elif engine == "gemini":
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}",
                    json={"contents": [{"parts": [{"text": f"{context}\n\nUser: {message}"}]}]},
                )
                result = r.json()
                response = (
                    result.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "Sorry, I couldn't process that.")
                )
        else:
            response = "AI engine not supported."
    conv = ChatbotConversation(chatbot_id=bot.id, visitor_id=visitor_id, role="user", message=message)
    db.add(conv)
    conv2 = ChatbotConversation(chatbot_id=bot.id, visitor_id=visitor_id, role="assistant", message=response)
    db.add(conv2)
    bot.chat_count += 1
    bot.monthly_chat_count += 1
    db.commit()
    return {"response": response}


@router.get("/scrape")
async def scrape_website(url: str, current_user=Depends(get_current_user)):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            text = r.text
            clean = re.sub(r"<[^>]+>", " ", text)
            clean = re.sub(r"\s+", " ", clean).strip()
            return {"content": clean[:5000]}
    except Exception as e:
        raise HTTPException(400, f"Could not fetch URL: {str(e)}")
