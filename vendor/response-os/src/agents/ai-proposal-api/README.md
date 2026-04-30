# AI Proposal API

Backend proxy for AI Proposal Generator web/mobile clients.

## Endpoints

- `GET /v1/health`
- `GET /v1/config`
- `POST /v1/intel/fetch`
- `POST /v1/proposals/generate`
- `POST /v1/proposals/render/pdf` (local PDF render, returns bytes or saved path)
- `GET /v1/proposals/:id`
- `POST /v1/proposals/:id/save`
- `GET /v1/clients`
- `POST /v1/clients/upsert`
- `POST /v1/ai/refine`
- `POST /v1/ai/translate`
- `POST /v1/ai/qa`

Legacy compatibility endpoints remain:

- `POST /api/proposals/refine`
- `POST /api/proposals/translate`
- `POST /api/proposals/qa`

`POST /v1/proposals/generate` accepts optional `responseOs` payload data.
When provided, it executes `ProposalAgent` for deterministic multi-trade CPE output.
`/v1/ai/*` is cloud-first (if configured) and falls back to local boost behavior.

## Env

Copy `.env.example` to `.env` and set:

- `PORT` (default `8787`)
- `GEMINI_API_KEY` (optional, can be added later)
- `GEMINI_MODEL` (default `gemini-2.0-flash`)
- `NSS_GATEWAY_DATA_DIR` (optional local storage path, default `./.nss-gateway-data`)
- `CLOUD_AI_BASE_URL` (optional hosted AI endpoint base URL)
- `CLOUD_AI_API_KEY` (optional bearer token for cloud AI)
- `CLOUD_AI_TIMEOUT_MS` (optional, default `15000`)
- `CLOUD_AI_REFINE_PATH` / `CLOUD_AI_TRANSLATE_PATH` / `CLOUD_AI_QA_PATH` (optional path overrides)

## Run

```bash
npm install
npm run dev
```
