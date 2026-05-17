from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from models.database import User
from routes.auth import get_current_user, get_db

router = APIRouter()


class AcceptBody(BaseModel):
    version: str = "v1.0"


@router.post("/accept")
def accept_terms(
    body: AcceptBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.terms_accepted = True
    user.terms_accepted_at = datetime.utcnow()
    user.terms_version = body.version or "v1.0"
    db.commit()
    return {
        "success": True,
        "terms_accepted": True,
        "terms_version": user.terms_version,
        "terms_accepted_at": user.terms_accepted_at.isoformat(),
    }
