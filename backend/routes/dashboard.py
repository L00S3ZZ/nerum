"""Dashboard stats + recent runs (real counts from the DB)."""
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_user, token_limit_for
from models.models import User, UserIntegration, Workflow, WorkflowRun

router = APIRouter()


@router.get("/stats")
async def stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    workflows = await db.scalar(select(func.count()).select_from(Workflow).where(Workflow.user_id == user.id)) or 0
    runs = await db.scalar(select(func.count()).select_from(WorkflowRun).where(WorkflowRun.user_id == user.id)) or 0
    successful = await db.scalar(
        select(func.count()).select_from(WorkflowRun).where(WorkflowRun.user_id == user.id, WorkflowRun.status == "success")
    ) or 0
    integrations = await db.scalar(
        select(func.count()).select_from(UserIntegration).where(
            UserIntegration.user_id == user.id,
            UserIntegration.is_active.is_(True),
            UserIntegration.integration_type.notlike("byok_%"),
        )
    ) or 0
    return {
        "workflows_run": int(runs),
        "messages_sent": int(successful),
        "integrations_connected": int(integrations),
        "tokens_used": user.tokens_used or 0,
        "token_limit": token_limit_for(user.plan),
        "workflows_total": int(workflows),
    }


@router.get("/recent-runs")
async def recent_runs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(WorkflowRun).where(WorkflowRun.user_id == user.id).order_by(desc(WorkflowRun.ran_at)).limit(5)
        )
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "workflow": r.workflow_name,
                "action": r.action,
                "status": r.status,
                "ran_at": r.ran_at.isoformat() if r.ran_at else None,
            }
            for r in rows
        ]
    }
