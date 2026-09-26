import json
import os

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from app.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    SCOPES,
    TOKEN_FILE,
)


class NotAuthenticated(Exception):
    pass


def _client_config() -> dict:
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }


def build_flow() -> Flow:
    return Flow.from_client_config(
        _client_config(), scopes=SCOPES, redirect_uri=GOOGLE_REDIRECT_URI
    )


def get_auth_url() -> str:
    flow = build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline", include_granted_scopes="true", prompt="consent"
    )
    return auth_url


def exchange_code(code: str) -> None:
    flow = build_flow()
    flow.fetch_token(code=code)
    save_credentials(flow.credentials)


def save_credentials(creds: Credentials) -> None:
    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())


def is_authenticated() -> bool:
    return os.path.exists(TOKEN_FILE)


def get_credentials() -> Credentials:
    if not os.path.exists(TOKEN_FILE):
        raise NotAuthenticated()

    with open(TOKEN_FILE) as f:
        data = json.load(f)

    creds = Credentials(
        token=data.get("token"),
        refresh_token=data.get("refresh_token"),
        token_uri=data.get("token_uri"),
        client_id=data.get("client_id"),
        client_secret=data.get("client_secret"),
        scopes=data.get("scopes"),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        save_credentials(creds)

    return creds


def logout() -> None:
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
