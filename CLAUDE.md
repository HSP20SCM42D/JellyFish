# Jellyfish Executive OS — Claude Code Implementation Prompt

You are building a complete MVP called **Jellyfish Executive OS** — a local-first relationship intelligence tool for executives. Build this project from scratch, step by step, following the plan below exactly. After each major section, verify your work compiles and runs before moving on.

---

## GROUND RULES

- Ask me before proceeding if you hit any ambiguity. Do NOT guess at API keys or secrets — prompt me for them.
- Commit to git after each major milestone (Day boundary).
- Run the dev server and fix any errors before moving to the next day.
- Use `pnpm` as the package manager throughout.
- All code must be TypeScript (strict mode).
- Do not skip error handling — every API route needs try/catch and proper HTTP status codes.

---

## TECH STACK (do not deviate)

| Layer           | Choice                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router) with TypeScript                                    |
| Database        | PostgreSQL 16 via Docker Compose                                           |
| ORM             | Prisma                                                                     |
| Auth            | NextAuth.js v5 (Google OAuth)                                              |
| LLM             | Google Gemini API (`@google/generative-ai` SDK, model: `gemini-2.0-flash`) |
| Styling         | Tailwind CSS + shadcn/ui (dark theme)                                      |
| Package Manager | pnpm                                                                       |

---

## STEP 1 — Project Foundation + Database

1. Scaffold a new Next.js 15 project with TypeScript, Tailwind CSS, and App Router enabled.
2. Initialize shadcn/ui with a dark theme configuration.
3. Create a `docker-compose.yml` with PostgreSQL 16:
   - Database name: `jellyfish`, user: `jellyfish`, password: `jellyfish`, port `5432`.
4. Create a `.env.local` file with these variables (use placeholders where I need to fill in secrets):

```env
DATABASE_URL=postgresql://jellyfish:jellyfish@localhost:5432/jellyfish
GOOGLE_CLIENT_ID=<REPLACE>
GOOGLE_CLIENT_SECRET=<REPLACE>
GEMINI_API_KEY=<REPLACE>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<GENERATE_WITH_openssl_rand_-base64_32>
```

5. Set up Prisma and define the full schema with these models:

```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  name               String?
  googleAccessToken  String?  @db.Text
  googleRefreshToken String?  @db.Text
  tokenExpiry        DateTime?
  createdAt          DateTime @default(now())
  contacts           Contact[]
  interactions       Interaction[]
  briefs             Brief[]
  followUpDrafts     FollowUpDraft[]
}

model Contact {
  id                  String        @id @default(cuid())
  userId              String
  email               String
  name                String?
  lastInteractionAt   DateTime?
  score               Int           @default(50)
  riskLabel           String        @default("Warm") // "Active" | "Warm" | "At Risk"
  createdAt           DateTime      @default(now())
  user                User          @relation(fields: [userId], references: [id])
  interactions        Interaction[]
  followUpDrafts      FollowUpDraft[]

  @@unique([userId, email])
  @@index([userId, score])
}

model Interaction {
  id        String   @id @default(cuid())
  userId    String
  contactId String
  type      String   // "EMAIL_IN" | "EMAIL_OUT" | "MEETING"
  subject   String?
  snippet   String?  @db.Text
  timestamp DateTime
  threadId  String?
  user      User     @relation(fields: [userId], references: [id])
  contact   Contact  @relation(fields: [contactId], references: [id])

  @@index([contactId, timestamp])
}

model Brief {
  id          String   @id @default(cuid())
  userId      String
  content     String   @db.Text
  generatedAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

model FollowUpDraft {
  id          String   @id @default(cuid())
  userId      String
  contactId   String
  subject     String
  body        String   @db.Text
  generatedAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  contact     Contact  @relation(fields: [contactId], references: [id])
}
```

6. Run `docker compose up -d`, then `pnpm prisma migrate dev --name init`.
7. Create the folder structure:

```
/app
  /api/
  /(auth)/login/
  /dashboard/
  /people/
  /people/[id]/
  /ingest/
/lib
  auth.ts
  prisma.ts
  gmail.ts
  calendar.ts
  scoring.ts
  gemini.ts
  types.ts
/components/
/prisma/
```

8. Create `/lib/prisma.ts` as a Prisma client singleton (global cache for dev hot-reload).

**Checkpoint:** `pnpm dev` runs with no errors, database is connected, Prisma Studio (`pnpm prisma studio`) shows empty tables.

---

## STEP 2 — Google OAuth + Auth Flow

1. Install and configure NextAuth.js v5 with the Google provider.
2. In the Google provider config, request these scopes beyond the defaults:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
3. Use a **custom Prisma adapter** or callbacks to:
   - Upsert a `User` row on sign-in.
   - Store `access_token`, `refresh_token`, and `expires_at` (as `tokenExpiry`) in the `User` table.
4. Implement **token refresh logic** in a helper function (`/lib/auth.ts`):
   - Before any Google API call, check if `tokenExpiry` is past. If so, use the `refresh_token` to get a new `access_token` from `https://oauth2.googleapis.com/token` and update the DB.
5. Build the **Login Page** (`/app/(auth)/login/page.tsx`):
   - Dark background, centered card.
   - App name "Jellyfish" at the top (large, clean font).
   - A single "Sign in with Google" button using shadcn/ui Button.
6. Add **auth middleware** (`middleware.ts`):
   - Protect all routes. Redirect unauthenticated users to `/login`.
   - Allow `/login` and `/api/auth/*` without auth.
7. After successful login, redirect to `/dashboard`.

**Checkpoint:** You can sign in with Google, get redirected to `/dashboard`, and see `access_token` + `refresh_token` stored in the `User` row in the database.

---

## STEP 3 — Gmail + Calendar Ingestion

### Gmail Ingestion

Create `/lib/gmail.ts` and `/app/api/ingest/gmail/route.ts`:

1. Use the `googleapis` npm package (`google.gmail({ version: 'v1' })`) with the user's access token (refresh first if expired).
2. Fetch messages from the last 90 days using `users.messages.list` with query `after:YYYY/MM/DD`. Handle pagination (Gmail returns max 500 per page via `nextPageToken`).
3. For each message, call `users.messages.get` to retrieve headers (From, To, Subject, Date) and snippet.
4. Determine direction:
   - If `From` matches the user's email → `EMAIL_OUT`
   - Otherwise → `EMAIL_IN`
5. Upsert `Contact` records (deduplicate by `userId` + `email`). Parse display name from email header.
6. Create `Interaction` records. Avoid duplicates by checking for existing `threadId` + `timestamp` combos.
7. Update `lastInteractionAt` on the Contact after processing.
8. Use batching: process messages in chunks of 50 to avoid rate limits. Add a small delay between batches.

### Calendar Ingestion

Create `/lib/calendar.ts` and `/app/api/ingest/calendar/route.ts`:

1. Use `google.calendar({ version: 'v3' })` with the user's access token.
2. Fetch events from 90 days ago to 30 days from now using `calendar.events.list` on the `primary` calendar.
3. For each event with attendees:
   - Upsert Contact records for each attendee email (skip the user's own email).
   - Create an Interaction record of type `MEETING` with the event title as subject and start time as timestamp.

### Orchestration

Create `/app/api/ingest/route.ts`:

- `POST` handler that runs Gmail ingestion, then Calendar ingestion, then triggers score recomputation (Step 4).
- Return `{ success: true, contactsProcessed: N, interactionsCreated: M }`.

### Ingestion UI

Create `/app/ingest/page.tsx`:

- A card with a "Sync Last 90 Days" button.
- On click, call `POST /api/ingest`. Show a loading spinner while running.
- On completion, show success message with counts. On error, show error message.
- Display the last sync timestamp if available.

**Checkpoint:** After syncing a real Gmail account, the database has Contact and Interaction rows. Verify with Prisma Studio.

---

## STEP 4 — Relationship Heat Score Engine

Create `/lib/scoring.ts` and `/app/api/scores/recompute/route.ts`:

1. Implement this scoring function for each contact:

```typescript
function computeScore(params: {
  daysSinceLastInteraction: number;
  outboundPending: boolean; // last interaction is EMAIL_OUT with no newer EMAIL_IN
  meetingCountLast30: number;
  emailCountLast30: number;
}): { score: number; riskLabel: string } {
  let score = 100;
  score -= params.daysSinceLastInteraction * 2;
  score -= params.outboundPending ? 15 : 0;
  score += params.meetingCountLast30 * 8;
  score += params.emailCountLast30 * 2;
  score = Math.max(0, Math.min(100, score));

  let riskLabel: string;
  if (score >= 70) riskLabel = "Active";
  else if (score >= 40) riskLabel = "Warm";
  else riskLabel = "At Risk";

  return { score, riskLabel };
}
```

2. The recompute endpoint:
   - Query all contacts for the user.
   - For each contact, aggregate: days since last interaction, interaction counts in last 30 days by type, outbound-pending status.
   - Compute score, update `score` and `riskLabel` on the Contact row.
3. Auto-trigger score recomputation at the end of the ingestion orchestrator (Step 3).

**Checkpoint:** After ingestion + recompute, contacts have realistic scores and risk labels in the DB.

---

## STEP 5 — AI Features (Gemini)

### Gemini Wrapper

Create `/lib/gemini.ts`:

- Initialize `GoogleGenerativeAI` with the `GEMINI_API_KEY` env var.
- Export a helper: `generateContent(prompt: string): Promise<string>` that calls `gemini-2.0-flash` and returns the text response.
- Add error handling and a timeout.

### Daily Executive Brief

Create `/app/api/brief/route.ts` (`POST`):

1. Gather:
   - Top 5 at-risk contacts (lowest scores) with their names, emails, scores, and last interaction dates.
   - Upcoming meetings in the next 7 days with attendees.
   - Top 5 highest-frequency contacts from the last 30 days.
2. Build a structured prompt like:

```
You are an executive relationship advisor. Based on the following data about the executive's professional network, generate a concise daily briefing.

AT-RISK RELATIONSHIPS:
{list contacts with scores and last interaction dates}

UPCOMING MEETINGS (next 7 days):
{list meetings with attendees}

HIGH-ACTIVITY CONTACTS:
{list top contacts by interaction count}

Generate a briefing with:
1. A 2-3 sentence executive summary of relationship health
2. Top 3-5 specific action items (reference real names and context)
3. Key focus areas for the week

Be specific, reference names, and keep it actionable. Use a professional, concise tone.
```

3. Store the result in the `Brief` table. Return `{ content: string, generatedAt: string }`.

### Follow-Up Draft

Create `/app/api/draft/route.ts` (`POST`, body: `{ contactId: string }`):

1. Gather:
   - Contact details (name, email, score, riskLabel).
   - Last 5 interactions (type, subject, snippet, timestamp).
   - Last meeting if any.
2. Build a prompt like:

```
You are drafting a professional follow-up email on behalf of an executive.

CONTACT: {name} ({email})
RELATIONSHIP STATUS: {riskLabel} (Score: {score}/100)

RECENT INTERACTION HISTORY:
{list last 5 interactions with dates and subjects}

Write a follow-up email with:
- Subject line
- Email body

The tone should be warm but professional. Reference specific past interactions where relevant. Include a clear call to action. Keep it concise (under 150 words for the body).

Return as JSON: { "subject": "...", "body": "..." }
```

3. Parse the JSON response. Store in `FollowUpDraft` table. Return the draft.

**Checkpoint:** Both endpoints return well-formed, contextual AI-generated content.

---

## STEP 6 — Full UI Build

Build all pages with a cohesive dark theme executive aesthetic. Use shadcn/ui components throughout.

### Global Layout (`/app/layout.tsx`)

- Dark mode: near-black background (`bg-zinc-950`), subtle borders (`border-zinc-800`), white/zinc text.
- Sidebar navigation (fixed left) with links: **Today** (`/dashboard`), **People** (`/people`), **Ingest** (`/ingest`).
- Active link highlighted. App title "Jellyfish" at top of sidebar.
- Main content area with padding and max-width.

### Page 1 — Login (`/app/(auth)/login/page.tsx`)

- Full-screen dark background.
- Centered card with "Jellyfish" title, brief tagline ("Executive Relationship Intelligence"), and "Sign in with Google" button.
- No sidebar on this page.

### Page 2 — Ingest (`/app/ingest/page.tsx`)

- Already built in Step 3. Polish it:
  - Show last sync time.
  - Show contact + interaction count from DB.
  - Disable button while syncing, show spinner.

### Page 3 — Today Dashboard (`/app/dashboard/page.tsx`)

Three card sections stacked or in a grid:

**Card 1 — Executive Brief:**

- "Generate Brief" button at top.
- Shows the latest brief content rendered as formatted text (parse markdown if Gemini returns it).
- Loading skeleton while generating.
- Show `generatedAt` timestamp.

**Card 2 — At-Risk Contacts:**

- List of top 5 contacts with lowest scores.
- Each row: name, email, score as a color-coded badge (red for At Risk, yellow for Warm, green for Active), last interaction date.
- Each row links to `/people/[id]`.

**Card 3 — Upcoming Meetings:**

- Next 7 days of meetings from Interaction table (type = MEETING, timestamp in future).
- Show: meeting title, date/time, attendee names (linked to contact profiles where possible).

### Page 4 — People (`/app/people/page.tsx`)

- Filter tabs at top: **All** | **At Risk** | **Warm** | **Active**.
- Table with columns: Name, Email, Score (color-coded badge), Last Interaction, Risk Label.
- Default sort: score ascending (most at-risk first).
- Click a row → navigate to `/people/[id]`.
- Show total contact count.

### Page 5 — Person Detail (`/app/people/[id]/page.tsx`)

- **Header:** Contact name (large), email, score badge, risk label badge.
- **Interaction Timeline:** Chronological list of all interactions for this contact.
  - Each item shows: icon (📧 for email, 📅 for meeting), direction for emails (in/out), subject, snippet (truncated), date.
  - Most recent first.
- **Follow-Up Section:**
  - "Generate Follow-Up Draft" button.
  - When generated, show: editable subject field, editable body textarea, "Copy to Clipboard" button.
  - Loading skeleton while generating.

### Color Coding for Scores

- **Active (70-100):** Green badge (`bg-emerald-500/20 text-emerald-400`)
- **Warm (40-69):** Yellow badge (`bg-amber-500/20 text-amber-400`)
- **At Risk (0-39):** Red badge (`bg-red-500/20 text-red-400`)

**Checkpoint:** All 5 pages render correctly, navigation works, data displays from the database, AI features generate and display content.

---

## STEP 7 — Polish, Error Handling + README

1. **Error handling:** Every API route has try/catch. UI shows toast/alert on errors.
2. **Loading states:** Skeleton loaders on dashboard, spinners on buttons during async operations.
3. **Empty states:** Friendly messages when no contacts, no briefs, no interactions exist yet.
4. **Token expiry:** Gracefully handle expired Google tokens — refresh automatically, show re-auth prompt if refresh fails.
5. **Edge cases:** Contacts with no interactions show "No interactions yet." Draft generation handles contacts with minimal history.
6. **Performance:** Ingestion should handle 90 days of a moderately active inbox (500-2000 emails) without timeout. Use batching.
7. **README.md** with:
   - Project description
   - Prerequisites (Node.js 18+, Docker, pnpm, Google Cloud project)
   - Step-by-step Google Cloud setup (OAuth client, enable Gmail + Calendar APIs, get Gemini key)
   - Environment variable reference
   - How to run: `docker compose up -d` → `pnpm install` → `pnpm prisma migrate dev` → `pnpm dev`
   - Demo walkthrough

**Final Checkpoint — Demo Flow:**

1. Open `localhost:3000` → Login page → Sign in with Google
2. Navigate to Ingest → Click "Sync Last 90 Days" → Wait for completion
3. Navigate to People → See contacts sorted by score with risk labels
4. Click an "At Risk" contact → See interaction timeline → Click "Generate Follow-Up Draft" → See draft
5. Navigate to Today → Click "Generate Brief" → See executive briefing with action items

If this full flow works end-to-end with real data, the MVP is complete.
