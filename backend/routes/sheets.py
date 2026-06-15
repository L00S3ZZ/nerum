"""Google Sheets append/read via service account."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.security import get_current_user
from models.models import User
from services.sheets import append_to_sheet, read_sheet

router = APIRouter()


class AppendBody(BaseModel):
    spreadsheet_id: str
    range: str = "Sheet1!A:Z"
    values: list[str]


class ReadBody(BaseModel):
    spreadsheet_id: str
    range: str = "Sheet1!A:Z"


@router.post("/append")
async def append(body: AppendBody, _user: User = Depends(get_current_user)):
    return await append_to_sheet(body.spreadsheet_id, body.range, [body.values])


@router.post("/read")
async def read(body: ReadBody, _user: User = Depends(get_current_user)):
    return {"values": await read_sheet(body.spreadsheet_id, body.range)}
