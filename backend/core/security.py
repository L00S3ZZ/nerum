"""Password hashing + JWT + the auth dependency.

JWT `sub` is the user's EMAIL (matches the V1-issued tokens and lets us look up
by the indexed email column). bcrypt via passlib matches V1 password hashes, so
existing users can still log in.
"""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from models.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=True)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

PLAN_TOKEN_LIMITS = {"free": 1000, "starter": 1000, "pro": 1000, "business": 1000}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return pwd_context.verify(plain, hashed)


def create_access_token(email: str, name: str = "") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "name": name,
        "iat": now,
        "exp": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Resolve the bearer token to a User.

    H3: this uses its OWN short-lived session rather than `Depends(get_db)`. A
    FastAPI-cached `get_db` session would stay checked out of the pool for the
    full request (and the entire SSE stream on /agent/run), pinning a connection
    across run_graph. Here the connection is returned to the pool the moment the
    SELECT completes. The returned `User` is therefore DETACHED — routes that
    MUTATE it must re-fetch by id inside their own write session (see
    routes/workflow.py `_execute` and routes/payment.py `verify_payment`);
    read-only access to its already-loaded columns is fine.
    """
    payload = decode_token(credentials.credentials)
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    async with AsyncSessionLocal() as db:
        user = (await db.scalars(select(User).where(User.email == email))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    return user


def token_limit_for(plan: str | None) -> int:
    return PLAN_TOKEN_LIMITS.get((plan or "free").lower(), 1000)


async def check_quota(user: User) -> None:
    """Raise 429 if the user has hit their plan's token limit.

    Call this BEFORE starting any workflow/agent execution so an over-quota user
    can't trigger unlimited WhatsApp sends / emails / AI calls. tokens_used and
    token_limit are already surfaced to the user via /auth/me (user_to_dict), so
    including the exact numbers in the 429 detail leaks nothing new.
    """
    used = user.tokens_used or 0
    limit = token_limit_for(user.plan)
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Token limit reached ({used}/{limit}) for your {user.plan or 'free'} plan. Upgrade or wait for reset.",
        )


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "plan": user.plan or "free",
        "tokens_used": user.tokens_used or 0,
        "token_limit": token_limit_for(user.plan),
        "two_fa_enabled": bool(user.two_fa_enabled),
        "is_verified": bool(user.is_verified),
        "avatar_url": user.avatar_url,
    }
