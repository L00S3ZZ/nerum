"""Google Sheets via a service account (no per-user OAuth / token.json).

Place the service-account JSON at backend/service-account.json (gitignored) and
share each target sheet with the service-account email. The Google client is
synchronous, so calls run in a worker thread.
"""
import asyncio
import os

from fastapi import HTTPException

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "service-account.json")


def _service():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise HTTPException(status_code=503, detail="Google Sheets not configured (service-account.json missing)")
    from google.oauth2.service_account import Credentials  # imported lazily
    from googleapiclient.discovery import build

    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def _append_sync(spreadsheet_id: str, range_name: str, values: list) -> dict:
    return (
        _service()
        .spreadsheets()
        .values()
        .append(spreadsheetId=spreadsheet_id, range=range_name, valueInputOption="USER_ENTERED", body={"values": values})
        .execute()
    )


def _read_sync(spreadsheet_id: str, range_name: str) -> list:
    res = _service().spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    return res.get("values", [])


async def append_to_sheet(spreadsheet_id: str, range_name: str, values: list) -> dict:
    try:
        return await asyncio.to_thread(_append_sync, spreadsheet_id, range_name, values)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Sheets error: {exc}")


async def read_sheet(spreadsheet_id: str, range_name: str) -> list:
    try:
        return await asyncio.to_thread(_read_sync, spreadsheet_id, range_name)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Sheets error: {exc}")
