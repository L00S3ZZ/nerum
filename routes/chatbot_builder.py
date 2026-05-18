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
                "input_placeholder": b.input_placeholder,
                "bot_status": b.bot_status,
                "bot_initials": b.bot_initials or (b.bot_name or "A")[0].upper(),
                "header_color": b.header_color,
                "user_bubble_color": b.user_bubble_color,
                "bot_bubble_bg": b.bot_bubble_bg,
                "bot_bubble_text": b.bot_bubble_text,
                "chat_bg": b.chat_bg,
                "send_button_color": b.send_button_color,
                "font_family": b.font_family,
                "font_size": b.font_size,
                "corner_radius": b.corner_radius,
                "bubble_shape": b.bubble_shape,
                "header_style": b.header_style,
                "chat_width": b.chat_width,
                "chat_height": b.chat_height,
                "logo_data_url": b.logo_data_url,
                "logo_shape": b.logo_shape,
                "logo_in_header": b.logo_in_header,
                "logo_in_messages": b.logo_in_messages,
                "logo_in_launcher": b.logo_in_launcher,
                "logo_header_size": b.logo_header_size,
                "logo_msg_size": b.logo_msg_size,
                "launcher_size": b.launcher_size,
                "launcher_color": b.launcher_color,
                "launcher_shape": b.launcher_shape,
                "launcher_position": b.launcher_position,
                "launcher_animation": b.launcher_animation,
                "greeting_text": b.greeting_text,
                "show_badge": b.show_badge,
                "language": b.language,
                "auto_open": b.auto_open,
                "auto_open_delay": b.auto_open_delay,
                "typing_indicator": b.typing_indicator,
                "show_timestamps": b.show_timestamps,
                "allow_upload": b.allow_upload,
                "collect_email": b.collect_email,
                "show_quick_replies": b.show_quick_replies,
                "show_branding": b.show_branding,
                "input_mode": b.input_mode,
                "flow_json": b.flow_json,
                "response_delay": b.response_delay,
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
        input_placeholder=data.get("input_placeholder", "Type a message..."),
        bot_status=data.get("bot_status", "Online now"),
        bot_initials=data.get("bot_initials", "A"),
        header_color=data.get("header_color"),
        user_bubble_color=data.get("user_bubble_color"),
        bot_bubble_bg=data.get("bot_bubble_bg"),
        bot_bubble_text=data.get("bot_bubble_text"),
        chat_bg=data.get("chat_bg"),
        send_button_color=data.get("send_button_color"),
        font_family=data.get("font_family", "System"),
        font_size=data.get("font_size", 13),
        corner_radius=data.get("corner_radius", 14),
        bubble_shape=data.get("bubble_shape", "rounded"),
        header_style=data.get("header_style", "solid"),
        chat_width=data.get("chat_width", 320),
        chat_height=data.get("chat_height", 480),
        logo_data_url=data.get("logo_data_url"),
        logo_shape=data.get("logo_shape", "circle"),
        logo_in_header=data.get("logo_in_header", True),
        logo_in_messages=data.get("logo_in_messages", True),
        logo_in_launcher=data.get("logo_in_launcher", True),
        logo_header_size=data.get("logo_header_size", 32),
        logo_msg_size=data.get("logo_msg_size", 22),
        launcher_size=data.get("launcher_size", 52),
        launcher_color=data.get("launcher_color"),
        launcher_shape=data.get("launcher_shape", "circle"),
        launcher_position=data.get("launcher_position", "Bottom Right"),
        launcher_animation=data.get("launcher_animation", "Bounce"),
        greeting_text=data.get("greeting_text", "Need help?"),
        show_badge=data.get("show_badge", True),
        language=data.get("language", "en"),
        auto_open=data.get("auto_open", False),
        auto_open_delay=data.get("auto_open_delay", 3),
        sound_enabled=data.get("sound_enabled", False),
        typing_indicator=data.get("typing_indicator", True),
        show_timestamps=data.get("show_timestamps", False),
        allow_upload=data.get("allow_upload", False),
        collect_email=data.get("collect_email", False),
        show_quick_replies=data.get("show_quick_replies", True),
        show_branding=data.get("show_branding", True),
        business_hours_only=data.get("business_hours_only", False),
        offline_message=data.get("offline_message"),
        response_delay=data.get("response_delay", 1.0),
        input_mode=data.get("input_mode", "typing"),
        flow_json=json.dumps(data.get("flow", [])) if data.get("flow") else None,
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
        "logo_data_url": bot.logo_data_url,
        "brand_color": bot.brand_color,
        "welcome_message": bot.welcome_message,
        "bot_type": bot.bot_type,
        "qa_pairs": json.loads(bot.qa_pairs or "[]"),
        "input_placeholder": bot.input_placeholder,
        "bot_status": bot.bot_status,
        "bot_initials": bot.bot_initials or (bot.bot_name or "A")[0].upper(),
        "header_color": bot.header_color,
        "user_bubble_color": bot.user_bubble_color,
        "bot_bubble_bg": bot.bot_bubble_bg,
        "bot_bubble_text": bot.bot_bubble_text,
        "chat_bg": bot.chat_bg,
        "send_button_color": bot.send_button_color,
        "font_family": bot.font_family,
        "font_size": bot.font_size,
        "corner_radius": bot.corner_radius,
        "bubble_shape": bot.bubble_shape,
        "header_style": bot.header_style,
        "chat_width": bot.chat_width,
        "chat_height": bot.chat_height,
        "logo_shape": bot.logo_shape,
        "logo_in_header": bot.logo_in_header,
        "logo_in_messages": bot.logo_in_messages,
        "logo_in_launcher": bot.logo_in_launcher,
        "logo_header_size": bot.logo_header_size,
        "logo_msg_size": bot.logo_msg_size,
        "launcher_size": bot.launcher_size,
        "launcher_color": bot.launcher_color,
        "launcher_shape": bot.launcher_shape,
        "launcher_position": bot.launcher_position,
        "launcher_animation": bot.launcher_animation,
        "greeting_text": bot.greeting_text,
        "show_badge": bot.show_badge,
        "language": bot.language,
        "auto_open": bot.auto_open,
        "auto_open_delay": bot.auto_open_delay,
        "sound_enabled": bot.sound_enabled,
        "typing_indicator": bot.typing_indicator,
        "show_timestamps": bot.show_timestamps,
        "allow_upload": bot.allow_upload,
        "collect_email": bot.collect_email,
        "show_quick_replies": bot.show_quick_replies,
        "show_branding": bot.show_branding,
        "business_hours_only": bot.business_hours_only,
        "offline_message": bot.offline_message,
        "response_delay": bot.response_delay,
        "input_mode": bot.input_mode,
        "flow": json.loads(bot.flow_json) if bot.flow_json else [],
    }


@router.get("/extract-color")
async def extract_color(url: str, current_user=Depends(get_current_user)):
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        html = r.text
        patterns = [
            r'<meta[^>]+name=["\']theme-color["\'][^>]+content=["\'](#[0-9a-fA-F]{6})["\']',
            r'content=["\'](#[0-9a-fA-F]{6})["\'][^>]+name=["\']theme-color["\']',
            r'--primary[^:]*:\s*(#[0-9a-fA-F]{6})',
            r'--brand[^:]*:\s*(#[0-9a-fA-F]{6})',
        ]
        for pat in patterns:
            m = re.search(pat, html, re.I)
            if m:
                return {"color": m.group(1)}
        return {"color": None}
    except Exception:
        return {"color": None}


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
