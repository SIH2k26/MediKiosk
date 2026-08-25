# MediKiosk — Getting Started Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ LTS | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Python | 3.11+ | https://python.org |
| Git | Latest | https://git-scm.com |

> **Docker is optional** — services can be run directly during development.

---

## 1. Clone & Install

```bash
git clone <repository-url>
cd MediKiosk
pnpm install
```

---

## 2. Configure Environment

Copy `.env.example` files and fill in your values:

```bash
# Kiosk app
copy apps\kiosk\.env.local.example apps\kiosk\.env.local

# Doctor app
copy apps\doctor\.env.local.example apps\doctor\.env.local

# Express API
copy services\api\.env.example services\api\.env

# AI History service
copy services\ai-history\.env.example services\ai-history\.env

# AI Documents service
copy services\ai-documents\.env.example services\ai-documents\.env
```

You **must** fill in:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` (for the API service only)
- `GOOGLE_GEMINI_API_KEY` (for AI services)

---

## 3. Supabase Setup

1. Create a project at https://supabase.com
2. Go to **SQL Editor** and run:
   ```sql
   -- Paste contents of supabase/migrations/001_initial_schema.sql
   ```
3. (Optional) Run seed data:
   ```sql
   -- Paste contents of supabase/seed/001_seed.sql
   ```
4. Go to **Storage** and create three buckets:
   - `medical-documents` (private)
   - `audio-recordings` (private)  
   - `processed-documents` (private)

---

## 4. Run Development Servers

### Option A — All Node.js apps at once (Turborepo)
```bash
pnpm dev
```

### Option B — Individual apps
```bash
# Patient Kiosk (port 3000)
pnpm --filter @medikiosk/kiosk dev

# Doctor Portal (port 3001)
pnpm --filter @medikiosk/doctor dev

# Admin Portal (port 3002)
pnpm --filter @medikiosk/admin dev

# Express API (port 4000)
pnpm --filter @medikiosk/api dev
```

### Python AI Services (run separately)

```bash
# AI History Service (port 8001)
cd services/ai-history
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

```bash
# AI Documents Service (port 8002)
cd services/ai-documents
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

---

## 5. Verify Everything Works

| Service | URL | Expected |
|---------|-----|----------|
| Kiosk | http://localhost:3000 | Language selection screen |
| Doctor Portal | http://localhost:3001 | OPD queue dashboard |
| Admin Portal | http://localhost:3002 | Admin feature cards |
| API Health | http://localhost:4000/health | `{"status":"ok"}` |
| API Docs (Swagger) | http://localhost:4000/api/docs | Swagger UI |
| AI History | http://localhost:8001/health | `{"status":"ok"}` |
| AI Documents | http://localhost:8002/health | `{"status":"ok"}` |

---

## 6. Development Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Foundation (this) | ✅ Complete |
| 2 | Patient intake, consent, registration | 🔜 Next |
| 3 | Conversational AI, ASR (Bhashini), voice UI | 📋 Planned |
| 4 | Document AI, OCR, entity extraction | 📋 Planned |
| 5 | AI summary generation | 📋 Planned |
| 6 | Doctor dashboard, review workflow | 📋 Planned |
| 7 | ABDM + HIS integration (mock first) | 📋 Planned |
| 8 | Security hardening, testing, deployment | 📋 Planned |
