"""Transactional email via Resend. One implementation, real errors surfaced."""
import httpx
from fastapi import HTTPException

from core.config import settings

FROM = "Nerum <support@nerum.in>"
RESEND_URL = "https://api.resend.com/emails"


async def send_email(to: str, subject: str, html: str) -> dict:
    """Send one email. Raises 503 if unconfigured, 502 on provider error."""
    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured (RESEND_API_KEY missing)")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            RESEND_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": FROM, "to": [to], "subject": subject, "html": html},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Email API error: {resp.text}")
    return resp.json()


def _shell(inner: str) -> str:
    return (
        '<div style="background:#07080F;padding:40px;font-family:sans-serif;max-width:560px;margin:0 auto">'
        '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(123,47,255,0.25);'
        'border-radius:20px;padding:32px;text-align:center">' + inner + "</div>"
        '<p style="text-align:center;color:rgba(255,255,255,0.2);font-size:11px;margin-top:20px">© 2026 Nerum</p></div>'
    )


async def send_verification_email(to: str, name: str, otp: str) -> dict:
    first = (name or "there").split()[0]
    inner = (
        '<div style="font-size:40px;margin-bottom:12px">✉️</div>'
        f'<h2 style="color:#fff;margin:0 0 8px">Verify your email, {first}!</h2>'
        '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px">Code valid for 10 minutes.</p>'
        '<div style="background:linear-gradient(135deg,rgba(255,107,0,0.15),rgba(123,47,255,0.15));'
        'border:1px solid rgba(123,47,255,0.3);border-radius:16px;padding:24px;margin-bottom:8px">'
        f'<div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#fff">{otp}</div></div>'
    )
    return await send_email(to, f"Your Nerum verification code: {otp}", _shell(inner))


async def send_otp_email(to: str, name: str, otp: str) -> dict:
    first = (name or "there").split()[0]
    inner = (
        '<div style="font-size:40px;margin-bottom:12px">🔐</div>'
        f'<h2 style="color:#fff;margin:0 0 8px">Your login code, {first}!</h2>'
        '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px">Valid for 10 minutes.</p>'
        '<div style="background:linear-gradient(135deg,rgba(255,107,0,0.15),rgba(123,47,255,0.15));'
        'border:1px solid rgba(123,47,255,0.3);border-radius:16px;padding:24px">'
        f'<div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#fff">{otp}</div></div>'
    )
    return await send_email(to, f"Your Nerum login code: {otp}", _shell(inner))


async def send_welcome_email(to: str, name: str) -> dict:
    first = (name or "there").split()[0]
    inner = (
        '<div style="font-size:32px;margin-bottom:8px">🎉</div>'
        f'<h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">Welcome to Nerum, {first}!</h1>'
        '<p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 28px">'
        "You're all set to automate your business with AI workflows.</p>"
        f'<a href="{settings.FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 32px;'
        'background:linear-gradient(135deg,#FF6B00,#7B2FFF);color:#fff;text-decoration:none;'
        'border-radius:25px;font-size:14px;font-weight:700">Go to Dashboard →</a>'
    )
    return await send_email(to, f"Welcome to Nerum, {first}! 🚀", _shell(inner))


async def send_password_reset_email(to: str, name: str, reset_link: str) -> dict:
    first = (name or "there").split()[0]
    inner = (
        '<div style="font-size:40px;margin-bottom:12px">🔑</div>'
        f'<h2 style="color:#fff;margin:0 0 8px">Reset your password, {first}</h2>'
        '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 28px;line-height:1.6">'
        "Click below to set a new password. This link expires in 1 hour.</p>"
        f'<a href="{reset_link}" style="display:inline-block;padding:14px 32px;'
        'background:linear-gradient(135deg,#FF6B00,#7B2FFF);color:#fff;text-decoration:none;'
        'border-radius:25px;font-weight:700;font-size:14px">Reset Password →</a>'
    )
    return await send_email(to, "Reset your Nerum password", _shell(inner))
