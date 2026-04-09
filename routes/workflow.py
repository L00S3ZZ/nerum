from fastapi import APIRouter

router = APIRouter()

workflows = []

@router.get("/all")
def get_all_workflows():
    return {"workflows": workflows}

@router.post("/create/{name}")
def create_workflow(name: str):
    workflows.append(name)
    return {"message": f"Workflow '{name}' created!", "total": len(workflows)}