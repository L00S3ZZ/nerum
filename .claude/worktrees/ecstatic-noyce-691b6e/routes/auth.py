from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from models.database import SessionLocal, User, EmailVerificationToken, LoginHistory, OTPCode
from slowapi import Limiter
from slowapi.util import get_remote_address
from collections import defaultdict
import os
import httpx
import secrets
import random

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "https://nerum.in/auth/google/callback"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
failed_attempts = defaultdict(lambda: {"count": 0, "locked_until": None})

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
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def user_to_dict(user):
    from security import get_token_limit
    limit = get_token_limit(user.plan or "free")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "plan": user.plan or "free",
        "tokens_used": user.tokens_used or 0,
        "token_limit": limit,
        "two_fa_enabled": bool(getattr(user, "two_fa_enabled", False)),
        "is_verified": bool(getattr(user, "is_verified", True)),
    }

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ── Pydantic models ──────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=200)
    password: str = Field(..., min_length=6, max_length=100)

    @validator("name")
    def name_safe(cls, v):
        if "<" in v or ">" in v or "script" in v.lower():
            raise ValueError("Invalid name")
        return v.strip()

    @validator("email")
    def email_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email")
        return v.lower().strip()

class LoginRequest(BaseModel):
    email: str = Field(..., max_length=200)
    password: str = Field(..., max_length=100)

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class Toggle2FARequest(BaseModel):
    enabled: bool

class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

# ── Email helpers ────────────────────────────────────────────────────────────
async def send_otp_email(name: str, email: str, otp: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <support@nerum.in>",
                    "to": [email],
                    "subject": f"🔐 Your Nerum login code: {otp}",
                    "html": f"""<div style="background:#06000f;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,77,222,0.2);border-radius:20px;padding:32px;text-align:center">
                            <div style="font-size:40px;margin-bottom:12px">🔐</div>
                            <h2 style="color:#fff;margin:0 0 8px">Your login code, {first_name}!</h2>
                            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px">Valid for 10 minutes.</p>
                            <div style="background:linear-gradient(135deg,rgba(255,77,222,0.15),rgba(139,92,246,0.15));border:1px solid rgba(255,77,222,0.3);border-radius:16px;padding:24px;margin-bottom:24px">
                                <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#fff">{otp}</div>
                            </div>
                            <p style="color:rgba(255,255,255,0.3);font-size:11px">Never share this code. If you didn't request this, ignore.</p>
                        </div>
                        <p style="text-align:center;color:rgba(255,255,255,0.15);font-size:11px;margin-top:20px">© 2026 Nerum</p>
                    </div>"""
                }
            )
    except Exception:
        pass

async def send_welcome_email(name: str, email: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <support@nerum.in>",
                    "to": [email],
                    "subject": f"Welcome to Nerum, {first_name}! 🚀",
                    "html": f"""<div style="background:#06000f;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,77,222,0.2);border-radius:20px;padding:32px;text-align:center">
                            <div style="font-size:32px;margin-bottom:8px">🎉</div>
                            <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">Welcome to Nerum, {first_name}!</h1>
                            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 28px">You're all set to automate your business with AI workflows.</p>
                            <a href="https://nerum.in/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#FF4DDE,#8B5CF6);color:#180024;text-decoration:none;border-radius:25px;font-size:14px;font-weight:700">Go to Dashboard →</a>
                        </div>
                        <p style="text-align:center;color:rgba(255,255,255,0.15);font-size:11px;margin-top:20px">© 2026 Nerum · AI Workflow Automation</p>
                    </div>"""
                }
            )
    except Exception:
        pass

async def send_verification_email(name: str, email: str, token: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    verify_url = f"https://nerum.in/auth/verify-email?token={token}"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <support@nerum.in>",
                    "to": [email],
                    "subject": "Verify your Nerum email ✉️",
                    "html": f"""<div style="background:#06000f;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,77,222,0.2);border-radius:20px;padding:32px;text-align:center">
                            <div style="font-size:40px;margin-bottom:12px">✉️</div>
                            <h2 style="color:#fff;margin:0 0 8px">Verify your email, {first_name}!</h2>
                            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 28px;line-height:1.6">Click below to verify your Nerum account.</p>
                            <a href="{verify_url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#FF4DDE,#8B5CF6);color:#180024;text-decoration:none;border-radius:25px;font-weight:700;font-size:14px">Verify Email →</a>
                            <p style="color:rgba(255,255,255,0.25);font-size:11px;margin-top:20px">Link expires in 24 hours.</p>
                        </div>
                    </div>"""
                }
            )
    except Exception:
        pass

async def send_login_alert(name: str, email: str, ip: str, device: str):
    if not RESEND_API_KEY:
        return
    first_name = name.split()[0] if name else "there"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Nerum <support@nerum.in>",
                    "to": [email],
                    "subject": "⚠️ New login to your Nerum account",
                    "html": f"""<div style="background:#06000f;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">
                        <div style="background:rgba(255,140,0,0.08);border:1px solid rgba(255,140,0,0.2);border-radius:20px;padding:32px;text-align:center">
                            <div style="font-size:40px;margin-bottom:12px">⚠️</div>
                            <h2 style="color:#fff;margin:0 0 16px">New login detected, {first_name}!</h2>
                            <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;text-align:left;margin-bottom:16px;font-size:12px">
                                <div style="color:rgba(255,255,255,0.5);margin-bottom:6px">Device: <strong style="color:#fff">{device}</strong></div>
                                <div style="color:rgba(255,255,255,0.5);margin-bottom:6px">IP: <strong style="color:#fff">{ip}</strong></div>
                                <div style="color:rgba(255,255,255,0.5)">Time: <strong style="color:#fff">{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</strong></div>
                            </div>
                            <p style="color:rgba(255,255,255,0.4);font-size:12px">If this was you, no action needed.</p>
                        </div>
                    </div>"""
                }
            )
    except Exception:
        pass

# ── ROUTES ───────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return user_to_dict(user)

@router.post("/update-profile")
def update_profile(req: UpdateProfileRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.name = req.name.strip()
    db.commit()
    return {"message": "Profile updated!", "name": user.name}

@router.post("/toggle-2fa")
def toggle_2fa(req: Toggle2FARequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.two_fa_enabled = req.enabled
    db.commit()
    return {"message": f"2FA {'enabled' if req.enabled else 'disabled'}!", "two_fa_enabled": req.enabled}

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
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
        raise HTTPException(status_code=401, detail=f"Invalid email or password. {5 - count} attempts remaining.")

    failed_attempts[email] = {"count": 0, "locked_until": None}

    if not getattr(user, "is_verified", True):
        raise HTTPException(status_code=403, detail="Please verify your email first. Check your inbox!")

    if getattr(user, "two_fa_enabled", False):
        otp = str(random.randint(100000, 999999))
        db.query(OTPCode).filter(OTPCode.email == email).delete()
        db.commit()
        db.add(OTPCode(email=email, code=otp, expires_at=datetime.utcnow() + timedelta(minutes=10), used=False))
        db.commit()
        await send_otp_email(user.name, email, otp)
        return {"requires_otp": True, "email": email, "message": f"OTP sent to {email}."}

    user_agent = request.headers.get("user-agent", "Unknown")
    device = "Mobile" if "Mobile" in user_agent else "Desktop"
    ip = request.client.host if request.client else "Unknown"
    db.add(LoginHistory(user_id=user.id, email=user.email, ip_address=ip, device=device, logged_in_at=datetime.utcnow()))
    db.commit()
    await send_login_alert(user.name, user.email, ip, device)

    access_token = create_token({"sub": user.email, "name": user.name})
    return {"access_token": access_token, "token_type": "bearer", "user": user_to_dict(user)}

@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request, req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
    hashed = pwd_context.hash(req.password)
    user = User(name=req.name, email=req.email, hashed_password=hashed, is_verified=False, two_fa_enabled=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    vtoken_str = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(email=req.email, token=vtoken_str, expires_at=datetime.utcnow() + timedelta(hours=24), used=False))
    db.commit()
    await send_verification_email(user.name, user.email, vtoken_str)
    await send_welcome_email(user.name, user.email)
    return {"message": "Account created! Please check your email to verify your account."}

@router.post("/signup")
@limiter.limit("3/minute")
async def signup(request: Request, req: SignupRequest, db: Session = Depends(get_db)):
    return await register(request, req, db)

@router.post("/verify-2fa")
@limiter.limit("5/minute")
async def verify_2fa(request: Request, req: OTPVerifyRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    otp_record = db.query(OTPCode).filter(OTPCode.email == email, OTPCode.used == False).order_by(OTPCode.created_at.desc()).first()
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found. Please login again.")
    if datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please login again.")
    if otp_record.code != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
    otp_record.used = True
    db.commit()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.add(LoginHistory(user_id=user.id, email=user.email, ip_address=request.client.host if request.client else "Unknown", device="Unknown", logged_in_at=datetime.utcnow()))
    db.commit()
    access_token = create_token({"sub": user.email, "name": user.name})
    return {"access_token": access_token, "token_type": "bearer", "user": user_to_dict(user)}

@router.post("/verify-otp")
@limiter.limit("5/minute")
async def verify_otp(request: Request, req: OTPVerifyRequest, db: Session = Depends(get_db)):
    return await verify_2fa(request, req, db)

@router.post("/resend-otp")
@limiter.limit("3/minute")
async def resend_otp(request: Request, data: dict, db: Session = Depends(get_db)):
    email = data.get("email", "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    otp = str(random.randint(100000, 999999))
    db.query(OTPCode).filter(OTPCode.email == email).delete()
    db.commit()
    db.add(OTPCode(email=email, code=otp, expires_at=datetime.utcnow() + timedelta(minutes=10), used=False))
    db.commit()
    await send_otp_email(user.name, email, otp)
    return {"message": "OTP resent! Check your email."}

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    vtoken = db.query(EmailVerificationToken).filter(EmailVerificationToken.token == token, EmailVerificationToken.used == False).first()
    if not vtoken:
        return HTMLResponse("""<html><body style="background:#06000f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center;color:#fff"><div style="font-size:48px">❌</div><h2 style="color:#ff8a7a">Invalid or expired link!</h2><a href="https://nerum.in" style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#FF4DDE,#8B5CF6);color:#180024;text-decoration:none;border-radius:20px;font-weight:700">Go to Nerum →</a></div></body></html>""")
    if datetime.utcnow() > vtoken.expires_at:
        return HTMLResponse("""<html><body style="background:#06000f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center;color:#fff"><div style="font-size:48px">⏰</div><h2 style="color:#fbbf24">Link expired!</h2><a href="https://nerum.in" style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#FF4DDE,#8B5CF6);color:#180024;text-decoration:none;border-radius:20px;font-weight:700">Go to Nerum →</a></div></body></html>""")
    user = db.query(User).filter(User.email == vtoken.email).first()
    if user:
        user.is_verified = True
        db.commit()
    vtoken.used = True
    db.commit()
    return HTMLResponse("""<html><body style="background:#06000f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center;color:#fff"><div style="font-size:48px">🎉</div><h2 style="color:#34d399">Email Verified!</h2><p style="color:rgba(255,255,255,0.5);margin:8px 0 24px">Redirecting to login...</p><a href="https://nerum.in" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#FF4DDE,#8B5CF6);color:#180024;text-decoration:none;border-radius:20px;font-weight:700">Go to Login →</a><script>setTimeout(()=>window.location.href="https://nerum.in",3000)</script></div></body></html>""")

@router.post("/resend-verification")
async def resend_verification(data: dict, db: Session = Depends(get_db)):
    email = data.get("email", "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    if getattr(user, "is_verified", False):
        raise HTTPException(status_code=400, detail="Email already verified")
    vtoken_str = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(email=email, token=vtoken_str, expires_at=datetime.utcnow() + timedelta(hours=24), used=False))
    db.commit()
    await send_verification_email(user.name, email, vtoken_str)
    return {"message": "Verification email sent!"}

@router.get("/login-history")
def get_login_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(LoginHistory).filter(LoginHistory.user_id == user.id).order_by(LoginHistory.logged_in_at.desc()).limit(10).all()
    return {
        "history": [{"ip_address": h.ip_address, "device": h.device, "logged_in_at": h.logged_in_at.isoformat()} for h in history],
        "two_fa_enabled": bool(getattr(user, "two_fa_enabled", False))
    }

@router.get("/google")
def google_login():
    from urllib.parse import urlencode
    params = {"client_id": GOOGLE_CLIENT_ID, "redirect_uri": GOOGLE_REDIRECT_URI, "response_type": "code", "scope": "openid email profile", "access_type": "offline"}
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={"code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code"}
        )
        g_access = token_res.json().get("access_token")
        user_res = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {g_access}"})
        user_info = user_res.json()

    email = user_info.get("email")
    name = user_info.get("name", email)
    if not email:
        return RedirectResponse("/?error=Google+login+failed")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(name=name, email=email, hashed_password=pwd_context.hash(os.urandom(32).hex()), is_verified=True, two_fa_enabled=False)
        db.add(user)
        db.commit()
        db.refresh(user)
        await send_welcome_email(name, email)
    else:
        if not getattr(user, "is_verified", True):
            user.is_verified = True
            db.commit()

    token = create_token({"sub": user.email, "name": user.name})
    return RedirectResponse(f"/?token={token}&name={name}")