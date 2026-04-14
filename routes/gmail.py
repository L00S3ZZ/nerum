from fastapi import APIRouter
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
from email.mime.text import MIMEText
import os

router = APIRouter()

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

def get_credentials_path(filename):
    secret_path = f"/etc/secrets/{filename}"
    if os.path.exists(secret_path):
        return secret_path
    return filename

def get_gmail_service():
    token_path = get_credentials_path("token.json")
    creds_path = get_credentials_path("credentials.json")
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        raise Exception("Gmail credentials not found or expired. Please re-authenticate.")
    return build("gmail", "v1", credentials=creds)

@router.post("/send")
def send_email(to: str, subject: str, body: str):
    service = get_gmail_service()
    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()
    return {"message": f"Email sent to {to}!"}