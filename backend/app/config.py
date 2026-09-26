import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
TOKEN_FILE = os.environ.get("TOKEN_FILE", "token.json")
DRIVE_FILENAME = os.environ.get("DRIVE_FILENAME", "shopping-list.json")

# drive.file: app can only see/manage files it creates or that the user opens with it.
SCOPES = ["https://www.googleapis.com/auth/drive.file"]
