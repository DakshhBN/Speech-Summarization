# Audio Notes Platform

Upload an audio file (2+ minutes), get back a transcript (Gnani ASR) and an LLM
summary. Past uploads are listed and can be reopened. See `/architecture` in the
running app for a full writeup of the design.

- **Live app:** _add deployed URL here after deploying_
- **Architecture writeup:** `<deployed-url>/architecture`

## Stack

- Backend: FastAPI, async SQLAlchemy + Alembic, Postgres (Supabase)
- Storage: Supabase Storage (raw audio files, signed URLs for playback)
- ASR: Gnani Batch STT (create/start/poll/fetch job lifecycle — sync STT caps at 60s so it can't be used here)
- Summarization: Groq-hosted LLM via `langchain-groq`, one-shot call
- Frontend: React + Vite + TypeScript + Tailwind
- Deploy: Render (`render.yaml` blueprint — one web service, one static site)

## Running locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # fill in DATABASE_URL, SUPABASE_*, GNANI_API_KEY, GROQ_API_KEY
alembic upgrade head
python run.py
```

Backend runs on `http://localhost:8000` (`/docs` for the OpenAPI UI).

Windows note: run via `python run.py`, not a bare `uvicorn` CLI call — `run.py`
sets the selector event loop policy that psycopg's async driver needs on Windows.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env   # VITE_API_URL=http://localhost:8000
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Deployment

Push to GitHub, connect the repo on Render, and it'll pick up `render.yaml` as a
Blueprint (one web service for the API, one static site for the frontend). Fill
in the secret env vars listed in `render.yaml` (Supabase creds, Gnani key, Groq
key, and `CORS_ORIGINS_RAW`/`VITE_API_URL` once you know each service's URL).

Free-tier services on Render spin down after 15 minutes idle, so the first
request after a while can take 30-60s to wake up.

## Known limitations

No auth — it's a single shared notes list. Background jobs run in-process
(no dedicated worker/queue). Both are deliberate scope cuts explained, along
with what I'd improve given more time, on the `/architecture` page.
