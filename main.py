from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routes.workflow import router
from routes.gmail import router as gmail_router
from routes.sheets import router as sheets_router
from routes.auth import router as auth_router
from routes.telegram import router as telegram_router
from routes.whatsapp import router as whatsapp_router

app = FastAPI(title="Nerum", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/workflow")
app.include_router(gmail_router, prefix="/gmail")
app.include_router(sheets_router, prefix="/sheets")
app.include_router(auth_router, prefix="/auth")
app.include_router(telegram_router, prefix="/telegram")
app.include_router(whatsapp_router, prefix="/whatsapp")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")