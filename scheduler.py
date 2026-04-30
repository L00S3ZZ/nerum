from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from models.database import SessionLocal
from routes.dashboard import run_scheduled_lists
import logging

scheduler = AsyncIOScheduler()

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
    scheduler.start()
    print("✅ Scheduler started — checking lists every minute!")

def stop_scheduler():
    scheduler.shutdown()