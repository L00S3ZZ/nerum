from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db, User
from routes.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/accept")
def accept_terms(current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    user = db.query(User).filter_by(id=current_user.id).first()
    user.terms_accepted = True
    user.terms_accepted_at = datetime.utcnow()
    user.terms_version = "1.0"
    db.commit()
    return {"status": "accepted"}
