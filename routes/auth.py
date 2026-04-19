from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from models.database import SessionLocal, User
import os
import httpx

router = APIRouter()

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "https://nerum.onrender.com/auth/google/callback"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def send_welcome_email(name: str, email: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body style="margin:0;padding:0;background:#06000f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:560px;margin:40px auto;padding:0 20px">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:32px;padding-top:20px">
          <span style="font-size:28px;font-weight:800;color:#e879f9">Ne</span><span style="font-size:28px;font-weight:800;color:#818cf8">rum</span>
        </div>

        <!-- Card -->
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(232,121,249,0.2);border-radius:20px;padding:36px;text-align:center">

          <!-- Greeting -->
          <div style="font-size:32px;margin-bottom:8px">🎉</div>
          <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">Welcome to Nerum, {first_name}!</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 28px">
            You're all set to automate your business with AI workflows.<br/>
            Connect Gmail, WhatsApp, Telegram and Google Sheets — all in one place.
          </p>

          <!-- CTA Button -->
          <a href="https://nerum.onrender.com" 
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:25px;font-size:14px;font-weight:700;margin-bottom:28px">
            Go to Dashboard →
          </a>

          <!-- Divider -->
          <div style="border-top:1px solid rgba(255,255,255,0.08);margin-bottom:24px"></div>

          <!-- Steps -->
          <p style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-weight:600">GET STARTED IN 3 STEPS</p>
          <div style="display:flex;flex-direction:column;gap:12px;text-align:left">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#e879f9,#818cf8);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">1</div>
              <div>
                <div style="color:#fff;font-size:12px;font-weight:600">Connect your services</div>
                <div style="color:rgba(255,255,255,0.4);font-size:11px">Link Gmail, WhatsApp, Telegram & Sheets</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#e879f9,#818cf8);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">2</div>
              <div>
                <div style="color:#fff;font-size:12px;font-weight:600">Tell the AI what to automate</div>
                <div style="color:rgba(255,255,255,0.4);font-size:11px">Type in Tamil or English — Nerum understands</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#e879f9,#818cf8);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">3</div>
              <div>
                <div style="color:#fff;font-size:12px;font-weight:600">Sit back and watch it run</div>
                <div style="color:rgba(255,255,255,0.4);font-size:11px">Your workflow runs automatically 24/7</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;margin-top:24px;padding-bottom:40px">
          <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0">
            © 2026 Nerum · AI Workflow Automation<br/>
            <span style="color:rgba(255,255,255,0.15)">You received this because you signed up at nerum.onrender.com</span>
          </p>
        </div>

      </div>
    </body>
    </html>
    """
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Nerum <onboarding@resend.dev>",
                    "to": [email],
                    "subject": f"Welcome to Nerum, {first_name}! 🚀",
                    "html": html
                }
            )
    except Exception:
        pass  # Never block signup if email fails

@router.post("/signup")
async def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(req.password)
    user = User(name=req.name, email=req.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.email, "name": user.name})
    await send_welcome_email(user.name, user.email)
    return {"token": token, "name": user.name, "email": user.email}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"sub": user.email, "name": user.name})
    return {"token": token, "name": user.name, "email": user.email}

@router.get("/google")
def google_login():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    from urllib.parse import urlencode
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url)

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_info = user_res.json()

    email = user_info.get("email")
    name = user_info.get("name", email)

    user = db.query(User).filter(User.email == email).first()
    is_new_user = False
    if not user:
        is_new_user = True
        user = User(
            name=name,
            email=email,
            hashed_password=pwd_context.hash(os.urandom(32).hex())
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if is_new_user:
        await send_welcome_email(name, email)

    token = create_token({"sub": user.email, "name": user.name})
    return RedirectResponse(
        f"/?token={token}&name={name}"
    )