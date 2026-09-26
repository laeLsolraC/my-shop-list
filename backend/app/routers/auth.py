from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from app.config import FRONTEND_URL
from app.google_auth import exchange_code, get_auth_url, is_authenticated, logout

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
def login():
    return RedirectResponse(get_auth_url())


@router.get("/callback")
def callback(code: str):
    exchange_code(code)
    return RedirectResponse(FRONTEND_URL)


@router.get("/status")
def status():
    return {"authenticated": is_authenticated()}


@router.post("/logout")
def logout_route():
    logout()
    return {"ok": True}
