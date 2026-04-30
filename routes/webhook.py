from fastapi import APIRouter, HTTPException, Request, Depends, Header
from sqlalchemy.orm import Session
from models.database import SessionLocal, Workflow, User, WorkflowRun
from jose import jwt, JWTError
from datetime import datetime
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

# ─── RECEIVE CUSTOM WEBHOOK ────────────────────────────────────────────────────
# Any external service can POST to:
# https://nerum.onrender.com/webhook/receive/{webhook_key}

@router.post("/receive/{webhook_key}")
async def receive_webhook(webhook_key: str, request: Request, db: Session = Depends(get_db)):
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

    # ✅ Check token limit
    if target_user.token_limit - target_user.tokens_used <= 0:
        raise HTTPException(status_code=403, detail="Token limit reached")

    config = json.loads(target_workflow.config) if target_workflow.config else {}
    results = []

    # ✅ Format message from template
    message_template = config.get("message_template", "New webhook received!\n\n{data}")
    try:
        formatted_message = message_template.replace("{data}", json.dumps(body, indent=2))
        # Replace individual field placeholders like {name}, {email} etc
        for key, value in body.items():
            formatted_message = formatted_message.replace(f"{{{key}}}", str(value))
    except:
        formatted_message = f"New webhook received!\n\n{json.dumps(body, indent=2)}"

    # ✅ Send WhatsApp
    if config.get("whatsapp_to"):
        result = await send_whatsapp(config["whatsapp_to"], formatted_message)
        results.append({"action": "whatsapp", "status": result})

    # ✅ Send Gmail
    if config.get("email_to"):
        subject = config.get("email_subject", f"Webhook triggered — {target_workflow.name}")
        result = await send_email(config["email_to"], subject, formatted_message)
        results.append({"action": "gmail", "status": result})

    # ✅ Send Telegram
    if config.get("telegram_chat_id"):
        result = await send_telegram(config["telegram_chat_id"], formatted_message)
        results.append({"action": "telegram", "status": result})

    # ✅ Forward to another URL if configured
    if config.get("forward_url"):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(config["forward_url"], json=body, timeout=10)
            results.append({"action": "forward", "status": "sent"})
        except:
            results.append({"action": "forward", "status": "failed"})

    # ✅ Update stats
    target_user.tokens_used += 10
    target_workflow.runs += 1
    target_workflow.last_run = datetime.utcnow()

    # ✅ Save run history
    run = WorkflowRun(
        user_id=target_user.id,
        workflow_id=target_workflow.id,
        workflow_name=target_workflow.name,
        action="webhook",
        status="success" if results else "no_actions",
        details=f"Webhook received from external service. Actions: {len(results)}",
        ran_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

    return {
        "success": True,
        "message": "Webhook processed successfully",
        "workflow": target_workflow.name,
        "actions_triggered": len(results),
        "results": results
    }

# ─── GET WEBHOOK URL FOR A WORKFLOW ───────────────────────────────────────────
@router.get("/url/{workflow_id}")
def get_webhook_url(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == user.id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    config = json.loads(workflow.config) if workflow.config else {}

    # ✅ Generate webhook key if not exists
    if not config.get("webhook_key"):
        config["webhook_key"] = secrets.token_urlsafe(16)
        workflow.config = json.dumps(config)
        db.commit()

    webhook_url = f"https://nerum.onrender.com/webhook/receive/{config['webhook_key']}"

    return {
        "webhook_url": webhook_url,
        "webhook_key": config["webhook_key"],
        "method": "POST",
        "content_type": "application/json",
        "example_payload": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+91 98765 43210",
            "message": "I need your service"
        },
        "message_template": config.get("message_template", "New webhook received!\n\n{data}"),
        "integrations": {
            "whatsapp_to": config.get("whatsapp_to", ""),
            "email_to": config.get("email_to", ""),
            "telegram_chat_id": config.get("telegram_chat_id", ""),
            "forward_url": config.get("forward_url", "")
        },
        "instructions": [
            "Copy the webhook URL above",
            "In your service (Shopify, WooCommerce, etc), add this as a webhook URL",
            "Set method to POST and content type to application/json",
            "Nerum will receive the data and trigger your configured actions",
            "Use {field_name} in message template to insert form data"
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

    # ✅ Update allowed fields only — never credentials!
    allowed_fields = ["whatsapp_to", "email_to", "telegram_chat_id", "message_template", "forward_url", "email_subject"]
    for field in allowed_fields:
        if field in config_data:
            config[field] = config_data[field]

    workflow.config = json.dumps(config)
    db.commit()

    return {"message": "Webhook config updated!", "config": {k: config[k] for k in allowed_fields if k in config}}

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
        "webhook_url": f"https://nerum.onrender.com/webhook/receive/{config['webhook_key']}"
    }

# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────
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
                data={"From": TWILIO_FROM, "To": f"whatsapp:{to}", "Body": message}
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
                    "subject": subject,
                    "html": f"""
                    <div style="background:#06000f;padding:32px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="text-align:center;margin-bottom:20px">
                            <span style="font-size:20px;font-weight:800;color:#e879f9">Ne</span>
                            <span style="font-size:20px;font-weight:800;color:#818cf8">rum</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(232,121,249,0.2);border-radius:16px;padding:24px">
                            <h2 style="color:#fff;margin:0 0 16px;font-size:18px">{subject}</h2>
                            <pre style="color:rgba(255,255,255,0.7);font-size:13px;white-space:pre-wrap;font-family:inherit">{body}</pre>
                        </div>
                        <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:16px">Sent via Nerum Workflow Automation</p>
                    </div>
                    """
                }
            )
            return "sent" if res.status_code == 200 else f"error: {res.status_code}"
    except Exception as e:
        return f"error: {str(e)}"

async def send_telegram(chat_id: str, message: str):
    BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not BOT_TOKEN:
        return "not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": message}
            )
            return "sent" if res.status_code == 200 else f"error: {res.status_code}"
    except Exception as e:
        return f"error: {str(e)}"