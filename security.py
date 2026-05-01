from fastapi import APIRouter, Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
import re

# ===== CONTENT FILTER =====
SPAM_KEYWORDS = [
    # Scam/fraud
    'lottery', 'winner', 'prize', 'claim now', 'free money', 'bank account',
    'otp share', 'share otp', 'aadhar', 'pan card', 'credit card number',
    'cvv', 'pin number', 'password share', 'kyc update', 'kyc expire',
    # Illegal content
    'drugs', 'weapon', 'bomb', 'kill', 'murder', 'terrorist',
    # Adult
    'xxx', 'porn', 'nude', 'sex offer',
    # Political spam
    'vote for', 'elect', 'campaign',
]

BLOCKED_EMAIL_DOMAINS = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'sharklasers.com',
    'guerrillamailblock.com', 'trashmail.com', 'dispostable.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com',
    'maildrop.cc', 'spamgourmet.com', 'spamgourmet.net',
]

def check_content(message: str) -> bool:
    """Returns True if content is safe, False if spam/illegal"""
    if not message:
        return True
    msg_lower = message.lower()
    for keyword in SPAM_KEYWORDS:
        if keyword in msg_lower:
            return False
    return True

def is_blocked_email(email: str) -> bool:
    """Returns True if email domain is blocked"""
    if not email or '@' not in email:
        return False
    domain = email.split('@')[1].lower()
    return domain in BLOCKED_EMAIL_DOMAINS

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize and limit input length"""
    if not text:
        return ""
    # Remove null bytes
    text = text.replace('\x00', '')
    # Limit length
    text = text[:max_length]
    return text.strip()

def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    if not phone:
        return False
    # Remove spaces and dashes
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    # Must be 10-15 digits with optional + prefix
    pattern = r'^\+?[0-9]{10,15}$'
    return bool(re.match(pattern, phone))

# ===== DAILY LIMITS =====
DAILY_LIMITS = {
    "free":     {"whatsapp": 50,   "email": 50,   "telegram": 50,   "ai_requests": 20},
    "starter":  {"whatsapp": 500,  "email": 500,  "telegram": 500,  "ai_requests": 100},
    "pro":      {"whatsapp": 2000, "email": 2000, "telegram": 2000, "ai_requests": 500},
    "business": {"whatsapp": 9999, "email": 9999, "telegram": 9999, "ai_requests": 2000},
}

def get_daily_limit(plan: str, action: str) -> int:
    plan = (plan or "free").lower()
    limits = DAILY_LIMITS.get(plan, DAILY_LIMITS["free"])
    return limits.get(action, 50)