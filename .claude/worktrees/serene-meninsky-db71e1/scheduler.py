from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from models.database import SessionLocal, Workflow, User, DashboardRecord
from routes.dashboard import run_scheduled_lists
from datetime import date, datetime, timedelta
import json
import logging

scheduler = AsyncIOScheduler()

# ── Phase 1 trigger system constants ────────────────────────────────────────
IST = "Asia/Kolkata"

# Hardcoded major Indian public holidays 2025–2026 (YYYY-MM-DD).
# Used by `skip_indian_holidays` flag on schedule-family triggers.
INDIAN_HOLIDAYS_2025_2026 = {
    # 2025
    "2025-01-26",  # Republic Day
    "2025-03-14",  # Holi
    "2025-03-31",  # Eid al-Fitr (approx)
    "2025-04-18",  # Good Friday
    "2025-08-15",  # Independence Day
    "2025-08-27",  # Ganesh Chaturthi
    "2025-10-02",  # Gandhi Jayanti
    "2025-10-20",  # Diwali (approx)
    "2025-10-21",  # Diwali day 2
    "2025-12-25",  # Christmas
    # 2026
    "2026-01-26",  # Republic Day
    "2026-03-03",  # Holi
    "2026-03-20",  # Eid al-Fitr (approx)
    "2026-04-03",  # Good Friday
    "2026-08-15",  # Independence Day
    "2026-09-15",  # Ganesh Chaturthi (approx)
    "2026-10-02",  # Gandhi Jayanti
    "2026-11-08",  # Diwali (approx)
    "2026-11-09",  # Diwali day 2
    "2026-12-25",  # Christmas
}


def is_indian_holiday(d=None) -> bool:
    if d is None:
        d = date.today()
    return d.strftime("%Y-%m-%d") in INDIAN_HOLIDAYS_2025_2026


async def execute_workflow_async(workflow_id: int):
    """Generic scheduled-trigger entrypoint.

    Loads the workflow, honours `skip_indian_holidays`, increments `runs`,
    sets `last_run`. The actual action dispatch is left to the existing
    runtime — this function is the scheduler-side hook only.
    """
    db = SessionLocal()
    try:
        wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not wf or not wf.is_active:
            return
        try:
            cfg = json.loads(wf.config) if wf.config else {}
        except Exception:
            cfg = {}
        trigger_cfg = cfg.get("trigger_config", {})
        if trigger_cfg.get("skip_indian_holidays") and is_indian_holiday():
            print(f"⏭️  Skipping workflow {workflow_id} — Indian holiday")
            return
        wf.runs = (wf.runs or 0) + 1
        wf.last_run = datetime.utcnow()
        db.commit()
        print(f"⏰ Scheduled trigger fired for workflow {workflow_id} ({wf.trigger})")
    except Exception as e:
        print(f"❌ execute_workflow_async error for {workflow_id}: {e}")
    finally:
        db.close()


def register_trigger_job(workflow_id: int, trigger_type: str, cfg: dict):
    """Register an APScheduler job for a schedule-family trigger.

    Called from `routes/workflow_triggers.py` after creating the workflow row.
    Idempotent — `replace_existing=True` on the workflow-scoped job id.
    """
    job_id = f"wf_{workflow_id}"
    if trigger_type == "every_x_minutes":
        scheduler.add_job(
            execute_workflow_async,
            IntervalTrigger(minutes=int(cfg["interval"])),
            args=[workflow_id], id=job_id, replace_existing=True,
        )
    elif trigger_type == "every_x_hours":
        scheduler.add_job(
            execute_workflow_async,
            IntervalTrigger(hours=int(cfg["interval"])),
            args=[workflow_id], id=job_id, replace_existing=True,
        )
    elif trigger_type == "daily":
        h, m = cfg["time"].split(":")
        scheduler.add_job(
            execute_workflow_async,
            CronTrigger(hour=int(h), minute=int(m), timezone=cfg.get("timezone") or IST),
            args=[workflow_id], id=job_id, replace_existing=True,
        )
    elif trigger_type == "weekly":
        h, m = cfg["time"].split(":")
        scheduler.add_job(
            execute_workflow_async,
            CronTrigger(day_of_week=cfg["day"][:3], hour=int(h), minute=int(m), timezone=IST),
            args=[workflow_id], id=job_id, replace_existing=True,
        )
    elif trigger_type == "monthly":
        h, m = cfg["time"].split(":")
        scheduler.add_job(
            execute_workflow_async,
            CronTrigger(day=int(cfg["date"]), hour=int(h), minute=int(m), timezone=IST),
            args=[workflow_id], id=job_id, replace_existing=True,
        )
    elif trigger_type == "custom_cron":
        scheduler.add_job(
            execute_workflow_async,
            CronTrigger.from_crontab(cfg["expression"], timezone=IST),
            args=[workflow_id], id=job_id, replace_existing=True,
        )
    else:
        return False
    print(f"✅ Registered trigger job {job_id} ({trigger_type})")
    return True


def unregister_trigger_job(workflow_id: int):
    try:
        scheduler.remove_job(f"wf_{workflow_id}")
    except Exception:
        pass


# ── Daily smart-list checkers ───────────────────────────────────────────────

def _date_matches_days_before(target_str, days_before: int) -> bool:
    """True if today + days_before lands on the month/day of `target_str`.

    `target_str` may be a full ISO date (YYYY-MM-DD) or month-day (MM-DD).
    Birthday/anniversary are recurring — only month/day match.
    """
    if not target_str:
        return False
    target_str = str(target_str).strip()
    parts = target_str.split("-")
    try:
        if len(parts) == 3:
            mm, dd = int(parts[1]), int(parts[2])
        elif len(parts) == 2:
            mm, dd = int(parts[0]), int(parts[1])
        else:
            return False
    except ValueError:
        return False
    when = date.today() + timedelta(days=int(days_before or 0))
    return when.month == mm and when.day == dd


def _run_smartlist_field_checker(field_key: str):
    """Shared body for birthday/anniversary checkers."""
    db = SessionLocal()
    try:
        workflows = db.query(Workflow).filter(
            Workflow.trigger == f"smartlist_{field_key}",
            Workflow.is_active == True,  # noqa: E712
        ).all()
        for wf in workflows:
            try:
                cfg = json.loads(wf.config) if wf.config else {}
                tcfg = cfg.get("trigger_config", {})
                list_id = tcfg.get("list_id")
                days_before = int(tcfg.get("days_before", 0) or 0)
                if not list_id:
                    continue
                records = db.query(DashboardRecord).filter(DashboardRecord.list_id == int(list_id)).all()
                for rec in records:
                    try:
                        fields = json.loads(rec.fields) if rec.fields else {}
                    except Exception:
                        fields = {}
                    if _date_matches_days_before(fields.get(field_key), days_before):
                        wf.runs = (wf.runs or 0) + 1
                        wf.last_run = datetime.utcnow()
                        print(f"🎉 smartlist_{field_key} matched record {rec.id} for workflow {wf.id}")
                db.commit()
            except Exception as e:
                print(f"❌ smartlist_{field_key} checker error wf={wf.id}: {e}")
    finally:
        db.close()


def run_birthday_checker():
    _run_smartlist_field_checker("birthday")


def run_anniversary_checker():
    _run_smartlist_field_checker("anniversary")


def run_overdue_checker():
    db = SessionLocal()
    try:
        workflows = db.query(Workflow).filter(
            Workflow.trigger == "smartlist_overdue",
            Workflow.is_active == True,  # noqa: E712
        ).all()
        today = date.today()
        for wf in workflows:
            try:
                cfg = json.loads(wf.config) if wf.config else {}
                tcfg = cfg.get("trigger_config", {})
                list_id = tcfg.get("list_id")
                field = tcfg.get("field", "due_date")
                days_overdue = int(tcfg.get("days_overdue", 1) or 1)
                if not list_id:
                    continue
                records = db.query(DashboardRecord).filter(DashboardRecord.list_id == int(list_id)).all()
                for rec in records:
                    try:
                        fields = json.loads(rec.fields) if rec.fields else {}
                    except Exception:
                        fields = {}
                    raw = fields.get(field)
                    if not raw:
                        continue
                    try:
                        due = datetime.strptime(str(raw)[:10], "%Y-%m-%d").date()
                    except ValueError:
                        continue
                    if (today - due).days >= days_overdue and (rec.status or "").lower() != "done":
                        wf.runs = (wf.runs or 0) + 1
                        wf.last_run = datetime.utcnow()
                        print(f"⌛ smartlist_overdue matched record {rec.id} for workflow {wf.id}")
                db.commit()
            except Exception as e:
                print(f"❌ smartlist_overdue checker error wf={wf.id}: {e}")
    finally:
        db.close()


def run_token_threshold_checker():
    db = SessionLocal()
    try:
        workflows = db.query(Workflow).filter(
            Workflow.trigger == "token_threshold",
            Workflow.is_active == True,  # noqa: E712
        ).all()
        for wf in workflows:
            try:
                cfg = json.loads(wf.config) if wf.config else {}
                tcfg = cfg.get("trigger_config", {})
                threshold = int(tcfg.get("threshold", 0) or 0)
                user = db.query(User).filter(User.id == wf.user_id).first()
                if not user:
                    continue
                remaining = max(0, (user.token_limit or 0) - (user.tokens_used or 0))
                if remaining < threshold:
                    wf.runs = (wf.runs or 0) + 1
                    wf.last_run = datetime.utcnow()
                    print(f"◈ token_threshold fired for workflow {wf.id} (remaining={remaining} < {threshold})")
            except Exception as e:
                print(f"❌ token_threshold checker error wf={wf.id}: {e}")
        db.commit()
    finally:
        db.close()


async def scheduled_job():
    db = SessionLocal()
    try:
        await run_scheduled_lists(db)
    except Exception as e:
        print(f"❌ Scheduler error: {e}")
    finally:
        db.close()

def start_scheduler():
    # Run every minute — checks if any list is scheduled for this time
    scheduler.add_job(
        scheduled_job,
        CronTrigger(minute="*"),  # Every minute
        id="check_lists",
        replace_existing=True
    )

    # ── Phase 1 fixed-cadence checkers ───────────────────────────────────
    scheduler.add_job(
        run_birthday_checker,
        CronTrigger(hour=8, minute=0, timezone=IST),
        id="smartlist_birthday", replace_existing=True,
    )
    scheduler.add_job(
        run_anniversary_checker,
        CronTrigger(hour=8, minute=5, timezone=IST),
        id="smartlist_anniversary", replace_existing=True,
    )
    scheduler.add_job(
        run_overdue_checker,
        CronTrigger(hour=9, minute=0, timezone=IST),
        id="smartlist_overdue", replace_existing=True,
    )
    scheduler.add_job(
        run_token_threshold_checker,
        IntervalTrigger(minutes=30),
        id="token_threshold", replace_existing=True,
    )

    scheduler.start()
    print("✅ Scheduler started — check_lists 1min, birthday/anniversary 08:00 IST, overdue 09:00 IST, token_threshold 30min")

def stop_scheduler():
    scheduler.shutdown()