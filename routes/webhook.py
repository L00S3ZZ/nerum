from fastapi import APIRouter, HTTPException, Request, Depends, Header
from sqlalchemy.orm import Session
from models.database import SessionLocal, Workflow, User, WorkflowRun
from jose import jwt, JWTError
from datetime import datetime, date
from security import check_content, sanitize_input, validate_phone, get_daily_limit
import json
import httpx
import os
import secrets

router = APIRouter()

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

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
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_daily_limit(user: User, action: str, db: Session) -> bool:
    """Check if user has exceeded daily message limit"""
    limit = get_daily_limit(user.plan, action)
    today = date.today()
    today_runs = db.query(WorkflowRun).filter(
        WorkflowRun.user_id == user.id,
        WorkflowRun.action == action,
        WorkflowRun.ran_at >= datetime.combine(today, datetime.min.time())
    ).count()
    return today_runs < limit

# ─── RECEIVE CUSTOM WEBHOOK ────────────────────────────────────────────────────
@router.post("/receive/{webhook_key}")
async def receive_webhook(webhook_key: str, request: Request, db: Session = Depends(get_db)):
    # ✅ Validate webhook key format
    if not webhook_key or len(webhook_key) < 10:
        raise HTTPException(status_code=400, detail="Invalid webhook key")

    # ✅ Find workflow by webhook key
    workflows = db.query(Workflow).all()
    target_workflow = None
    target_user = None

    for w in workflows:
        config = json.loads(w.config) if w.config else {}
        if config.get("webhook_key") == webhook_key and w.is_active:
            target_workflow = w
            target_user = db.query(User).filter(User.id == w.user_id).first()
            break

    if not target_workflow or not target_user:
        raise HTTPException(status_code=404, detail="Webhook not found or inactive")

    # ✅ Get incoming data
    try:
        body = await request.json()
    except:
        try:
            form_data = await request.form()
            body = dict(form_data)
        except:
            body = {}

    # ✅ Sanitize incoming data
    sanitized_body = {}
    for key, value in body.items():
        sanitized_key = sanitize_input(str(key), 100)
        sanitized_value = sanitize_input(str(value), 500)
        sanitized_body[sanitized_key] = sanitized_value

    # ✅ Check token limit
    if target_user.token_limit - target_user.tokens_used <= 0:
        raise HTTPException(status_code=403, detail="Token limit reached. Please upgrade your plan.")

    # ✅ Check daily limits
    config = json.loads(target_workflow.config) if target_workflow.config else {}

    # ✅ Format message from template
    message_template = config.get("message_template", "New webhook received!\n\n{data}")
    try:
        formatted_message = message_template.replace("{data}", json.dumps(sanitized_body, indent=2))
        for key, value in sanitized_body.items():
            formatted_message = formatted_message.replace(f"{{{key}}}", str(value))
    except:
        formatted_message = f"New webhook received from {target_workflow.name}"

    # ✅ Content filter
    if not check_content(formatted_message):
        raise HTTPException(status_code=400, detail="Message contains prohibited content")

    results = []

    # ✅ Send WhatsApp (with daily limit check)
    if config.get("whatsapp_to"):
        if not check_daily_limit(target_user, "whatsapp", db):
            results.append({"action": "whatsapp", "status": "daily_limit_reached"})
        elif not validate_phone(config["whatsapp_to"]):
            results.append({"action": "whatsapp", "status": "invalid_phone"})
        else:
            result = await send_whatsapp(config["whatsapp_to"], formatted_message)
            results.append({"action": "whatsapp", "status": result})

    # ✅ Send Gmail (with daily limit check)
    if config.get("email_to"):
        if not check_daily_limit(target_user, "email", db):
            results.append({"action": "email", "status": "daily_limit_reached"})
        else:
            subject = config.get("email_subject", f"Webhook — {target_workflow.name}")
            result = await send_email(config["email_to"], subject, formatted_message)
            results.append({"action": "email", "status": result})

    # ✅ Send Telegram (with daily limit check)
    if config.get("telegram_chat_id"):
        if not check_daily_limit(target_user, "telegram", db):
            results.append({"action": "telegram", "status": "daily_limit_reached"})
        else:
            result = await send_telegram(config["telegram_chat_id"], formatted_message)
            results.append({"action": "telegram", "status": result})

    # ✅ Forward URL — validate it's not internal
    if config.get("forward_url"):
        forward_url = config["forward_url"]
        # Prevent SSRF — block internal IPs
        blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254", "10.", "192.168.", "172.16."]
        if any(b in forward_url for b in blocked):
            results.append({"action": "forward", "status": "blocked_internal_url"})
        else:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(forward_url, json=sanitized_body, timeout=10)
                results.append({"action": "forward", "status": "sent"})
            except:
                results.append({"action": "forward", "status": "failed"})

    # ✅ Update stats
    target_user.tokens_used += 10
    target_workflow.runs += 1
    target_workflow.last_run = datetime.utcnow()

    run = WorkflowRun(
        user_id=target_user.id,
        workflow_id=target_workflow.id,
        workflow_name=target_workflow.name,
        action="webhook",
        status="success" if results else "no_actions",
        details=f"Webhook received. Actions: {len(results)}",
        ran_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

    return {
        "success": True,
        "message": "Webhook processed",
        "actions_triggered": len(results),
        "results": results
    }

# ─── GET WEBHOOK URL ───────────────────────────────────────────────────────────
@router.get("/url/{workflow_id}")
def get_webhook_url(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == user.id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    config = json.loads(workflow.config) if workflow.config else {}

    if not config.get("webhook_key"):
        config["webhook_key"] = secrets.token_urlsafe(16)
        workflow.config = json.dumps(config)
        db.commit()

    webhook_url = f"https://nerum.in/webhook/receive/{config['webhook_key']}"

    return {
        "webhook_url": webhook_url,
        "webhook_key": config["webhook_key"],
        "method": "POST",
        "content_type": "application/json",
        "integrations": {
            "whatsapp_to": config.get("whatsapp_to", ""),
            "email_to": config.get("email_to", ""),
            "telegram_chat_id": config.get("telegram_chat_id", ""),
            "forward_url": config.get("forward_url", "")
        },
        "instructions": [
            "Copy the webhook URL above",
            "In your service, add this as a webhook URL",
            "Set method to POST and content type to application/json",
            "Nerum will receive the data and trigger your configured actions"
        ]
    }

# ─── UPDATE WEBHOOK CONFIG ─────────────────────────────────────────────────────
@router.post("/config/{workflow_id}")
def update_webhook_config(workflow_id: int, config_data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == user.id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    config = json.loads(workflow.config) if workflow.config else {}

    # ✅ Only allow specific safe fields
    allowed_fields = ["whatsapp_to", "email_to", "telegram_chat_id", "message_template", "forward_url", "email_subject"]
    for field in allowed_fields:
        if field in config_data:
            value = sanitize_input(str(config_data[field]), 500)
            # ✅ Validate phone if whatsapp
            if field == "whatsapp_to" and value and not validate_phone(value):
                raise HTTPException(status_code=400, detail="Invalid WhatsApp number format")
            config[field] = value

    workflow.config = json.dumps(config)
    db.commit()

    return {"message": "Webhook config updated!"}

# ─── REGENERATE WEBHOOK KEY ────────────────────────────────────────────────────
@router.post("/regenerate/{workflow_id}")
def regenerate_webhook_key(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == user.id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    config = json.loads(workflow.config) if workflow.config else {}
    config["webhook_key"] = secrets.token_urlsafe(16)
    workflow.config = json.dumps(config)
    db.commit()

    return {
        "message": "Webhook key regenerated!",
        "webhook_url": f"https://nerum.in/webhook/receive/{config['webhook_key']}"
    }

# ─── HELPERS ──────────────────────────────────────────────────────────────────
async def send_whatsapp(to: str, message: str):
    TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
    TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
    TWILIO_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    if not TWILIO_SID or not TWILIO_TOKEN:
        return "not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
                auth=(TWILIO_SID, TWILIO_TOKEN),
                data={"From": TWILIO_FROM, "To": f"whatsapp:{to}", "Body": message[:1600]}
            )
            return "sent" if res.status_code == 201 else f"error: {res.status_code}"
    except Exception as e:
        return f"error: {str(e)}"

async def send_email(to: str, subject: str, body: str):
    if not RESEND_API_KEY:
        return "not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <onboarding@resend.dev>",
                    "to": [to],
                    "subject": subject[:200],
                    "html": f"<div style='font-family:sans-serif;padding:20px'><pre style='white-space:pre-wrap'>{body[:5000]}</pre></div>"
                }
            )
            return "sent" if res.status_code == 200 else "error"
    except:
        return "error"

async def send_telegram(chat_id: str, message: str):
    BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not BOT_TOKEN:
        return "not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": message[:4096]}
            )
            return "sent" if res.status_code == 200 else "error"
    except Exception as e:
        return f"error: {str(e)}"