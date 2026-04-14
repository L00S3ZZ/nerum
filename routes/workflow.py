from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import SessionLocal, Workflow

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/all")
def get_all_workflows(db: Session = Depends(get_db)):
    workflows = db.query(Workflow).all()
    return {"workflows": [{"id": w.id, "name": w.name, "status": w.status} for w in workflows]}

@router.post("/create/{name}")
def create_workflow(name: str, db: Session = Depends(get_db)):
    workflow = Workflow(name=name)
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return {"message": f"Workflow '{name}' created!", "id": workflow.id}