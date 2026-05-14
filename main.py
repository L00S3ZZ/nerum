from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routes.workflow import router
from routes.gmail import router as gmail_router
from routes.ai_agent import router as ai_agent_router
from routes.sheets import router as sheets_router
from routes.auth import router as auth_router
from routes.telegram import router as telegram_router
from routes.whatsapp import router as whatsapp_router
from routes import payment
from routes.password_reset import router as reset_router
from routes import admin
from routes import forms
from routes import webhook
from routes import dashboard
from routes.chatbot import router as chatbot_router
from scheduler import start_scheduler
from security import check_content, sanitize_input, get_daily_limit
import os
import httpx
from jose import jwt, JWTError

SECRET_KEY = os.environ.get("SECRET_KEY", "nerum-secret-key-2026")
ALGORITHM = "HS256"

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="Nerum",
    version="0.1",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://nerum.in", "https://www.nerum.in", "https://nerum.onrender.com"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

# ✅ Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    return response

# ✅ Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."}
    )

# ✅ Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid input. Please check your data."}
    )

# ✅ Routers
app.include_router(router, prefix="/workflow")
app.include_router(ai_agent_router, prefix="/ai-agent")
app.include_router(gmail_router, prefix="/gmail")
app.include_router(sheets_router, prefix="/sheets")
app.include_router(auth_router, prefix="/auth")
app.include_router(telegram_router, prefix="/telegram")
app.include_router(whatsapp_router, prefix="/whatsapp")
app.include_router(payment.router, prefix="/payment")
app.include_router(reset_router, prefix="/auth")
app.include_router(admin.router, prefix="/admin")
app.include_router(forms.router, prefix="/forms")
app.include_router(webhook.router, prefix="/webhook")
app.include_router(dashboard.router, prefix="/dashboard")
app.include_router(chatbot_router, prefix="/chatbot")

app.mount("/static", StaticFiles(directory="static"), name="static")

# ✅ AI Chat endpoint — SECURED
@app.post("/neru/message")
@limiter.limit("20/minute")
async def ai_chat(request: Request, authorization: str = Header(None)):
    return JSONResponse(
        status_code=503,
        content={"error": "AI service temporarily unavailable. Please try again later."}
    )

@app.get("/")
def home():
    return FileResponse("static/index.html")

# ✅ Dashboard page — serves dashboard.html
@app.get("/dashboard")
def dashboard_page():
    return FileResponse("static/dashboard.html")

@app.get("/privacy")
def privacy():
    return FileResponse("static/privacy.html")

@app.get("/terms")
def terms():
    return FileResponse("static/terms.html")

# ✅ Admin page — heavily rate limited
@app.get("/admin-panel")
@limiter.limit("10/minute")
def admin_page(request: Request):
    return FileResponse("static/admin.html")

@app.on_event("startup")
async def startup_event():
    start_scheduler()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), )