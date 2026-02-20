# 🪼 Jellyfish Executive OS

AI-powered executive relationship intelligence. Connects Gmail + Google Calendar to score relationship health, surface at-risk contacts, generate a Daily Executive Brief, and draft follow-up emails.

---

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 16 (via Docker or Homebrew)
- Google Cloud project with OAuth credentials
- Google Gemini API key

---

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable these APIs:
   - **Gmail API** — search "Gmail API" → Enable
   - **Google Calendar API** — search "Google Calendar API" → Enable
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy **Client ID** and **Client Secret**
5. Get a **Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Environment Variables

Copy and fill in `.env.local`:

```env
DATABASE_URL=postgresql://jellyfish:jellyfish@localhost:5432/jellyfish
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GEMINI_API_KEY=<your-gemini-key>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
```

---

## Running Locally

### Option A — Docker (recommended for teams)
```bash
docker compose up -d
```

### Option B — Homebrew PostgreSQL (macOS)
```bash
brew install postgresql@16
brew services start postgresql@16
psql postgres -c "CREATE USER jellyfish WITH PASSWORD 'jellyfish' CREATEDB;"
psql postgres -c "CREATE DATABASE jellyfish OWNER jellyfish;"
```

### Start the app
```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Walkthrough

1. **Login** — Sign in with Google at `localhost:3000`
2. **Sync** — Go to **Sync** → click "Sync Last 90 Days" (takes 1–2 min)
3. **People** — Browse contacts sorted by relationship score
4. **Draft** — Click an at-risk contact → "Generate Follow-Up Draft"
5. **Today** — Go to **Today** → "Generate Brief" for your daily executive summary

---

## Common Commands

```bash
pnpm dev                          # Start dev server
pnpm build                        # Production build
pnpm prisma studio                # Browse database (localhost:5555)
pnpm prisma migrate dev --name x  # Create + apply a new migration
pnpm prisma generate              # Regenerate client after schema changes
```
