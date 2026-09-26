from fastapi import HTTPException
from googleapiclient.discovery import build

from app.google_auth import NotAuthenticated, get_credentials


def get_drive_service():
    try:
        creds = get_credentials()
    except NotAuthenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return build("drive", "v3", credentials=creds)
