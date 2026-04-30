# NNS RespondeOS + ResponseOS Control Center (Real Deployment Guide)

This is the practical guide for running the full local-business automation stack in production.

## 1) What Each Part Is

- `NNS RespondeOS` (`packages/response-os`): local-first operations runtime for money patches (missed calls, SMS auto-reply, booking, review booster).
- `ResponseOS Control Center` (`packages/responseos-gateway`): operator/admin UI to control gateway runtime, providers, connectors, and saved state.
- `Gateway` (`@nss/responseos-gateway`): HTTP layer that your app and webhooks call.

Keep this separation:
- `NNS RespondeOS` = patch execution + business logic.
- `Control Center` = admin/testing panel.
- Client-facing app/dashboard = simplified business UI.

## 2) Quick Start (Local)

From `packages/response-os`:

```bash
npm --workspaces=false install
npm test
npm run nns:respondeos
```

Open:
- `http://127.0.0.1:4187` (NNS RespondeOS dashboard)

If you see `127.0.0.1 refused to connect`, the process is not running or a different port is used.

Optional custom port:

```powershell
$env:NNS_RESPONDEOS_PORT="4187"; npm run nns:respondeos
```

## 3) NNS RespondeOS Input Guide (All Data You Must Enter)

UI file: `tools/nns-respondeos-ui.html`

### 3.1 Business Profile Section

Enter this first, then click `Save Profile`.

| Field | Required | Format | Example | Why It Matters |
|---|---|---|---|---|
| `Tenant ID` | Yes | slug/string, no spaces preferred | `acme-hvac` | Isolates leads/metrics per client |
| `Business Name` | Yes | plain text | `Acme Mechanical LLC` | Used in outgoing customer messages |
| `Callback Number` | Yes | E.164 phone | `+12025550999` | Customer reply target + contact identity |
| `Timezone` | Yes | IANA timezone | `America/New_York` | Correct after-hours and follow-up timing |
| `Services` | Yes | comma-separated list | `hvac repair, installation` | Qualification + lead categorization context |

### 3.2 Event Runner Section

Choose event type, fill fields, then click `Run Event`.

#### `call.missed`

| Field | Required | Example | Notes |
|---|---|---|---|
| `From Number` | Yes | `+12025550101` | Caller phone (lead identity key) |
| `To Number` | Yes | `+12025550999` | Business number that missed the call |
| `Call SID` | Yes | `CA_abc123` | Unique call reference for dedupe/audit |
| `Source` | Recommended | `twilio-webhook` | Keep stable per integration |

#### `sms.received`

| Field | Required | Example | Notes |
|---|---|---|---|
| `From Number` | Yes | `+12025550102` | Lead phone |
| `To Number` | Yes | `+12025550999` | Business phone |
| `Message` | Yes | `No heat in apt 4B tonight` | Parsed for intent/urgency/category |
| `Source` | Recommended | `twilio-webhook` | Use real webhook source string |

#### `job.completed`

| Field | Required | Example | Notes |
|---|---|---|---|
| `Lead ID` | Yes | `lead_20260303_001` | Must map to your lead record |
| `Lead Phone` | Yes | `+12025550103` | Used for review request send |
| `Lead Status` | Yes | `won` | Review sends only on `won` |
| `Review URL` | Recommended | `https://g.page/r/.../review` | Destination for review booster |
| `Source` | Recommended | `field-app` | Use your operational source label |

### 3.3 Output You Should Verify Every Run

- `Last Run Output`: patch status should be `completed`.
- `Automation Metrics`: numbers should increase logically per event type.
- `Leads` table: stage, category, urgency, and update timestamp should reflect new event.

## 4) ResponseOS Control Center Input Guide

Control Center UI path:
- `../responseos-gateway/tools/responseos-control-ui.html`

Hosted path (if published):
- `https://download.northernstep.studio/responseos-gateway/responseos-control.html`

### 4.1 Runtime Controls (Top Left)

| Field | Required | Example | What To Enter |
|---|---|---|---|
| `Gateway URL` | Yes | `http://127.0.0.1:8787` | Running gateway base URL |
| `API Key` | Yes (secured envs) | `client-key-...` | Tenant/app gateway key |
| `App ID` | Yes | `acme-web-app` | Must match gateway config app |
| `User ID` | Yes | `u1` | Any stable user identifier |
| `Session ID` | Yes | `s1` | Stable per conversation/workflow |
| `Platform` | Yes | `web` | `web`, `desktop`, `backend`, or `mobile` |
| `Locale` | Yes | `en-US` | Formatting + language context |
| `Timezone` | Yes | `America/New_York` | Scheduling and time-sensitive behavior |
| `Run Message` | Yes | `Create follow-up workflow` | Natural-language task input |
| `Plan Goal` | For plan/export | `Build onboarding plan` | Explicit workflow objective |
| `Export Format` | For plan/export | `csv` | `csv` or `pdf` |

Actions:
- `Check Health` -> verifies gateway reachability.
- `Load Provider` / `Save Provider` -> reads/writes provider per app.
- `Run` -> tests `/v1/run`.
- `Run Plan+Export` -> tests `/v1/run-plan-save-export`.

### 4.2 Provider Override

- Allowed values: `off`, `mock`, `gemini`.
- Production-safe default: `off` until policies, budgets, and legal constraints are validated.
- If privacy mode disables external providers, effective provider may stay `off` even if `gemini` is selected.

### 4.3 Connector Controls

Use this to wire real systems.

| Input | Required | Example |
|---|---|---|
| `Connector ID` | Yes | `twilio-main` |
| `Name` | Yes | `Twilio Primary` |
| `Base URL` | Yes | `https://api.twilio.com` |
| `Auth Type` | Yes | `bearer` / `api_key` / `basic` / `none` |
| `Default Headers` | Optional | `{}` |
| `Path` | Yes for test/fetch | `/2010-04-01/Accounts/...` |
| `Method` | Yes | `GET` |
| `Query JSON` | Optional | `{}` |
| `Body JSON` | Optional | `{}` |
| `Row Path` | Optional | `data.items` |

Use buttons in order:
1. `Upsert`
2. `Test`
3. `Fetch`
4. `Fetch + Export` (if needed)

### 4.4 State Management

- `Export State`: inspect saved sessions (for audit/debug).
- `Delete State`: remove one session or all sessions for app cleanup.

## 5) External Services You Need For Real Production

These are required to move from demo to actual client value.

## 5.1 Core Services (Required)

1. SMS/voice provider (Twilio recommended)
- Needed for missed call recovery + inbound SMS + outbound SMS.
- Required data: Account SID/Auth Token/API key, phone numbers, webhook URLs.

2. Persistent data store
- SQLite (single machine) or Postgres (multi-user/multi-site).
- Needed for leads, profile data, dedupe, and audit persistence across restarts.

3. Scheduler/queue
- Needed for follow-up timing (10 min, 24 hr, 3 day).
- Use cron/BullMQ/worker queue equivalent.

4. Gateway host runtime
- Windows service or persistent Node process so `127.0.0.1:8787` remains available.

## 5.2 Business-Value Services (Strongly Recommended)

1. Calendar integration
- Google Calendar API for appointment booking.

2. Email provider
- SMTP or API provider for owner notifications/review follow-ups.

3. Review destination links
- Google Business Profile review links per client location.

4. Monitoring + logs
- Central log retention for delivery failures, auth failures, webhook retries.

## 5.3 Optional AI Service

- Gemini provider (`GEMINI_API_KEY`) only for refinement/translation/smart QA.
- Keep deterministic patch execution as primary path.

## 6) Minimum Data Contracts You Must Enforce

- Phone numbers: E.164 (`+1...`).
- Timezones: IANA only (`America/New_York`).
- Event timestamps: ISO-8601 UTC.
- Lead stage transitions: `new -> contacted -> scheduled -> estimate_sent -> won/lost`.
- Dedupe keys: use event IDs (`callSid`, `messageSid`, etc.) to prevent duplicate sends.

## 7) Go-Live Sequence (Do This In Order)

1. Configure gateway tenant/app + API key.
2. Start gateway and verify `/health`.
3. Start `NNS RespondeOS` and save real business profile.
4. Wire Twilio webhooks -> gateway event endpoints.
5. Run live test:
   - missed call event -> SMS sent
   - inbound SMS -> lead upsert + auto-reply
6. Verify dedupe by replaying same webhook payload (should not double-send).
7. Enable follow-up scheduler and verify delayed messages fire once.
8. Connect calendar and test booking creation.
9. Connect email/owner notifications.
10. Test `job.completed` with `leadStatus=won` and verify review booster.
11. Persist data to DB (not in-memory).
12. Add dashboards/alerts for failure rates before client rollout.

## 8) Fast Troubleshooting

- `127.0.0.1 refused to connect`:
  - Start the server process (`npm run nns:respondeos` or gateway start script).
  - Confirm port is not occupied by another process.
- `Unauthorized` in Control Center:
  - Verify `x-api-key` and `app_id` match gateway tenant config.
- Provider looks wrong:
  - Check `allow_external_providers` and privacy mode in gateway config.
- Follow-ups not firing:
  - Scheduler/queue adapter is not wired (only actions are emitted).
- Data resets on restart:
  - Replace in-memory stores with persistent adapters.

## 9) What Is Demo vs Production Right Now

Demo-ready now:
- deterministic patch execution
- local dashboards
- profile/metrics/lead views
- runtime/provider/connector controls

You still must wire for production:
- Twilio + calendar + email adapters
- persistent DB + dedupe store
- scheduler backend
- secure secret management and key rotation
