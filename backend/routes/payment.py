"""Razorpay — order creation, signature verification, webhook. Ported from V1."""
import hashlib
import hmac
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import get_current_user
from models.models import User, WorkflowRun
from services.email import send_email

router = APIRouter()

PLANS = {
    "starter": {"amount": 79900, "name": "starter", "tokens": 1000},
    "pro": {"amount": 139900, "name": "pro", "tokens": 1000},
    "business": {"amount": 349900, "name": "business", "tokens": 1000},
}


class VerifyBody(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


def _client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Razorpay not configured")
    import razorpay

    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.get("/plans")
async def plans():
    return {"plans": PLANS}


@router.post("/create-order/{plan}")
async def create_order(plan: str, user: User = Depends(get_current_user)):
    if plan not in PLANS:
        raise HTTPException(400, "Invalid plan")
    pdata = PLANS[plan]
    try:
        order = _client().order.create({
            "amount": pdata["amount"],
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"plan": plan, "user_email": user.email},
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"Razorpay error: {exc}")
    return {"order_id": order["id"], "amount": pdata["amount"], "currency": "INR", "key_id": settings.RAZORPAY_KEY_ID, "plan_name": pdata["name"]}


@router.post("/verify")
async def verify_payment(body: VerifyBody, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.plan not in PLANS:
        raise HTTPException(400, "Invalid plan")
    msg = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(400, "Invalid payment signature")
    pdata = PLANS[body.plan]
    user.plan = pdata["name"]
    user.token_limit = pdata["tokens"]
    return {"success": True, "plan": pdata["name"]}


@router.post("/razorpay-webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None), db: AsyncSession = Depends(get_db)):
    raw = await request.body()
    if settings.RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, x_razorpay_signature or ""):
            raise HTTPException(400, "Invalid webhook signature")
    try:
        payload = json.loads(raw)
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    email = entity.get("email", "")
    amount = entity.get("amount", 0) / 100
    pid = entity.get("id", "")

    user = (await db.scalars(select(User).where(User.email == email))).first()
    if user and event in ("payment.captured", "payment.failed"):
        ok = event == "payment.captured"
        db.add(WorkflowRun(
            user_id=user.id, workflow_id=0, workflow_name="Razorpay Payment",
            action="payment_captured" if ok else "payment_failed",
            status="success" if ok else "failed",
            details=f"₹{amount:.0f} — {pid}", ran_at=datetime.utcnow(),
        ))
        if ok and settings.RESEND_API_KEY:
            try:
                await send_email(email, f"Payment received — ₹{amount:.0f}", f"<p>Thank you {user.name}, ₹{amount:.0f} received (id {pid}).</p>")
            except HTTPException:
                pass
    return {"status": "ok"}
