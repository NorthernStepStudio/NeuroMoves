# AI Proposal Generator

Premium proposal generator for small contractors.  
Builds itemized quotes, contract language, payment schedules, and exportable proposal documents.

## Features

- Backend-proxied Gemini proposal drafting with deterministic fallback.
- ResponseOS `ProposalAgent` intake mapping fallback (`description/client/settings -> intake`).
- Structured CPE intake with trade profiles (`HVAC`, `Plumbing`, `Electrical`, `General Renovation`).
- Hybrid flow: offline deterministic generation + optional cloud AI boost modes.
- Branded PDF export with client/contractor signature blocks.
- English/Spanish toggle for UI and generated proposal content.
- Theme mode toggle (`system`, `dark`, `light`) with persisted preference.
- Public-data insight fetcher for proposal planning:
  - U.S. BLS market signals (CPI + unemployment).
  - Open-Meteo schedule/weather risk signals.
- Local draft autosave for faster repeat proposals.
- Local-only proposal intelligence history (no cloud sync).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Ensure `VITE_API_BASE_URL` points to the backend proxy (`apps/ai-proposal-api`).

4. Run:

```bash
npm run dev
```

## Backend Requirement

The web app no longer calls Gemini/BLS/Open-Meteo directly.  
Run the backend API in `apps/ai-proposal-api` and configure:

- `GEMINI_API_KEY` (optional for AI drafting)
- `GEMINI_MODEL` (optional, default `gemini-2.0-flash`)

## Legal Data Sources

- U.S. Bureau of Labor Statistics Public Data API: https://www.bls.gov/developers/
- Open-Meteo API: https://open-meteo.com/

Use these sources according to their terms and attribution requirements.
