from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from models.database import SessionLocal, User
from jose import jwt
import razorpay
import os
import hmac
import hashlib

router = APIRouter()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")
SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

PLANS = {
    "starter": {"amount": 79900, "name": "Starter", "tokens": 100000, "workflows": 10},
    "pro":     {"amount": 139900, "name": "Pro", "tokens": 500000, "workflows": 50},
    "business":{"amount": 349900, "name": "Business", "tokens": 9999999, "workflows": 9999},
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
    order = client.order.create({
        "amount": plan_data["amount"],
        "currency": "INR",
        "payment_capture": 1,
        "notes": {"plan": plan, "user_email": user.email}
    })
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
        sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            f"{data['razorpay_order_id']}|{data['razorpay_payment_id']}".encode(),
            hashlib.sha256
        ).hexdigest()
        if sig != data['razorpay_signature']:
            raise HTTPException(status_code=400, detail="Invalid signature")
        plan = data.get("plan")
        token = data.get("token")
        user = get_current_user(token, db)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        plan_data = PLANS[plan]
        user.plan = plan_data["name"]
        user.token_limit = plan_data["tokens"]
        db.commit()
        return {"success": True, "plan": plan_data["name"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))