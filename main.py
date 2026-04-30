from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routes.workflow import router
from routes.gmail import router as gmail_router
from routes.sheets import router as sheets_router
from routes.auth import router as auth_router
from routes.telegram import router as telegram_router
from routes.whatsapp import router as whatsapp_router
from routes import payment
from routes.password_reset import router as reset_router
from routes import admin
from routes import forms
import os

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="Nerum",
    version="0.1",
    # ✅ Hide API docs in production
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ✅ CORS — only allow our domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://nerum.onrender.com"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

# ✅ Security headers middleware
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

# ✅ Hide internal errors from users
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the real error internally
    print(f"❌ Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."}
    )

# ✅ Clean validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid input. Please check your data."}
    )

# ✅ Routers
app.include_router(router, prefix="/workflow")
app.include_router(gmail_router, prefix="/gmail")
app.include_router(sheets_router, prefix="/sheets")
app.include_router(auth_router, prefix="/auth")
app.include_router(telegram_router, prefix="/telegram")
app.include_router(whatsapp_router, prefix="/whatsapp")
app.include_router(payment.router, prefix="/payment")
app.include_router(reset_router, prefix="/auth")
app.include_router(admin.router, prefix="/admin")
app.include_router(forms.router, prefix="/forms")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")

# ✅ Admin page — rate limited
@app.get("/admin-panel")
@limiter.limit("10/minute")
def admin_page(request: Request):
    return FileResponse("static/admin.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), use_reloader=False)