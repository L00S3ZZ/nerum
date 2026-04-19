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

@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(req.password)
    user = User(name=req.name, email=req.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.email, "name": user.name})
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
    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=pwd_context.hash(os.urandom(32).hex())
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token({"sub": user.email, "name": user.name})
    return RedirectResponse(
        f"/?token={token}&name={name}"
    )