from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from models.database import SessionLocal, Workflow, User
from datetime import datetime
import json
import httpx
import os

router = APIRouter()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── GOOGLE FORMS WEBHOOK ──────────────────────────────────────────────────────
# User adds this URL to Google Forms via Apps Script:
# https://nerum.onrender.com/forms/webhook/{user_id}/{workflow_id}

@router.post("/webhook/{user_id}/{workflow_id}")
async def forms_webhook(user_id: int, workflow_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        # ✅ Get form data from Google Apps Script
        body = await request.json()
    except:
        body = {}

    # ✅ Get user and workflow
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == user_id,
        Workflow.is_active == True
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found or inactive")

    # ✅ Check token limit
    tokens_remaining = user.token_limit - user.tokens_used
    if tokens_remaining <= 0:
        raise HTTPException(status_code=403, detail="Token limit reached")

    # ✅ Get workflow config
    config = json.loads(workflow.config) if workflow.config else {}
    action = workflow.action or ""
    form_data = body.get("formData", {})
    submitter_email = body.get("email", "")
    submitter_name = body.get("name", "")

    results = []

    # ✅ Send WhatsApp if configured
    if "whatsapp" in action.lower() or config.get("whatsapp_to"):
        whatsapp_to = config.get("whatsapp_to", "")
        whatsapp_msg = config.get("whatsapp_message", f"New form submission from {submitter_name}!\n\nDetails:\n{json.dumps(form_data, indent=2)}")
        if whatsapp_to:
            result = await send_whatsapp(whatsapp_to, whatsapp_msg)
            results.append({"action": "whatsapp", "status": result})

    # ✅ Send Gmail if configured
    if "gmail" in action.lower() or config.get("email_to"):
        email_to = config.get("email_to", user.email)
        email_subject = config.get("email_subject", f"New Form Submission — {workflow.name}")
        email_body = config.get("email_body", f"You received a new form submission!\n\nFrom: {submitter_name} ({submitter_email})\n\nDetails:\n{json.dumps(form_data, indent=2)}")
        result = await send_email(email_to, email_subject, email_body, submitter_name)
        results.append({"action": "email", "status": result})

    # ✅ Send Telegram if configured
    if "telegram" in action.lower() or config.get("telegram_chat_id"):
        chat_id = config.get("telegram_chat_id", "")
        telegram_msg = config.get("telegram_message", f"📋 New form submission!\n\nFrom: {submitter_name}\n\n{json.dumps(form_data, indent=2)}")
        if chat_id:
            result = await send_telegram(chat_id, telegram_msg)
            results.append({"action": "telegram", "status": result})

    # ✅ Update workflow stats
    user.tokens_used += 10
    workflow.runs += 1
    workflow.last_run = datetime.utcnow()
    db.commit()

    return {
        "message": "Form submission processed successfully!",
        "workflow": workflow.name,
        "actions_triggered": len(results),
        "results": results
    }

# ─── GET WEBHOOK URL ───────────────────────────────────────────────────────────
@router.get("/webhook-url/{workflow_id}")
def get_webhook_url(workflow_id: int, authorization: str = None, db: Session = Depends(get_db)):
    from fastapi import Header
    from jose import jwt, JWTError
    SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.user_id == user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    webhook_url = f"https://nerum.onrender.com/forms/webhook/{user.id}/{workflow_id}"
    apps_script = f"""
// Paste this in Google Apps Script (Tools → Script editor)
function onFormSubmit(e) {{
  var formData = {{}};
  var items = e.response.getItemResponses();
  for (var i = 0; i < items.length; i++) {{
    formData[items[i].getItem().getTitle()] = items[i].getResponse();
  }}
  var payload = {{
    formData: formData,
    email: e.response.getRespondentEmail() || "",
    name: formData["Name"] || formData["Full Name"] || "Unknown",
    timestamp: new Date().toISOString()
  }};
  var options = {{
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  }};
  UrlFetchApp.fetch("{webhook_url}", options);
}}
"""
    return {
        "webhook_url": webhook_url,
        "apps_script": apps_script,
        "instructions": [
            "1. Open your Google Form",
            "2. Click the 3 dots menu → Script editor",
            "3. Paste the Apps Script code",
            "4. Save and set trigger: onFormSubmit → On form submit",
            "5. Done! Nerum will receive form submissions automatically"
        ]
    }

# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────
async def send_whatsapp(to: str, message: str):
    TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
    TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
    TWILIO_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    if not TWILIO_SID or not TWILIO_TOKEN:
        return "WhatsApp not configured"
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

async def send_email(to: str, subject: str, body: str, from_name: str = "Nerum"):
    if not RESEND_API_KEY:
        return "Email not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": f"Nerum <onboarding@resend.dev>",
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
        return "Telegram not configured"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"}
            )
            return "sent" if res.status_code == 200 else f"error: {res.status_code}"
    except Exception as e:
        return f"error: {str(e)}"