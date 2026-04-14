from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.workflow import router

app = FastAPI(title="Nerum", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/workflow")

from routes.gmail import router as gmail_router
app.include_router(gmail_router, prefix="/gmail")

@app.get("/")
def home():
    return {"message": "Welcome to Nerum!", "version": "0.1"}