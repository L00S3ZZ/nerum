from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import SessionLocal, User, PasswordResetToken
from passlib.context import CryptContext
from datetime import datetime, timedelta
import httpx
import secrets
import os

router = APIRouter()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# ─── FORGOT PASSWORD ───────────────────────────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    # Always return success even if email not found (security best practice)
    if not user:
        return {"message": "If this email exists, a reset link has been sent."}

    # Delete any existing tokens for this email
    db.query(PasswordResetToken).filter(PasswordResetToken.email == req.email).delete()

    # Create new token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset_token = PasswordResetToken(
        email=req.email,
        token=token,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_token)
    db.commit()

    # Send email
    reset_url = f"https://nerum.in/reset-password?token={token}"
    first_name = user.name.split()[0] if user.name else "there"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#06000f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:480px;margin:40px auto;padding:0 20px">
        <div style="text-align:center;margin-bottom:28px;padding-top:20px">
          <span style="font-size:26px;font-weight:800;color:#e879f9">Ne</span><span style="font-size:26px;font-weight:800;color:#818cf8">rum</span>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(232,121,249,0.2);border-radius:20px;padding:32px;text-align:center">
          <div style="font-size:28px;margin-bottom:12px">🔐</div>
          <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Reset your password</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin:0 0 24px">
            Hi {first_name}, we received a request to reset your Nerum password.<br/>
            This link expires in <strong style="color:#e879f9">1 hour</strong>.
          </p>
          <a href="{reset_url}"
             style="display:inline-block;padding:13px 30px;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;text-decoration:none;border-radius:25px;font-size:14px;font-weight:700;margin-bottom:20px">
            Reset Password →
          </a>
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0">
            If you didn't request this, ignore this email. Your password won't change.
          </p>
        </div>
        <div style="text-align:center;margin-top:20px;padding-bottom:40px">
          <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0">© 2026 Nerum · AI Workflow Automation</p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        if RESEND_API_KEY:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {RESEND_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": "Nerum <onboarding@resend.dev>",
                        "to": [req.email],
                        "subject": "Reset your Nerum password 🔐",
                        "html": html
                    }
                )
    except Exception:
        pass

    return {"message": "If this email exists, a reset link has been sent."}

# ─── VERIFY TOKEN ──────────────────────────────────────────────────────────────
@router.get("/verify-reset-token")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if datetime.utcnow() > reset_token.expires_at:
        raise HTTPException(status_code=400, detail="Reset link has expired")

    return {"valid": True, "email": reset_token.email}

# ─── RESET PASSWORD ────────────────────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.used == False
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if datetime.utcnow() > reset_token.expires_at:
        raise HTTPException(status_code=400, detail="Reset link has expired")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Update password
    user = db.query(User).filter(User.email == reset_token.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = pwd_context.hash(req.new_password)

    # Mark token as used
    reset_token.used = True

    db.commit()

    return {"message": "Password reset successfully. You can now login."}