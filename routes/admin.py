from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from models.database import SessionLocal, User, Workflow
from jose import jwt, JWTError
import os
import json

router = APIRouter()

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "nerum-admin-2026")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login")
def admin_login(data: dict):
    secret = data.get("secret", "")
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin secret")
    token = jwt.encode({"role": "admin", "sub": "admin"}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

@router.get("/stats")
def get_stats(admin=Depends(verify_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_workflows = db.query(Workflow).count()
    active_workflows = db.query(Workflow).filter(Workflow.is_active == True).count()
    
    # Plan breakdown
    free_users = db.query(User).filter(User.plan == "free").count()
    starter_users = db.query(User).filter(User.plan == "starter").count()
    pro_users = db.query(User).filter(User.plan == "pro").count()
    business_users = db.query(User).filter(User.plan == "business").count()

    # Revenue estimate
    revenue = (starter_users * 799) + (pro_users * 1399) + (business_users * 3499)

    # Recent signups (last 5)
    recent_users = db.query(User).order_by(User.id.desc()).limit(5).all()

    return {
        "total_users": total_users,
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "revenue_estimate": revenue,
        "plans": {
            "free": free_users,
            "starter": starter_users,
            "pro": pro_users,
            "business": business_users
        },
        "recent_signups": [
            {
                "name": u.name,
                "email": u.email,
                "plan": u.plan,
                "tokens_used": u.tokens_used,
                "token_limit": u.token_limit
            }
            for u in recent_users
        ]
    }

@router.get("/users")
def get_users(admin=Depends(verify_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id.desc()).all()
    return {
        "users": [
            {
                "name": u.name,
                "email": u.email,
                "plan": u.plan,
                "tokens_used": u.tokens_used,
                "token_limit": u.token_limit,
                "workflow_count": db.query(Workflow).filter(Workflow.user_id == u.id).count()
            }
            for u in users
        ]
    }

@router.get("/user-workflows")
def get_user_workflows(email: str, admin=Depends(verify_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    workflows = db.query(Workflow).filter(Workflow.user_id == user.id).all()
    return {
        "user": {
            "name": user.name,
            "email": user.email,
            "plan": user.plan,
            "tokens_used": user.tokens_used,
            "token_limit": user.token_limit
        },
        "workflows": [
            {
                "name": w.name,
                "description": w.description,
                "is_active": w.is_active,
                "runs": w.runs,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "last_run": w.last_run.isoformat() if w.last_run else None
            }
            for w in workflows
        ]
    }