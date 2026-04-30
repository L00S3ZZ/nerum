from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import SessionLocal, Workflow, User, WorkflowRun
from jose import jwt, JWTError
from datetime import datetime
import os
import json

router = APIRouter()

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"
TOKENS_PER_RUN = 10

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
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    trigger: str = ""
    action: str = ""
    config: dict = {}

class WorkflowUpdate(BaseModel):
    name: str = None
    description: str = None
    trigger: str = None
    action: str = None
    config: dict = None
    is_active: bool = None

# ─── CREATE WORKFLOW ───────────────────────────────────────────────────────────
@router.post("/create")
def create_workflow(req: WorkflowCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan_limits = {"free": 3, "starter": 10, "pro": 50, "business": 999999}
    limit = plan_limits.get(user.plan.lower(), 3)
    current_count = db.query(Workflow).filter(Workflow.user_id == user.id).count()
    if current_count >= limit:
        raise HTTPException(status_code=403, detail=f"Workflow limit reached for {user.plan} plan. Upgrade to create more.")

    workflow = Workflow(
        user_id=user.id,
        name=req.name,
        description=req.description,
        trigger=req.trigger,
        action=req.action,
        config=json.dumps(req.config),
        is_active=True,
        runs=0,
        created_at=datetime.utcnow()
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "trigger": workflow.trigger,
        "action": workflow.action,
        "config": json.loads(workflow.config),
        "is_active": workflow.is_active,
        "runs": workflow.runs,
        "created_at": workflow.created_at.isoformat()
    }

# ─── LIST WORKFLOWS ────────────────────────────────────────────────────────────
@router.get("/list")
def list_workflows(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflows = db.query(Workflow).filter(Workflow.user_id == user.id).order_by(Workflow.created_at.desc()).all()
    return {
        "workflows": [
            {
                "id": w.id,
                "name": w.name,
                "description": w.description,
                "trigger": w.trigger,
                "action": w.action,
                "config": json.loads(w.config) if w.config else {},
                "is_active": w.is_active,
                "runs": w.runs,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "last_run": w.last_run.isoformat() if w.last_run else None
            }
            for w in workflows
        ],
        "total": len(workflows),
        "tokens_used": user.tokens_used,
        "token_limit": user.token_limit,
        "tokens_remaining": max(0, user.token_limit - user.tokens_used)
    }

# ─── GET SINGLE WORKFLOW ───────────────────────────────────────────────────────
@router.get("/{workflow_id}")
def get_workflow(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.user_id == user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "trigger": workflow.trigger,
        "action": workflow.action,
        "config": json.loads(workflow.config) if workflow.config else {},
        "is_active": workflow.is_active,
        "runs": workflow.runs,
        "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
        "last_run": workflow.last_run.isoformat() if workflow.last_run else None
    }

# ─── UPDATE WORKFLOW ───────────────────────────────────────────────────────────
@router.put("/{workflow_id}")
def update_workflow(workflow_id: int, req: WorkflowUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.user_id == user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if req.name is not None: workflow.name = req.name
    if req.description is not None: workflow.description = req.description
    if req.trigger is not None: workflow.trigger = req.trigger
    if req.action is not None: workflow.action = req.action
    if req.config is not None: workflow.config = json.dumps(req.config)
    if req.is_active is not None: workflow.is_active = req.is_active
    db.commit()
    db.refresh(workflow)
    return {"message": "Workflow updated", "id": workflow.id}

# ─── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────
@router.post("/{workflow_id}/toggle")
def toggle_workflow(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.user_id == user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    workflow.is_active = not workflow.is_active
    db.commit()
    return {"message": "Toggled", "is_active": workflow.is_active}

# ─── DELETE WORKFLOW ───────────────────────────────────────────────────────────
@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.user_id == user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(workflow)
    db.commit()
    return {"message": "Workflow deleted"}

# ─── DELETE ALL WORKFLOWS ──────────────────────────────────────────────────────
@router.delete("/all/delete")
def delete_all_workflows(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Workflow).filter(Workflow.user_id == user.id).delete()
    db.commit()
    return {"message": "All workflows deleted"}

# ─── RUN WORKFLOW ──────────────────────────────────────────────────────────────
@router.post("/{workflow_id}/run")
def run_workflow(workflow_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.user_id == user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not workflow.is_active:
        raise HTTPException(status_code=400, detail="Workflow is not active")

    tokens_remaining = user.token_limit - user.tokens_used
    if tokens_remaining <= 0:
        raise HTTPException(status_code=403, detail=f"Token limit reached. Upgrade your plan.")
    if tokens_remaining < TOKENS_PER_RUN:
        raise HTTPException(status_code=403, detail=f"Not enough tokens. {tokens_remaining} left but need {TOKENS_PER_RUN}.")

    # ✅ Deduct tokens
    user.tokens_used += TOKENS_PER_RUN
    workflow.runs += 1
    workflow.last_run = datetime.utcnow()

    # ✅ Save run history
    run = WorkflowRun(
        user_id=user.id,
        workflow_id=workflow.id,
        workflow_name=workflow.name,
        action=workflow.action or "manual",
        status="success",
        details=f"Manually triggered by user",
        ran_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

    return {
        "message": f"Workflow '{workflow.name}' executed successfully",
        "runs": workflow.runs,
        "last_run": workflow.last_run.isoformat(),
        "tokens_used": user.tokens_used,
        "tokens_remaining": user.token_limit - user.tokens_used
    }

# ─── GET HISTORY ───────────────────────────────────────────────────────────────
@router.get("/history/list")
def get_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    runs = db.query(WorkflowRun).filter(
        WorkflowRun.user_id == user.id
    ).order_by(WorkflowRun.ran_at.desc()).limit(50).all()

    return {
        "history": [
            {
                "id": r.id,
                "workflow_name": r.workflow_name,
                "action": r.action,
                "status": r.status,
                "details": r.details,
                "ran_at": r.ran_at.isoformat() if r.ran_at else None
            }
            for r in runs
        ]
    }