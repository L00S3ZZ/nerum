"""Auth: register + OTP verify, login (+lockout, +2FA), password reset, Google OAuth."""
import os
import random
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.ratelimit import email_key, ip_email_key, ip_key, limiter
from core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    user_to_dict,
    verify_password,
)
from models.models import LoginHistory, OTPCode, PasswordResetToken, User
from services.email import (
    send_otp_email,
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
OTP_MINUTES = 10
RESET_HOURS = 1


# ── schemas ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=100)


class OTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=8)


class ForgotRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)


# ── helpers ───────────────────────────────────────────────────────────
def _gen_otp() -> str:
    return f"{random.randint(100000, 999999)}"


async def _new_otp(db: AsyncSession, email: str, purpose: str) -> str:
    for old in (
        await db.scalars(
            select(OTPCode).where(OTPCode.email == email, OTPCode.purpose == purpose, OTPCode.used.is_(False))
        )
    ).all():
        old.used = True
    code = _gen_otp()
    db.add(OTPCode(email=email, code=code, purpose=purpose, expires_at=datetime.utcnow() + timedelta(minutes=OTP_MINUTES), used=False))
    await db.flush()
    return code


async def _consume_otp(db: AsyncSession, email: str, purpose: str, otp: str) -> None:
    rec = (
        await db.scalars(
            select(OTPCode)
            .where(OTPCode.email == email, OTPCode.purpose == purpose, OTPCode.used.is_(False))
            .order_by(OTPCode.created_at.desc())
        )
    ).first()
    if not rec:
        raise HTTPException(400, "No code found. Request a new one.")
    if datetime.utcnow() > rec.expires_at:
        raise HTTPException(400, "Code expired. Request a new one.")
    if rec.code != otp.strip():
        raise HTTPException(400, "Invalid code.")
    rec.used = True


async def _record_login(db: AsyncSession, user: User, request: Request) -> None:
    ua = request.headers.get("user-agent", "Unknown")
    device = "Mobile" if "Mobile" in ua else "Desktop"
    ip = request.client.host if request.client else "Unknown"
    db.add(LoginHistory(user_id=user.id, email=user.email, ip_address=ip, device=device, logged_in_at=datetime.utcnow()))


async def _rl_capture_email(request: Request) -> None:
    """Stash the request's email on request.state so the rate-limit key functions
    can bucket per-email. Best-effort: a missing/unparseable body yields ''."""
    try:
        data = await request.json()
        request.state.rl_email = (data.get("email") or "").lower().strip()
    except Exception:
        request.state.rl_email = ""


# ── routes ────────────────────────────────────────────────────────────
async def _register_impl(body: RegisterRequest, db: AsyncSession) -> dict:
    email = body.email.lower().strip()
    if (await db.scalars(select(User).where(User.email == email))).first():
        raise HTTPException(400, "Email already registered. Please log in.")
    user = User(name=body.name.strip(), email=email, hashed_password=hash_password(body.password), is_verified=False, two_fa_enabled=False)
    db.add(user)
    await db.flush()
    code = await _new_otp(db, email, "verify")
    await send_verification_email(email, user.name, code)  # raises 503 if email unconfigured
    return {"message": "Verification code sent. Check your email."}


@router.post("/register", status_code=201)
@limiter.limit("3/hour", key_func=ip_key)
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await _register_impl(body, db)


@router.post("/signup", status_code=201)
@limiter.limit("3/hour", key_func=ip_key)
async def signup(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await _register_impl(body, db)


@router.post("/verify-email")
@limiter.limit("5/minute", key_func=ip_email_key)
async def verify_email(body: OTPRequest, request: Request, db: AsyncSession = Depends(get_db), _rl: None = Depends(_rl_capture_email)):
    email = body.email.lower().strip()
    await _consume_otp(db, email, "verify", body.otp)
    user = (await db.scalars(select(User).where(User.email == email))).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_verified = True
    await _record_login(db, user, request)
    try:
        await send_welcome_email(email, user.name)
    except HTTPException:
        pass  # welcome mail is best-effort; never block verification
    return {"access_token": create_access_token(user.email, user.name), "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/login")
@limiter.limit("5/minute", key_func=ip_key)
@limiter.limit("5/minute", key_func=email_key)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db), _rl: None = Depends(_rl_capture_email)):
    email = body.email.lower().strip()
    user = (await db.scalars(select(User).where(User.email == email))).first()

    if user and user.locked_until and datetime.utcnow() < user.locked_until:
        mins = int((user.locked_until - datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(429, f"Account locked. Try again in {mins} minute(s).")

    if not user or not verify_password(body.password, user.hashed_password):
        if user:
            user.failed_attempts = (user.failed_attempts or 0) + 1
            if user.failed_attempts >= LOCKOUT_THRESHOLD:
                user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
                user.failed_attempts = 0
                raise HTTPException(429, f"Too many attempts. Locked for {LOCKOUT_MINUTES} minutes.")
        raise HTTPException(401, "Invalid email or password")

    user.failed_attempts = 0
    user.locked_until = None

    if not user.is_verified:
        raise HTTPException(403, "Please verify your email first.")

    if user.two_fa_enabled:
        code = await _new_otp(db, email, "2fa")
        await send_otp_email(email, user.name, code)
        return {"requires_2fa": True, "email": email, "message": f"OTP sent to {email}"}

    await _record_login(db, user, request)
    return {"access_token": create_access_token(user.email, user.name), "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/verify-2fa")
@limiter.limit("5/minute", key_func=ip_email_key)
async def verify_2fa(body: OTPRequest, request: Request, db: AsyncSession = Depends(get_db), _rl: None = Depends(_rl_capture_email)):
    email = body.email.lower().strip()
    await _consume_otp(db, email, "2fa", body.otp)
    user = (await db.scalars(select(User).where(User.email == email))).first()
    if not user:
        raise HTTPException(404, "User not found")
    await _record_login(db, user, request)
    return {"access_token": create_access_token(user.email, user.name), "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/forgot-password")
@limiter.limit("3/hour", key_func=ip_email_key)
async def forgot_password(request: Request, body: ForgotRequest, db: AsyncSession = Depends(get_db), _rl: None = Depends(_rl_capture_email)):
    email = body.email.lower().strip()
    user = (await db.scalars(select(User).where(User.email == email))).first()
    if user:
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(email=email, token=token, expires_at=datetime.utcnow() + timedelta(hours=RESET_HOURS), used=False))
        await db.flush()
        await send_password_reset_email(email, user.name, f"{settings.APP_URL}/reset-password?token={token}")
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/hour", key_func=ip_key)
async def reset_password(request: Request, body: ResetRequest, db: AsyncSession = Depends(get_db)):
    rec = (
        await db.scalars(
            select(PasswordResetToken).where(PasswordResetToken.token == body.token, PasswordResetToken.used.is_(False))
        )
    ).first()
    if not rec or datetime.utcnow() > rec.expires_at:
        raise HTTPException(400, "Invalid or expired reset link.")
    user = (await db.scalars(select(User).where(User.email == rec.email))).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.hashed_password = hash_password(body.new_password)
    user.failed_attempts = 0
    user.locked_until = None
    rec.used = True
    return {"message": "Password updated. You can now log in."}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user_to_dict(user)


@router.post("/refresh")
async def refresh(user: User = Depends(get_current_user)):
    return {"access_token": create_access_token(user.email, user.name), "token_type": "bearer"}


@router.get("/google")
async def google_login():
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(503, "Google OAuth not configured")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google OAuth not configured")
    async with httpx.AsyncClient(timeout=15.0) as client:
        tok = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        access = tok.json().get("access_token")
        if not access:
            return RedirectResponse(f"{settings.APP_URL}/login?error=google_failed")
        info = (await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access}"})).json()

    email = (info.get("email") or "").lower().strip()
    if not email:
        return RedirectResponse(f"{settings.APP_URL}/login?error=google_failed")
    name = info.get("name", email)

    user = (await db.scalars(select(User).where(User.email == email))).first()
    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(secrets.token_hex(32)),
            is_verified=True,
            two_fa_enabled=False,
            google_id=info.get("id"),
            avatar_url=info.get("picture"),
        )
        db.add(user)
        await db.flush()
        try:
            await send_welcome_email(email, name)
        except HTTPException:
            pass
    else:
        user.is_verified = True
        if not user.google_id:
            user.google_id = info.get("id")

    token = create_access_token(user.email, user.name)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")
