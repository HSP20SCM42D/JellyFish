Perfect.
This is your **Stage 1 MVP Product Requirements Document (PRD)** — focused, buildable in 7 days, and investor-demo ready.

No fluff. No long-term roadmap. Just what matters for this sprint.

---

# 🪼 Jellyfish Executive OS

## Stage 1 MVP — PRD

**Codename:** JX-Alpha
**Timeline:** 7 Days
**Goal:** Prove executive relationship intelligence + AI follow-up automation works.

---

# 1️⃣ Product Vision (Stage 1 Only)

Build a minimal but functionally strong system that:

- Connects Gmail + Calendar
- Auto-detects relationship strength
- Identifies at-risk contacts
- Generates a Daily Executive Brief
- Drafts intelligent follow-up emails

This MVP must demonstrate:

> AI-driven executive relationship intelligence.

---

# 2️⃣ Problem Statement

Executives:

- Handle 200–400 emails/day
- Manage 1000+ contacts
- Miss follow-ups
- Lose deal momentum
- Forget relationship context

There is no system that:

- Tracks relationship health automatically
- Identifies “cooling” connections
- Compresses daily signal into actionable brief

---

# 3️⃣ Target User (MVP Persona)

- Founder / CEO
- VC partner
- Startup executive
- Manages high-value relationships
- Uses Gmail + Google Calendar

We optimize ONLY for Google users.

---

# 4️⃣ Scope Definition

## ✅ In Scope

1. Google OAuth (Gmail + Calendar)
2. Email ingestion (last 30–90 days)
3. Calendar ingestion (last 90 days + next 30 days)
4. Contact auto-creation
5. Interaction timeline per contact
6. Relationship heat scoring
7. At-risk contact list
8. Daily Executive Brief (LLM-generated)
9. AI follow-up draft generation
10. Minimal web UI

---

## ❌ Out of Scope

- Slack
- WhatsApp
- LinkedIn
- CRM
- Sending emails
- Mobile app
- Graph visualization
- Advanced ML scoring
- Security hardening
- Multi-tenant scaling
- Analytics dashboard
- Custom themes

---

# 5️⃣ Functional Requirements

---

## 5.1 Authentication

### FR-1: Google Login

- User must sign in with Google OAuth.
- Required scopes:
  - Gmail Readonly
  - Calendar Readonly

- Store access + refresh tokens securely in DB.

### Acceptance Criteria:

- User clicks “Sign in with Google”
- User redirected back authenticated
- Tokens stored successfully

---

## 5.2 Data Ingestion

---

### FR-2: Gmail Ingestion

System must:

- Pull last N days (configurable, default 90)
- Extract:
  - Sender
  - Recipients
  - Timestamp
  - Subject
  - Snippet
  - Thread ID

- Detect direction:
  - IN (received)
  - OUT (sent)

System must:

- Create/update Contact records
- Create Interaction records

### Acceptance Criteria:

- After ingestion, system stores interactions
- Contacts auto-created
- No duplicate contacts

---

### FR-3: Calendar Ingestion

System must:

- Pull:
  - Past 90 days
  - Next 30 days

- Extract:
  - Attendees
  - Title
  - Description
  - Start time

System must:

- Create Interaction record type: MEETING

### Acceptance Criteria:

- Meetings appear in interaction timeline
- Attendees mapped to Contact records

---

# 6️⃣ Relationship Heat Engine

---

## 6.1 Scoring Model (Rule-Based for MVP)

Each contact receives:

### Inputs:

- Days since last interaction
- Email frequency (last 30 days)
- Meeting frequency (last 30 days)
- Outbound pending (you sent last, no reply)

### Formula (example implementation):

```
Score = 100
- (daysSinceLastInteraction × 2)
- (outboundPending ? 15 : 0)
+ (meetingCountLast30 × 8)
+ (emailCountLast30 × 2)
Clamp between 0 and 100
```

---

## 6.2 Risk Labels

- 70–100 → Active
- 40–69 → Warm
- 0–39 → Cooling / At Risk

---

### FR-4: Score Computation

System must:

- Recompute scores after ingestion
- Store score per contact
- Sort contacts by risk

### Acceptance Criteria:

- At-risk contacts are visible
- Scores update when recomputed

---

# 7️⃣ Daily Executive Brief

---

## 7.1 Brief Generation

System must:

- Identify:
  - Top 5 at-risk contacts
  - Upcoming meetings next 7 days
  - Top recent high-frequency interactions

- Pass structured summary into LLM

LLM generates:

- Bullet summary
- 3–5 action recommendations
- Suggested focus areas

---

### FR-5: Daily Brief API

- Endpoint generates brief on demand
- Output displayed in “Today” view

### Acceptance Criteria:

- Brief reads executive-level
- Mentions real contacts
- Actionable tone

---

# 8️⃣ Follow-Up Draft Generation

---

## 8.1 Contact Detail View

User selects contact → see:

- Timeline of last interactions
- Current score
- Risk label
- Last message direction

---

## 8.2 Draft Logic

System must:

- Compile:
  - Last 5 interactions
  - Last meeting
  - Context summary

- Send to LLM
- Generate:
  - Context-aware follow-up
  - Professional tone
  - Suggested next step

---

### FR-6: Draft Follow-Up

User clicks “Generate Draft”

System returns:

- Email subject
- Body
- Editable text

### Acceptance Criteria:

- Draft references recent context
- Feels personalized
- No hallucinated facts

---

# 9️⃣ User Interface Requirements

---

## 9.1 Pages

### 1. Login Page

- Google sign-in button

### 2. Ingestion Page

- “Ingest last 90 days”
- Status indicator

### 3. Today Dashboard

Sections:

- Executive Brief
- At-Risk Contacts
- Upcoming Meetings

### 4. People Page

- List sorted by score
- Filters: All / At Risk / Warm / Active

### 5. Person Detail Page

- Interaction timeline
- Score
- Draft button

---

## 9.2 Design Requirements

- Minimal dark theme
- Clean typography
- No clutter
- Executive aesthetic
- Fast interactions

---

# 10️⃣ Non-Functional Requirements (Lightweight)

- Ingestion must complete under 2 minutes for 90 days
- Draft generation < 5 seconds
- System stable with 10,000 interactions
- UI responsive

No heavy security requirements for MVP.

---

# 11️⃣ Technical Architecture (MVP)

Frontend:

- Next.js (App Router)

Backend:

- Next.js API routes

Database:

- Postgres
- Prisma ORM

LLM:

- OpenAI GPT-4o or GPT-5.2

Hosting:

- Vercel + Supabase OR simple EC2

---

# 12️⃣ Success Metrics for MVP

You are not measuring revenue yet.

You are measuring:

1. % of users who generate follow-up drafts
2. % of at-risk contacts acted upon
3. Time-to-first-value (<10 minutes from login)
4. User qualitative feedback:
   - “This is useful”
   - “This caught something I missed”

---

# 13️⃣ Demo Definition of Done

Before investor demo:

- Connect Gmail
- Ingest real account
- Show:
  - 5 at-risk contacts
  - 1 upcoming meeting insight
  - 1 generated follow-up draft

- Generate Daily Brief live

If that works smoothly → MVP complete.

---

# 14️⃣ Stage 1 Positioning Statement

When presenting:

> “We built the first AI-powered executive relationship engine.
> This is just Gmail + Calendar.
> Now imagine the full digital graph.”
