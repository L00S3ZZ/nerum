"""APScheduler that actually executes due schedule-triggered workflows."""
import json
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.models import User, Workflow, WorkflowRun

scheduler = AsyncIOScheduler()


def _cron_field_matches(field: str, value: int) -> bool:
    field = field.strip()
    if field == "*":
        return True
    if field.startswith("*/"):
        try:
            return value % int(field[2:]) == 0
        except ValueError:
            return False
    for part in field.split(","):
        try:
            if int(part) == value:
                return True
        except ValueError:
            continue
    return False


def cron_is_due(cron: str, now: datetime) -> bool:
    """Minimal 5-field cron matcher: minute hour day-of-month month day-of-week."""
    parts = cron.split()
    if len(parts) != 5:
        return False
    minute, hour, dom, mon, dow = parts
    return (
        _cron_field_matches(minute, now.minute)
        and _cron_field_matches(hour, now.hour)
        and _cron_field_matches(dom, now.day)
        and _cron_field_matches(mon, now.month)
        and _cron_field_matches(dow, now.weekday())  # 0=Mon
    )


async def run_scheduled_workflows() -> None:
    from routes.integrations import get_user_byok  # avoid circular import at module load
    from services.workflow_executor import WorkflowExecutor

    now = datetime.utcnow()
    async with AsyncSessionLocal() as db:
        workflows = (await db.scalars(select(Workflow).where(Workflow.is_active.is_(True)))).all()
        for w in workflows:
            try:
                cfg = json.loads(w.config or "{}")
            except Exception:
                continue
            trigger = next((n for n in cfg.get("nodes", []) if (n.get("subtype") or n.get("type")) == "schedule"), None)
            if not trigger:
                continue
            cron = (trigger.get("config", {}) or {}).get("cron", "")
            if not cron or not cron_is_due(cron, now):
                continue
            user = await db.get(User, w.user_id)
            if not user:
                continue
            byok = await get_user_byok(db, user.id)
            run = WorkflowRun(user_id=user.id, workflow_id=w.id, workflow_name=w.name, action="scheduled", status="running", ran_at=now)
            db.add(run)
            try:
                results = await WorkflowExecutor(byok).run_graph(cfg, {"scheduled": True})
                run.status = "success"
                run.details = json.dumps(results, default=str)[:8000]
            except Exception as exc:
                run.status = "failed"
                run.details = str(exc)[:8000]
            w.runs = (w.runs or 0) + 1
            w.last_run = now
            await db.commit()


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(run_scheduled_workflows, "interval", minutes=1, id="scheduled_workflows", replace_existing=True)
        scheduler.start()
