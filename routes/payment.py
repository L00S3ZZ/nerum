from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from models.database import SessionLocal, User, WorkflowRun
from jose import jwt
import razorpay
import os
import hmac
import hashlib
import httpx
import json
from datetime import datetime

router = APIRouter()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

PLANS = {
    "starter":  {"amount": 79900,  "name": "starter",  "tokens": 1000, "workflows": 10},
    "pro":      {"amount": 139900, "name": "pro",       "tokens": 1000, "workflows": 50},
    "business": {"amount": 349900, "name": "business",  "tokens": 1000, "workflows": 9999},
}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        return db.query(User).filter(User.email == email).first()
    except:
        return None

@router.post("/create-order/{plan}")
def create_order(plan: str, token: str, db: Session = Depends(get_db)):
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    plan_data = PLANS[plan]
    try:
        order = client.order.create({
            "amount": plan_data["amount"],
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"plan": plan, "user_email": user.email}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay error: {str(e)}")
    return {
        "order_id": order["id"],
        "amount": plan_data["amount"],
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "plan_name": plan_data["name"]
    }

@router.post("/verify")
async def verify_payment(data: dict, db: Session = Depends(get_db)):
    try:
        msg = f"{data['razorpay_order_id']}|{data['razorpay_payment_id']}"
        generated_sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode("utf-8"),
            msg.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(generated_sig, data.get("razorpay_signature", "")):
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        plan = data.get("plan")
        token = data.get("token")

        if plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")

        user = get_current_user(token, db)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")

        plan_data = PLANS[plan]
        user.plan = plan_data["name"]
        user.token_limit = plan_data["tokens"]
        db.commit()

        return {"success": True, "plan": plan_data["name"]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── RAZORPAY WEBHOOK ──────────────────────────────────────────────────────────
# Add this URL in Razorpay Dashboard → Settings → Webhooks:
# https://nerum.onrender.com/payment/razorpay-webhook
# Events to enable: payment.captured, payment.failed, order.paid

@router.post("/razorpay-webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    body = await request.body()

    # ✅ Verify webhook signature
    if RAZORPAY_WEBHOOK_SECRET:
        expected_sig = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, x_razorpay_signature or ""):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    print(f"✅ Razorpay webhook received: {event}")

    # ✅ Handle payment captured
    if event == "payment.captured":
        await handle_payment_captured(entity, db)

    # ✅ Handle payment failed
    elif event == "payment.failed":
        await handle_payment_failed(entity, db)

    return {"status": "ok"}

async def handle_payment_captured(entity: dict, db: Session):
    amount = entity.get("amount", 0) / 100  # Convert paise to rupees
    email = entity.get("email", "")
    name = entity.get("notes", {}).get("name", "Customer") or entity.get("contact", "")
    phone = entity.get("contact", "")
    payment_id = entity.get("id", "")
    order_id = entity.get("order_id", "")
    plan = entity.get("notes", {}).get("plan", "")

    print(f"✅ Payment captured: ₹{amount} from {email}")

    # ✅ Find user and their workflow configs
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"⚠️ User not found for email: {email}")
        return

    # ✅ Send payment confirmation email
    await send_payment_email(
        to=email,
        name=name or user.name,
        amount=amount,
        payment_id=payment_id,
        plan=plan
    )

    # ✅ Send WhatsApp if phone available
    if phone:
        message = f"✅ Payment Confirmed!\n\nDear {name or user.name}, your payment of ₹{amount:.0f} has been received successfully.\n\nPayment ID: {payment_id}\nThank you for choosing Nerum! 🚀"
        await send_whatsapp(phone, message)

    # ✅ Save to workflow run history
    run = WorkflowRun(
        user_id=user.id,
        workflow_id=0,
        workflow_name="Razorpay Payment",
        action="payment_captured",
        status="success",
        details=f"Payment of ₹{amount:.0f} captured. Payment ID: {payment_id}",
        ran_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

async def handle_payment_failed(entity: dict, db: Session):
    amount = entity.get("amount", 0) / 100
    email = entity.get("email", "")
    name = entity.get("notes", {}).get("name", "Customer")
    payment_id = entity.get("id", "")
    error = entity.get("error_description", "Payment failed")

    print(f"❌ Payment failed: ₹{amount} from {email} — {error}")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return

    # ✅ Send failure notification email
    if RESEND_API_KEY:
        try:
            async with httpx.AsyncClient() as client_http:
                await client_http.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "from": "Nerum <onboarding@resend.dev>",
                        "to": [email],
                        "subject": "⚠️ Payment Failed — Nerum",
                        "html": f"""
                        <div style="background:#06000f;padding:32px;font-family:sans-serif;max-width:560px;margin:0 auto">
                            <div style="text-align:center;margin-bottom:20px">
                                <span style="font-size:20px;font-weight:800;color:#e879f9">Ne</span>
                                <span style="font-size:20px;font-weight:800;color:#818cf8">rum</span>
                            </div>
                            <div style="background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.2);border-radius:16px;padding:24px;text-align:center">
                                <div style="font-size:32px;margin-bottom:12px">❌</div>
                                <h2 style="color:#fff;margin:0 0 8px">Payment Failed</h2>
                                <p style="color:rgba(255,255,255,0.5);margin:0 0 16px">Dear {name or user.name}, your payment of ₹{amount:.0f} could not be processed.</p>
                                <p style="color:#ff8a7a;font-size:12px;margin:0 0 20px">Reason: {error}</p>
                                <a href="https://nerum.onrender.com" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:20px;font-weight:700">Try Again →</a>
                            </div>
                        </div>
                        """
                    }
                )
        except Exception as e:
            print(f"Email error: {e}")

    # Save to history
    run = WorkflowRun(
        user_id=user.id,
        workflow_id=0,
        workflow_name="Razorpay Payment",
        action="payment_failed",
        status="failed",
        details=f"Payment of ₹{amount:.0f} failed. Reason: {error}",
        ran_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────
async def send_payment_email(to: str, name: str, amount: float, payment_id: str, plan: str):
    if not RESEND_API_KEY:
        return
    try:
        async with httpx.AsyncClient() as client_http:
            await client_http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <onboarding@resend.dev>",
                    "to": [to],
                    "subject": f"✅ Payment Confirmed — ₹{amount:.0f} received",
                    "html": f"""
                    <div style="background:#06000f;padding:32px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="text-align:center;margin-bottom:20px">
                            <span style="font-size:20px;font-weight:800;color:#e879f9">Ne</span>
                            <span style="font-size:20px;font-weight:800;color:#818cf8">rum</span>
                        </div>
                        <div style="background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:16px;padding:24px;text-align:center">
                            <div style="font-size:32px;margin-bottom:12px">✅</div>
                            <h2 style="color:#fff;margin:0 0 8px">Payment Confirmed!</h2>
                            <p style="color:rgba(255,255,255,0.5);margin:0 0 20px">Dear {name}, your payment has been received successfully.</p>
                            <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;text-align:left;margin-bottom:20px">
                                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                                    <span style="color:rgba(255,255,255,0.4);font-size:12px">Amount</span>
                                    <span style="color:#34d399;font-size:12px;font-weight:700">₹{amount:.0f}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                                    <span style="color:rgba(255,255,255,0.4);font-size:12px">Payment ID</span>
                                    <span style="color:#fff;font-size:11px;font-weight:600">{payment_id}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:6px 0">
                                    <span style="color:rgba(255,255,255,0.4);font-size:12px">Plan</span>
                                    <span style="color:#818cf8;font-size:12px;font-weight:700">{plan.upper() if plan else 'Nerum'}</span>
                                </div>
                            </div>
                            <a href="https://nerum.onrender.com" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:20px;font-weight:700">Go to Dashboard →</a>
                        </div>
                        <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:16px">© 2026 Nerum · AI Workflow Automation</p>
                    </div>
                    """
                }
            )
    except Exception as e:
        print(f"Email error: {e}")

async def send_whatsapp(to: str, message: str):
    TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
    TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
    TWILIO_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    if not TWILIO_SID or not TWILIO_TOKEN:
        return
    try:
        async with httpx.AsyncClient() as client_http:
            await client_http.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
                auth=(TWILIO_SID, TWILIO_TOKEN),
                data={"From": TWILIO_FROM, "To": f"whatsapp:{to}", "Body": message}
            )
    except Exception as e:
        print(f"WhatsApp error: {e}")