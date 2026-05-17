from fastapi import APIRouter
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/spreadsheets"
]

def get_credentials_path(filename):
    secret_path = f"/etc/secrets/{filename}"
    if os.path.exists(secret_path):
        return secret_path
    return filename

def get_sheets_service():
    token_path = get_credentials_path("token.json")
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        raise Exception("Sheets credentials not found or expired. Please re-authenticate.")
    return build("sheets", "v4", credentials=creds)

@router.post("/append")
def append_to_sheet(spreadsheet_id: str, row_data: str):
    service = get_sheets_service()
    values = [[row_data]]
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range="Sheet1!A1",
        valueInputOption="RAW",
        body={"values": values}
    ).execute()
    return {"message": f"Data added to sheet!"}