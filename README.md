# My Shop List

A shopping-list web app. The list is stored as a JSON file in your Google
Drive instead of a database. See [CLAUDE.md](CLAUDE.md) for architecture
details and [PROGRESS.md](PROGRESS.md) for build status.

## Prerequisites

- Python 3.12+
- Node.js 20+
- A Google Cloud project with the Drive API enabled

## 1. Google Cloud setup (one-time)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or pick) a project.
2. Enable the **Google Drive API** for that project.
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth
   client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI: `http://localhost:8000/auth/callback`
4. Copy the generated **Client ID** and **Client secret**.
5. If prompted, configure the OAuth consent screen (External, test user =
   your own Google account is enough for local/personal use).

## 2. Backend setup

```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` and fill in:

```
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
```

Run the backend:

```
uvicorn app.main:app --reload
```

It starts on `http://localhost:8000`.

## 3. Frontend setup

```
cd frontend
npm install
npm run dev
```

It starts on `http://localhost:5173`.

## 4. First run

Open `http://localhost:5173`, click **Connect Google Drive**, sign in and
authorize. The app will create a `shopping-list.json` file in your Drive
the first time you add an item.
