# NeuroMoves Backend

Flask backend for NeuroMoves. This service can run on Cloud Run if you point it at a real Postgres database instead of the local SQLite fallback.

## Local setup

1. Copy `.env.example` to `.env`
2. Leave `DATABASE_URL` empty for local SQLite, or set it to Postgres if you want to test the cloud path locally
3. Install and run:

```bash
pip install -r requirements.txt
python app.py
```

Health check:

```bash
curl http://localhost:5000/api/health
```

## Cloud Run deployment

Included deployment assets:

- `Dockerfile`
- `.dockerignore`
- `cloud-run.env.example.yaml`
- `deploy-cloud-run.ps1`

### Required runtime config

`DATABASE_URL` should be stored in Google Secret Manager.

Non-secret runtime values belong in `cloud-run.env.yaml`:

```yaml
DEBUG: "False"
ALLOWED_ORIGINS: https://your-app-domain.example
```

### Deploy

Run this from `apps/neuromoves/backend`:

```powershell
./deploy-cloud-run.ps1 -ProjectId your-gcp-project-id
```

Useful flags:

```powershell
./deploy-cloud-run.ps1 `
  -ProjectId your-gcp-project-id `
  -Region us-central1 `
  -ServiceName neuromoves-backend `
  -GroqApiKeySecret neuromoves-groq-api-key
```

## Production notes

- Do not use the SQLite fallback on Cloud Run because that filesystem is ephemeral.
- Runtime TTS synthesis is retired. NeuroMoves gameplay uses bundled EVA audio assets and works without a TTS server.
