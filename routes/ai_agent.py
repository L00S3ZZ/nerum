from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import SessionLocal, User, Workflow
from models.ai_agent_model import AIAgentConversation
from jose import jwt, JWTError
from datetime import datetime
from security import sanitize_input
import os
import re
import json
import uuid

router = APIRouter()

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
NERU_MODEL = "claude-haiku-4-5"
NERU_TOKEN_COST = 15

AVATARS_DIR = os.path.join("static", "avatars")
os.makedirs(AVATARS_DIR, exist_ok=True)

NERU_SYSTEM_PROMPT = """
You are Neru, Nerum's AI workflow assistant with a fun personality.
You are represented as an animated avatar that looks like the user.
You help Indian business owners build automated marketing workflows
through natural conversation — voice or text.
You speak casually, warmly, like a smart Chennai friend who knows tech.
You support Tamil and English. Match the language the user uses.
Occasionally use Tamil words naturally: anna, super, romba nalla, seri, nalla iruku.

YOUR PERSONALITY:
- Confident and enthusiastic about automation
- Never robotic or corporate
- Makes the user feel like a tech genius
- Celebrates wins ("you're going to go out of stock!")
- Asks smart questions, never dumps everything at once
- Makes decisions when user says "surprise me"

YOUR JOB:
Convert the user's business goal into an executable workflow
through a natural back-and-forth conversation.

AVAILABLE TRIGGERS:
- schedule: cron timer (daily, weekly, monthly, specific time IST)
- webhook: external trigger
- manual: user runs it
- form_submission: Google Forms

AVAILABLE ACTIONS:
- whatsapp_message: send WhatsApp via Twilio
- email: send via Resend
- telegram_message: send via Telegram bot
- google_sheets_append: log to Google Sheet
- webhook_post: POST to any URL
- generate_caption: AI writes caption + hashtags
- generate_flyer_text: AI writes headline, tagline, body copy
- generate_content: AI writes full marketing content

TOP 10 SOCIAL PLATFORMS:
1. Instagram
2. Facebook
3. X / Twitter
4. LinkedIn
5. YouTube Community
6. Telegram Channel
7. WhatsApp Broadcast
8. Reddit
9. Discord
10. Threads

AGENT STATES (include in every reply as metadata on last line):
FORMAT: [STATE:listening] or [STATE:thinking] or [STATE:working]
        or [STATE:confirming] or [STATE:celebrating]

Use:
- listening: waiting for user input / asking questions
- thinking: processing complex request
- working: building the workflow
- confirming: asking user to approve plan
- celebrating: workflow successfully created

CONVERSATION FLOW:

STEP 1 — GREET AND UNDERSTAND
When user first connects greet them warmly.
Ask what they want to automate.
[STATE:listening]

STEP 2 — ASK SMART QUESTIONS (max 3 at a time)
Always numbered options not open text when possible.
Order of questions:
  1. Product/service name and description
  2. Price and target audience
  3. Images available or AI generates content?
  4. Which platforms? (show top 10 numbered list)
  5. Posting time and frequency
  6. Content tone:
     1. Professional
     2. Fun and casual
     3. Emotional / storytelling
     4. Festive / offer-based
  7. Language: Tamil / English / Both

If user says "surprise me": decide everything yourself,
explain your choices confidently, move to Step 3.
[STATE:thinking] while processing

STEP 3 — CONFIRM PLAN
Summarize in plain casual language before building.
End with: "Ready to build this? (yes / make changes)"
[STATE:confirming]

STEP 4 — BUILD WORKFLOW
Only after user confirms with yes/ok/haan/seri/proceed.
Output this EXACT JSON structure:

{
  "workflow_name": "",
  "description": "",
  "trigger": {
    "type": "schedule",
    "config": {
      "cron": "0 9 * * *",
      "timezone": "Asia/Kolkata"
    }
  },
  "ai_generation": {
    "enabled": true,
    "type": "generate_caption",
    "product_context": {
      "name": "",
      "description": "",
      "price": "",
      "target_audience": "",
      "tone": "",
      "language": "english"
    }
  },
  "actions": [
    {
      "platform": "instagram",
      "action_type": "post",
      "config": {
        "message_template": "",
        "include_ai_content": true,
        "hashtags": true
      }
    }
  ],
  "metadata": {
    "business_type": "",
    "created_by": "neru_ai",
    "estimated_reach": "medium",
    "tokens_required": 0
  }
}

[STATE:working] while building

STEP 5 — CELEBRATE
After JSON output, say something fun and confident in 2-3 sentences.
Mention first run time. Make user excited.
[STATE:celebrating]

RULES:
- Never more than 3 questions at once
- Always state assumptions when making decisions
- Keep responses SHORT and punchy
- Never explain limitations
- Token cost: each platform = 10, AI generation = 15, schedule = 5
"""

STATE_PATTERN = re.compile(r"\[STATE:(listening|thinking|working|confirming|celebrating)\]", re.IGNORECASE)
WORKFLOW_JSON_PATTERN = re.compile(r'\{[\s\S]*"workflow_name"[\s\S]*\}')


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    voice_mode: bool = False


def _call_claude(messages):
    try:
        from anthropic import Anthropic
    except ImportError:
        raise HTTPException(status_code=500, detail="Anthropic SDK not installed on server")

    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages if m.get("role") in ("user", "assistant")]

    resp = client.messages.create(
        model=NERU_MODEL,
        max_tokens=1500,
        system=NERU_SYSTEM_PROMPT,
        messages=api_messages,
    )
    parts = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts).strip()


def _extract_state(text: str) -> str:
    m = STATE_PATTERN.search(text or "")
    return m.group(1).lower() if m else "listening"


def _strip_state(text: str) -> str:
    return STATE_PATTERN.sub("", text or "").strip()


def _extract_workflow_json(text: str):
    if not text:
        return None
    m = WORKFLOW_JSON_PATTERN.search(text)
    if not m:
        return None
    raw = m.group(0)
    # try progressive parsing — JSON may be embedded with surrounding text
    for end in range(len(raw), 0, -1):
        try:
            return json.loads(raw[:end])
        except Exception:
            continue
    return None


def _build_workflow_steps(workflow_data: dict):
    if not workflow_data:
        return None
    steps = []
    trig = workflow_data.get("trigger") or {}
    trig_type = trig.get("type", "manual")
    steps.append({"type": "trigger", "label": trig_type.title(), "icon": "trigger"})
    ai_gen = workflow_data.get("ai_generation") or {}
    if ai_gen.get("enabled"):
        label = (ai_gen.get("type") or "ai_content").replace("_", " ").title()
        steps.append({"type": "ai", "label": label, "icon": "sparkle"})
    for action in workflow_data.get("actions") or []:
        platform = action.get("platform") or action.get("action_type") or "action"
        steps.append({"type": "action", "label": platform.title(), "icon": "send"})
    return steps


# ─── POST /ai-agent/chat ────────────────────────────────────────────────────────
@router.post("/chat")
def chat(req: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg_text = sanitize_input(req.message, 2000)
    if not msg_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conv_id = sanitize_input(req.conversation_id, 80) or str(uuid.uuid4())

    convo = db.query(AIAgentConversation).filter(
        AIAgentConversation.conversation_id == conv_id,
        AIAgentConversation.user_id == user.id,
    ).first()

    if convo:
        try:
            history = json.loads(convo.messages) if convo.messages else []
        except Exception:
            history = []
    else:
        history = []
        convo = AIAgentConversation(
            user_id=user.id,
            conversation_id=conv_id,
            messages="[]",
            preview=msg_text[:60],
            created_at=datetime.utcnow(),
        )
        db.add(convo)

    history.append({"role": "user", "content": msg_text})

    try:
        ai_text = _call_claude(history)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Neru AI error: {e}")
        raise HTTPException(status_code=502, detail="Neru is taking a break. Try again in a moment.")

    history.append({"role": "assistant", "content": ai_text})

    agent_state = _extract_state(ai_text)
    cleaned_reply = _strip_state(ai_text)

    workflow_data = _extract_workflow_json(cleaned_reply)
    workflow_created = False
    workflow_id_val = None
    workflow_steps = None

    if workflow_data and isinstance(workflow_data, dict) and workflow_data.get("workflow_name"):
        try:
            trig = workflow_data.get("trigger") or {}
            actions = workflow_data.get("actions") or []
            first_action = actions[0] if actions else {}
            action_label = first_action.get("platform") or first_action.get("action_type") or ""

            new_wf = Workflow(
                user_id=user.id,
                name=sanitize_input(workflow_data.get("workflow_name", "Neru Workflow"), 100),
                description=sanitize_input(workflow_data.get("description", ""), 500),
                trigger=sanitize_input(trig.get("type", "manual"), 100),
                action=sanitize_input(action_label, 100),
                config=json.dumps(workflow_data),
                is_active=True,
                runs=0,
                created_at=datetime.utcnow(),
            )
            db.add(new_wf)
            db.flush()
            workflow_created = True
            workflow_id_val = new_wf.id
            convo.workflow_created = True
            convo.workflow_id = new_wf.id
            workflow_steps = _build_workflow_steps(workflow_data)
            # remove embedded JSON from displayed reply
            cleaned_reply = WORKFLOW_JSON_PATTERN.sub("", cleaned_reply).strip()
        except Exception as e:
            print(f"❌ Workflow save error: {e}")
            workflow_created = False

    if not workflow_steps and workflow_data:
        workflow_steps = _build_workflow_steps(workflow_data)

    # persist conversation
    convo.messages = json.dumps(history)
    convo.updated_at = datetime.utcnow()
    if not convo.preview:
        convo.preview = msg_text[:60]

    # deduct tokens
    user.tokens_used = (user.tokens_used or 0) + NERU_TOKEN_COST

    db.commit()

    return {
        "reply": cleaned_reply,
        "workflow_created": workflow_created,
        "workflow_id": workflow_id_val,
        "workflow_data": workflow_data if workflow_created else None,
        "agent_state": agent_state,
        "workflow_steps": workflow_steps,
        "tokens_used": user.tokens_used,
        "conversation_id": conv_id,
    }


# ─── POST /ai-agent/upload-avatar ───────────────────────────────────────────────
@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if not file.content_type or file.content_type.lower() not in ("image/jpeg", "image/jpg", "image/png"):
        raise HTTPException(status_code=400, detail="Only JPG or PNG images allowed")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    if len(data) < 100:
        raise HTTPException(status_code=400, detail="File is empty")

    filename = f"{user.id}.jpg"
    save_path = os.path.join(AVATARS_DIR, filename)
    try:
        with open(save_path, "wb") as f:
            f.write(data)
    except Exception as e:
        print(f"❌ Avatar save error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save avatar")

    return {"avatar_url": f"/static/avatars/{filename}"}


# ─── GET /ai-agent/avatar ───────────────────────────────────────────────────────
@router.get("/avatar")
def get_avatar(user: User = Depends(get_current_user)):
    filename = f"{user.id}.jpg"
    path = os.path.join(AVATARS_DIR, filename)
    if os.path.exists(path):
        return {"avatar_url": f"/static/avatars/{filename}", "has_avatar": True}
    return {"avatar_url": None, "has_avatar": False}


# ─── GET /ai-agent/conversations ────────────────────────────────────────────────
@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convos = db.query(AIAgentConversation).filter(
        AIAgentConversation.user_id == user.id
    ).order_by(AIAgentConversation.updated_at.desc()).limit(50).all()

    return [
        {
            "conversation_id": c.conversation_id,
            "preview": c.preview or "New chat",
            "workflow_created": c.workflow_created,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convos
    ]


# ─── GET /ai-agent/conversation/{id} ────────────────────────────────────────────
@router.get("/conversation/{conversation_id}")
def get_conversation(conversation_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convo = db.query(AIAgentConversation).filter(
        AIAgentConversation.conversation_id == conversation_id,
        AIAgentConversation.user_id == user.id,
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        messages = json.loads(convo.messages) if convo.messages else []
    except Exception:
        messages = []
    return {
        "conversation_id": convo.conversation_id,
        "messages": messages,
        "workflow_created": convo.workflow_created,
        "workflow_id": convo.workflow_id,
    }


# ─── DELETE /ai-agent/conversation/{id} ─────────────────────────────────────────
@router.delete("/conversation/{conversation_id}")
def delete_conversation(conversation_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convo = db.query(AIAgentConversation).filter(
        AIAgentConversation.conversation_id == conversation_id,
        AIAgentConversation.user_id == user.id,
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(convo)
    db.commit()
    return {"message": "Conversation deleted"}
