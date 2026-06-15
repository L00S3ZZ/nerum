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
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
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
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = (await db.scalars(select(User).where(User.email == email))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    return user


def token_limit_for(plan: str | None) -> int:
    return PLAN_TOKEN_LIMITS.get((plan or "free").lower(), 1000)


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
