from fastapi import FastAPI
from routes.workflow import router

app = FastAPI(title="Nerum", version="0.1")

app.include_router(router, prefix="/workflow")

@app.get("/")
def home():
    return {"message": "Welcome to Nerum!", "version": "0.1"}