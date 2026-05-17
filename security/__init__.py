from fastapi import APIRouter, Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
import re

# ===== CONTENT FILTER =====
SPAM_KEYWORDS = [
    'lottery', 'winner', 'prize', 'claim now', 'free money', 'bank account',
    'otp share', 'share otp', 'aadhar', 'pan card', 'credit card number',
    'cvv', 'pin number', 'password share', 'kyc update', 'kyc expire',
    'drugs', 'weapon', 'bomb', 'kill', 'murder', 'terrorist',
    'xxx', 'porn', 'nude', 'sex offer',
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
    if not message:
        return True
    msg_lower = message.lower()
    for keyword in SPAM_KEYWORDS:
        if keyword in msg_lower:
            return False
    return True

def is_blocked_email(email: str) -> bool:
    if not email or '@' not in email:
        return False
    domain = email.split('@')[1].lower()
    return domain in BLOCKED_EMAIL_DOMAINS

def sanitize_input(text: str, max_length: int = 1000) -> str:
    if not text:
        return ""
    text = text.replace('\x00', '')
    text = text[:max_length]
    return text.strip()

def validate_phone(phone: str) -> bool:
    if not phone:
        return False
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    pattern = r'^\+?[0-9]{10,15}$'
    return bool(re.match(pattern, phone))

# ===== DAILY MESSAGE LIMITS =====
DAILY_LIMITS = {
    "free":     {"whatsapp": 50,   "email": 50,   "telegram": 50,   "ai_requests": 20},
    "starter":  {"whatsapp": 200,  "email": 200,  "telegram": 200,  "ai_requests": 50},
    "pro":      {"whatsapp": 500,  "email": 500,  "telegram": 500,  "ai_requests": 100},
    "business": {"whatsapp": 9999, "email": 9999, "telegram": 9999, "ai_requests": 500},
}

def get_daily_limit(plan: str, action: str) -> int:
    plan = (plan or "free").lower()
    limits = DAILY_LIMITS.get(plan, DAILY_LIMITS["free"])
    return limits.get(action, 50)

# ===== TOKEN LIMITS — ALL 1000 FOR TESTING =====
PLAN_TOKENS = {
    "free":     1000,
    "starter":  1000,
    "pro":      1000,
    "business": 1000,
}

# ===== PLAN LIMITS =====
PLAN_WORKFLOWS = {
    "free":     3,
    "starter":  10,
    "pro":      50,
    "business": 999999,
}

PLAN_LISTS = {
    "free":     1,
    "starter":  5,
    "pro":      20,
    "business": 999999,
}

PLAN_LIST_ROWS = {
    "free":     10,
    "starter":  100,
    "pro":      1000,
    "business": 999999,
}

# ===== TOKEN COST PER ACTION =====
TOKEN_COSTS = {
    "workflow_run":   10,
    "whatsapp":        5,
    "email":           3,
    "telegram":        2,
    "sheets":          2,
    "webhook":         5,
    "smart_list_msg":  3,
    "ai_chat":        15,
}

def get_token_limit(plan: str) -> int:
    return PLAN_TOKENS.get((plan or "free").lower(), 1000)

def get_workflow_limit(plan: str) -> int:
    return PLAN_WORKFLOWS.get((plan or "free").lower(), 3)

def get_list_limit(plan: str) -> int:
    return PLAN_LISTS.get((plan or "free").lower(), 1)

def get_list_row_limit(plan: str) -> int:
    return PLAN_LIST_ROWS.get((plan or "free").lower(), 10)

def get_token_cost(action: str) -> int:
    return TOKEN_COSTS.get(action, 5)

def check_tokens(user, action: str) -> tuple:
    """Returns (can_proceed, tokens_needed, tokens_remaining)"""
    cost = get_token_cost(action)
    limit = get_token_limit(user.plan)
    used = user.tokens_used or 0
    remaining = limit - used
    can_proceed = remaining >= cost
    return can_proceed, cost, remaining

def deduct_tokens(user, action: str, db) -> bool:
    """Deducts tokens. Returns True if successful."""
    can_proceed, cost, remaining = check_tokens(user, action)
    if not can_proceed:
        return False
    user.tokens_used = (user.tokens_used or 0) + cost
    db.commit()
    return True

def token_error_message(action: str, remaining: int, cost: int) -> str:
    return (
        f"Token limit reached! You need {cost} tokens for this action "
        f"but only have {remaining} remaining. "
        f"Upgrade your plan at nerum.in to continue."
    )

from security.encryption import encrypt_data, decrypt_data
