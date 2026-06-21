# ⚽ PitchIQ — AI Football Scout & Match Analyst

An AI-powered football web app featuring live match analysis, player scouting reports, side-by-side player comparison, and natural language similarity search. Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and the **Anthropic Claude API**.

---

## Features

- **Live Matches** — Real fixtures across Premier League, La Liga, UCL, and MLS with win probability bars
- **AI Match Analysis** — Claude generates pundit-style tactical breakdowns for any fixture
- **Scout AI** — Enter any player's name and get a full scouting report with ratings (pace, technical, physical, mental, defense, shooting), strengths, weaknesses, playing style, and a scout verdict
- **Find Me a Player Like…** — Natural language similarity search: "a younger Pirlo", "faster Thiago", "budget Haaland"
- **Player Comparison** — Save up to 4 players and compare their stats side by side

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Deployment | Vercel |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/pitchiq.git
cd pitchiq
npm install
```

### 2. Set up your API key

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your key at: https://console.anthropic.com

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Deploy to Vercel (Free)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial PitchIQ commit"
gh repo create pitchiq --public --push
# OR manually: go to github.com/new, create repo, then:
# git remote add origin https://github.com/YOUR_USERNAME/pitchiq.git
# git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New Project"**
3. Select your `pitchiq` repository
4. Vercel auto-detects Next.js — click **Deploy**

### Step 3 — Add your API key in Vercel

1. After deploy, go to your project dashboard
2. Click **Settings → Environment Variables**
3. Add: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Click **Save**, then go to **Deployments** and **Redeploy**

Your app is now live at `https://pitchiq.vercel.app` (or similar)!

---

## Project Structure

```
pitchiq/
├── app/
│   ├── layout.tsx          # Root layout & metadata
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   └── api/
│       ├── analyze/route.ts  # Match analysis API
│       ├── scout/route.ts    # Player scouting API
│       └── similar/route.ts  # Player similarity API
├── components/
│   └── PitchIQ.tsx         # Main client component
├── lib/
│   └── data.ts             # Match data & types
├── .env.local.example      # Environment template
└── README.md
```

---

## Adding to Your Resume

> **PitchIQ** — AI Football Analyst & Scout Web App
> - Built a full-stack AI football app using **Next.js 15**, **TypeScript**, and the **Anthropic Claude API**
> - Implemented 4 AI-powered features: match analysis, player scouting, similarity search, and player comparison
> - Integrated live sports data across 4 leagues (EPL, La Liga, UCL, MLS)
> - Deployed to Vercel with secure server-side API key handling via Next.js API routes

---

## Ideas for v2

- [ ] User accounts + persistent saved players (Supabase or Clerk)
- [ ] Real-time scores via WebSocket or polling
- [ ] Player stats from a live football API (API-Football)
- [ ] Share a scouting report as an image (og:image)
- [ ] Dark/light mode toggle
- [ ] Search history
