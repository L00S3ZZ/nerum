from fastapi import APIRouter, Depends, HTTPException
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

# ✅ Correct token limits per plan
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