from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
import os
from routes import admin

# Rate limiter — 200 requests per minute per IP globally
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="Nerum", version="0.1")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://nerum.onrender.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/workflow")
app.include_router(gmail_router, prefix="/gmail")
app.include_router(sheets_router, prefix="/sheets")
app.include_router(auth_router, prefix="/auth")
app.include_router(telegram_router, prefix="/telegram")
app.include_router(whatsapp_router, prefix="/whatsapp")
app.include_router(payment.router, prefix="/payment")
app.include_router(reset_router, prefix="/auth")
app.include_router(admin.router, prefix="/admin")


app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))

@app.get("/admin")
def admin_page():
    from fastapi.responses import FileResponse
    return FileResponse("static/admin.html")