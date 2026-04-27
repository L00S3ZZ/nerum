from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from models.database import SessionLocal, User, EmailVerificationToken, LoginHistory
from slowapi import Limiter
from slowapi.util import get_remote_address
from collections import defaultdict
from pydantic import Field, validator
import os
import httpx
import secrets

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "https://nerum.onrender.com/auth/google/callback"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ✅ Failed login tracker
failed_attempts = defaultdict(lambda: {"count": 0, "locked_until": None})

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=200)
    password: str = Field(..., min_length=6, max_length=100)

    @validator('name')
    def name_no_scripts(cls, v):
        if '<' in v or '>' in v or 'script' in v.lower():
            raise ValueError('Invalid name')
        return v.strip()

    @validator('email')
    def email_valid(cls, v):
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email')
        return v.lower().strip()

class LoginRequest(BaseModel):
    email: str = Field(..., max_length=200)
    password: str = Field(..., max_length=100)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ===== WELCOME EMAIL =====
async def send_welcome_email(name: str, email: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
    <body style="margin:0;padding:0;background:#06000f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:560px;margin:40px auto;padding:0 20px">
        <div style="text-align:center;margin-bottom:32px;padding-top:20px">
          <span style="font-size:28px;font-weight:800;color:#e879f9">Ne</span><span style="font-size:28px;font-weight:800;color:#818cf8">rum</span>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(232,121,249,0.2);border-radius:20px;padding:36px;text-align:center">
          <div style="font-size:32px;margin-bottom:8px">🎉</div>
          <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">Welcome to Nerum, {first_name}!</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 28px">
            You're all set to automate your business with AI workflows.<br/>
            Connect Gmail, WhatsApp, Telegram and Google Sheets — all in one place.
          </p>
          <a href="https://nerum.onrender.com" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:25px;font-size:14px;font-weight:700;margin-bottom:28px">
            Go to Dashboard →
          </a>
        </div>
        <div style="text-align:center;margin-top:24px;padding-bottom:40px">
          <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0">© 2026 Nerum · AI Workflow Automation</p>
        </div>
      </div>
    </body>
    </html>
    """
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": "Nerum <onboarding@resend.dev>", "to": [email], "subject": f"Welcome to Nerum, {first_name}! 🚀", "html": html}
            )
    except Exception:
        pass

# ===== VERIFICATION EMAIL =====
async def send_verification_email(name: str, email: str, token: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    verify_url = f"https://nerum.onrender.com/auth/verify-email?token={token}"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <onboarding@resend.dev>",
                    "to": [email],
                    "subject": "Verify your Nerum email ✉️",
                    "html": f"""
                    <div style="background:#06000f;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="text-align:center;margin-bottom:24px">
                            <span style="font-size:24px;font-weight:800;color:#e879f9">Ne</span>
                            <span style="font-size:24px;font-weight:800;color:#818cf8">rum</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(232,121,249,0.2);border-radius:20px;padding:32px;text-align:center">
                            <div style="font-size:40px;margin-bottom:12px">✉️</div>
                            <h2 style="color:#fff;margin:0 0 8px;font-size:20px">Verify your email, {first_name}!</h2>
                            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 28px;line-height:1.6">
                                Click the button below to verify your Nerum account.<br/>
                                This is a one-time verification — you won't need to do it again!
                            </p>
                            <a href="{verify_url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:25px;font-weight:700;font-size:14px">
                                Verify Email →
                            </a>
                            <p style="color:rgba(255,255,255,0.25);font-size:11px;margin-top:20px">
                                Link expires in 24 hours. If you didn't sign up, ignore this email.
                            </p>
                        </div>
                        <div style="text-align:center;margin-top:20px">
                            <p style="color:rgba(255,255,255,0.15);font-size:11px">© 2026 Nerum · AI Workflow Automation</p>
                        </div>
                    </div>
                    """
                }
            )
    except Exception:
        pass

# ===== SUSPICIOUS LOGIN ALERT =====
async def send_suspicious_login_alert(name: str, email: str, ip: str, device: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <onboarding@resend.dev>",
                    "to": [email],
                    "subject": "⚠️ New login to your Nerum account",
                    "html": f"""
                    <div style="background:#06000f;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="text-align:center;margin-bottom:24px">
                            <span style="font-size:24px;font-weight:800;color:#e879f9">Ne</span>
                            <span style="font-size:24px;font-weight:800;color:#818cf8">rum</span>
                        </div>
                        <div style="background:rgba(255,140,0,0.08);border:1px solid rgba(255,140,0,0.2);border-radius:20px;padding:32px;text-align:center">
                            <div style="font-size:40px;margin-bottom:12px">⚠️</div>
                            <h2 style="color:#fff;margin:0 0 8px;font-size:20px">New login detected, {first_name}!</h2>
                            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 20px">Someone just logged into your Nerum account.</p>
                            <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;text-align:left;margin-bottom:20px">
                                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                                    <span style="color:rgba(255,255,255,0.4);font-size:12px">Device</span>
                                    <span style="color:#fff;font-size:12px;font-weight:600">{device}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                                    <span style="color:rgba(255,255,255,0.4);font-size:12px">IP Address</span>
                                    <span style="color:#fff;font-size:12px;font-weight:600">{ip}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:6px 0">
                                    <span style="color:rgba(255,255,255,0.4);font-size:12px">Time</span>
                                    <span style="color:#fff;font-size:12px;font-weight:600">{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</span>
                                </div>
                            </div>
                            <p style="color:rgba(255,255,255,0.4);font-size:12px">If this was you, no action needed.<br/>If not, change your password immediately.</p>
                            <a href="https://nerum.onrender.com" style="display:inline-block;margin-top:16px;padding:12px 28px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:20px;font-weight:700;font-size:13px">
                                Go to Dashboard →
                            </a>
                        </div>
                        <div style="text-align:center;margin-top:20px">
                            <p style="color:rgba(255,255,255,0.15);font-size:11px">© 2026 Nerum · AI Workflow Automation</p>
                        </div>
                    </div>
                    """
                }
            )
    except Exception:
        pass

# ===== LOGIN =====
@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()

    # ✅ Check lockout
    attempt_data = failed_attempts[email]
    if attempt_data["locked_until"]:
        if datetime.utcnow() < attempt_data["locked_until"]:
            remaining = int((attempt_data["locked_until"] - datetime.utcnow()).total_seconds() / 60) + 1
            raise HTTPException(status_code=429, detail=f"Account locked. Try again in {remaining} minutes.")
        else:
            failed_attempts[email] = {"count": 0, "locked_until": None}

    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        failed_attempts[email]["count"] += 1
        count = failed_attempts[email]["count"]
        if count >= 5:
            failed_attempts[email]["locked_until"] = datetime.utcnow() + timedelta(minutes=15)
            raise HTTPException(status_code=429, detail="Too many failed attempts. Account locked for 15 minutes.")
        attempts_left = 5 - count
        raise HTTPException(status_code=401, detail=f"Invalid email or password. {attempts_left} attempts remaining.")

    # ✅ Reset failed attempts
    failed_attempts[email] = {"count": 0, "locked_until": None}

    # ✅ Check email verified
    is_verified = getattr(user, 'is_verified', True)
    if not is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email first. Check your inbox for the verification link!"
        )

    # ✅ Save login history
    user_agent = request.headers.get("user-agent", "Unknown")
    device = "Mobile" if "Mobile" in user_agent else "Desktop"
    ip = request.client.host if request.client else "Unknown"
    history = LoginHistory(
        user_id=user.id,
        email=user.email,
        ip_address=ip,
        device=device,
        logged_in_at=datetime.utcnow()
    )
    db.add(history)
    db.commit()

    # ✅ Send login alert
    await send_suspicious_login_alert(user.name, user.email, ip, device)

    token = create_token({"sub": user.email, "name": user.name})
    return {"token": token, "name": user.name, "email": user.email, "is_verified": True}

# ===== SIGNUP =====
@router.post("/signup")
@limiter.limit("3/minute")
async def signup(request: Request, req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = pwd_context.hash(req.password)
    user = User(name=req.name, email=req.email, hashed_password=hashed, is_verified=False)
    db.add(user)
    db.commit()
    db.refresh(user)

    # ✅ Create verification token
    vtoken_str = secrets.token_urlsafe(32)
    vtoken = EmailVerificationToken(
        email=req.email,
        token=vtoken_str,
        expires_at=datetime.utcnow() + timedelta(hours=24),
        used=False
    )
    db.add(vtoken)
    db.commit()

    # Send emails
    await send_verification_email(user.name, user.email, vtoken_str)
    await send_welcome_email(user.name, user.email)

    jwt_token = create_token({"sub": user.email, "name": user.name})
    return {"token": jwt_token, "name": user.name, "email": user.email, "is_verified": False}

# ===== VERIFY EMAIL =====
@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    vtoken = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token,
        EmailVerificationToken.used == False
    ).first()

    if not vtoken:
        return HTMLResponse("""
            <html><body style="background:#06000f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
            <div style="text-align:center;color:#fff">
                <div style="font-size:48px;margin-bottom:16px">❌</div>
                <h2 style="color:#ff8a7a;margin-bottom:8px">Invalid or expired link!</h2>
                <p style="color:rgba(255,255,255,0.4)">Please sign up again.</p>
                <a href="https://nerum.onrender.com" style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:20px;font-weight:700">Go to Nerum →</a>
            </div></body></html>
        """)

    if datetime.utcnow() > vtoken.expires_at:
        return HTMLResponse("""
            <html><body style="background:#06000f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
            <div style="text-align:center;color:#fff">
                <div style="font-size:48px;margin-bottom:16px">⏰</div>
                <h2 style="color:#fbbf24;margin-bottom:8px">Link expired!</h2>
                <p style="color:rgba(255,255,255,0.4)">Please sign up again to get a new link.</p>
                <a href="https://nerum.onrender.com" style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:20px;font-weight:700">Go to Nerum →</a>
            </div></body></html>
        """)

    # ✅ Mark verified
    user = db.query(User).filter(User.email == vtoken.email).first()
    if user:
        user.is_verified = True
        db.commit()

    vtoken.used = True
    db.commit()

    return HTMLResponse("""
        <html><body style="background:#06000f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
        <div style="text-align:center;color:#fff">
            <div style="font-size:48px;margin-bottom:16px">🎉</div>
            <h2 style="color:#34d399;margin-bottom:8px">Email Verified!</h2>
            <p style="color:rgba(255,255,255,0.5);margin-bottom:24px">Your Nerum account is now verified.<br/>You can now login freely anytime!</p>
            <a href="https://nerum.onrender.com" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:20px;font-weight:700">
                Go to Dashboard →
            </a>
        </div></body></html>
    """)

# ===== RESEND VERIFICATION EMAIL =====
@router.post("/resend-verification")
async def resend_verification(data: dict, db: Session = Depends(get_db)):
    email = data.get("email", "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    if getattr(user, 'is_verified', False):
        raise HTTPException(status_code=400, detail="Email already verified")

    # Create new token
    vtoken_str = secrets.token_urlsafe(32)
    vtoken = EmailVerificationToken(
        email=email,
        token=vtoken_str,
        expires_at=datetime.utcnow() + timedelta(hours=24),
        used=False
    )
    db.add(vtoken)
    db.commit()
    await send_verification_email(user.name, email, vtoken_str)
    return {"message": "Verification email sent!"}

# ===== LOGIN HISTORY =====
@router.get("/login-history")
def get_login_history(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        history = db.query(LoginHistory).filter(
            LoginHistory.user_id == user.id
        ).order_by(LoginHistory.logged_in_at.desc()).limit(10).all()
        return {
            "history": [
                {"ip_address": h.ip_address, "device": h.device, "logged_in_at": h.logged_in_at.isoformat()}
                for h in history
            ]
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== GOOGLE OAUTH =====
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
            hashed_password=pwd_context.hash(os.urandom(32).hex()),
            is_verified=False  # ✅ Must verify email even for Google users
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # ✅ Send verification email — ONE TIME only for new users
        vtoken_str = secrets.token_urlsafe(32)
        vtoken = EmailVerificationToken(
            email=email,
            token=vtoken_str,
            expires_at=datetime.utcnow() + timedelta(hours=24),
            used=False
        )
        db.add(vtoken)
        db.commit()
        await send_verification_email(name, email, vtoken_str)
        await send_welcome_email(name, email)

        # Redirect to verification pending page
        return RedirectResponse(f"/?verify_pending=true&email={email}&name={name}")

    # ✅ Existing user — check if verified
    is_verified = getattr(user, 'is_verified', True)
    if not is_verified:
        # Still not verified — resend verification
        vtoken_str = secrets.token_urlsafe(32)
        vtoken = EmailVerificationToken(
            email=email,
            token=vtoken_str,
            expires_at=datetime.utcnow() + timedelta(hours=24),
            used=False
        )
        db.add(vtoken)
        db.commit()
        await send_verification_email(name, email, vtoken_str)
        return RedirectResponse(f"/?verify_pending=true&email={email}&name={name}")

    # ✅ Verified — login directly
    token = create_token({"sub": user.email, "name": user.name})
    return RedirectResponse(f"/?token={token}&name={name}")