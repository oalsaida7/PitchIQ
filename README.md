# ⚽ PitchIQ — AI Football Intelligence

Dark-mode, FotMob-style football app with live scores, AI predictions, player scouting, and transfer news. World Cup 2026 + 8 leagues.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Anthropic Claude API · Space Grotesk font

---

## Features

- **Scores** — Matches organized by date across World Cup 2026, EPL, La Liga, Serie A, Bundesliga, Ligue 1, MLS, UCL. Navigate ±3 days.
- **Per-match AI tabs** — Preview (prediction, H2H, tactics, venue), Lineups, Commentary, Stats, Table, and post-match Review with player ratings
- **News** — Transfer news with Fabrizio Romano / sky sports sources, World Cup updates, rumor tags
- **Scout AI** — Any player worldwide: full report, season stats, hidden gem detection, YouTube highlights link
- **Find me a player like…** — Natural language player similarity search
- **Search** — Tap top bar to search players, clubs, countries with full detail pages

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.local.example .env.local
# Edit .env.local → paste your key from console.anthropic.com

# 3. Run
npm run dev
# → Open http://localhost:3000
```

---

## Deploy to Vercel (Step-by-step)

### Step 1 — Push your code to GitHub

Open a terminal in your project folder and run:

```bash
git init
git add .
git commit -m "PitchIQ v3 — full rebuild"
```

Then go to **github.com/new**, create a new repo called `pitchiq`, and run what GitHub tells you. It will look like:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pitchiq.git
git branch -M main
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to **vercel.com** → Sign in with GitHub
2. Click **"Add New Project"**
3. Find your `pitchiq` repo → click **Import**
4. Leave all settings as default — Vercel auto-detects Next.js
5. Click **Deploy**

Your first deploy will **fail** because it has no API key yet. That's expected.

### Step 3 — Add your API key

1. In your Vercel project dashboard, go to **Settings → Environment Variables**
2. Click **Add New**
3. Name: `ANTHROPIC_API_KEY`
4. Value: your key from [console.anthropic.com](https://console.anthropic.com)
5. Make sure all environments are checked (Production, Preview, Development)
6. Click **Save**

### Step 4 — Redeploy

1. Go to **Deployments** tab in Vercel
2. Click the three dots on the latest deployment → **Redeploy**
3. Wait ~60 seconds
4. Your app is live at `https://pitchiq-YOUR_USERNAME.vercel.app`

### Future updates — just push to GitHub

Every time you update code:
```bash
git add .
git commit -m "your message"
git push
```
Vercel auto-deploys within 30 seconds. No need to go back to Vercel.

---

## Project structure

```
pitchiq/
├── app/
│   ├── globals.css          ← Space Grotesk font, design tokens, animations
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── predict/route.ts ← Preview, lineup, review, commentary, stats, table
│       ├── scout/route.ts   ← Player scouting reports
│       └── similar/route.ts ← Player similarity search
├── components/
│   └── PitchIQ.tsx          ← Entire UI (all panels, all logic)
├── lib/
│   └── data.ts              ← All match data, news, search entities
└── .env.local.example
```

---

## Resume bullet points

> **PitchIQ** — AI Football Intelligence Web App  
> - Built a full-stack AI football app with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and the **Anthropic Claude API** (`claude-sonnet-4-6`)  
> - Features live scores across 8 leagues (World Cup 2026, EPL, La Liga, Serie A, Bundesliga, Ligue 1, MLS, UCL) with date navigation  
> - AI-powered per-match tabs: pre-match preview (predictions, H2H, tactics), predicted lineups, live commentary, match stats, league table, and post-match player ratings  
> - Scout AI with global player search, hidden gem detection, season stats, YouTube highlights integration, and natural language similarity search  
> - Deployed on Vercel with secure server-side API key handling via Next.js Route Handlers
