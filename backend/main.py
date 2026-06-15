"""Nerum V2 API — FastAPI entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from core.scheduler import scheduler, start_scheduler
from routes import (
    agent,
    auth,
    dashboard,
    gmail,
    integrations,
    payment,
    sheets,
    telegram,
    webhook,
    whatsapp,
    workflow,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()          # crashes loudly if the DB is unreachable — no fallback
    start_scheduler()
    print("✅ Nerum backend started — database connected, scheduler running")
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Nerum API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL,
        "https://nerum.in",
        "https://www.nerum.in",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
async def health():
    return {"status": "ok", "service": "Nerum API", "version": "2.0.0"}


app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(workflow.router, prefix="/workflows", tags=["Workflows"])
app.include_router(agent.router, prefix="/agent", tags=["Agent"])
app.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
app.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])
app.include_router(gmail.router, prefix="/email", tags=["Email"])
app.include_router(telegram.router, prefix="/telegram", tags=["Telegram"])
app.include_router(sheets.router, prefix="/sheets", tags=["Sheets"])
app.include_router(payment.router, prefix="/payments", tags=["Payments"])
app.include_router(webhook.router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
