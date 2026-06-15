# ⚡ Nerum V2 — Automation for Bharat

> India ka Zapier. AI-powered workflow automation for Indian SMBs — clinics, schools, restaurants, shops, gyms, real estate.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, Zustand |
| Backend | FastAPI, async SQLAlchemy + asyncpg, PostgreSQL |
| AI | Commander: Claude Sonnet (Nerum key) · Soldiers: user BYOK (Claude / GPT / Groq / Gemini) |
| Infra | Docker Compose, Nginx, SSE streaming |

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # fill in values
uvicorn main:app --reload
```

Requires PostgreSQL running and `DATABASE_URL` set (e.g. `postgresql+asyncpg://postgres:postgres@localhost:5432/nerum`).

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Open http://localhost:3000 — API at http://localhost:8000 — docs at http://localhost:8000/docs

## Agent Architecture

- **Commander** (Claude Sonnet, Nerum's `ANTHROPIC_API_KEY`): understands goals in English/Tamil, plans steps, calls tools, streams progress via SSE.
- **Soldiers** (user's BYOK key): heavy content generation via `generate_content` tool — routed to Anthropic / OpenAI / Groq / Gemini on the user's own key.

## Deploy (VPS)

```bash
docker compose down && docker compose up -d --build
```

Nginx proxies `/` → frontend :3000 and `/api/` → backend :8000, with SSE buffering disabled on `/api/v1/agent/run`.

---

Built with ❤️ in Chennai for Indian businesses.
