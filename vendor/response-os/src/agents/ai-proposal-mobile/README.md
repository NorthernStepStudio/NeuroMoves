# AI Proposal Mobile

Expo app for Android-first rollout of AI Proposal Generator.

## Features Implemented

- Shared proposal core logic (`@nss/proposal-core`)
- Shared localization (`@nss/proposal-i18n`) with EN/ES toggle
- Shared theming (`@nss/proposal-theme`) with system/dark/light
- API proxy integration for generation and intel
- Local draft/preferences/history persistence
- Screenshot protection using `expo-screen-capture`
- PDF export/share via `expo-print` and `expo-sharing`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Update `EXPO_PUBLIC_API_BASE_URL` to your API host.

## Run

```bash
npm run start
npm run android
```
