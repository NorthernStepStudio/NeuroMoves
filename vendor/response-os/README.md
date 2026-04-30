# @nss/response-os

ResponseOS is a local-first execution engine for Northern Step Studio projects.

For a full implementation runbook for NNS RespondeOS + Control Center, see `README-DM.md`.

Run local NNS RespondeOS (dashboard + local API):

```bash
npm run nns:respondeos
```

## What ResponseOS Is

ResponseOS is the reusable brain layer:

- It ingests structured events (`call.missed`, `sms.received`, form submissions).
- It routes events to business automations ("patches").
- It executes tools through guarded, auditable actions.
- It stores state and returns structured, deterministic results.

ResponseOS is not a proposal app, CRM, or chat widget UI.

## Core Modules

- Identity/runtime context envelope (`appId`, `userId`, `sessionId`, locale/timezone, platform, capabilities, policy profile, trace id)
- Message/state model (short memory + persisted memory reference + structured session state)
- Router (intent/domain/complexity/pipeline decisions)
- Policy engine (input/tool/output validation + targeted disclaimers)
- Tool system (registry + schema contracts + permission checks + retries/timeouts/idempotency)
- Planning/execution runtime (`AgentRuntime`) with budget and recovery paths
- Budget control (steps, llm calls/tokens, tools, elapsed time)
- Provider abstraction (`off`, `mock`, `gemini`) with capability flags
- Deterministic engines (template, form normalization, scoring, routine generation)
- Memory store interface + adapters (`InMemoryStore`, `KeyValueMemoryStore`)
- Structured audit logger with trace ids
- Typed error model (`ResponseOSError`)
- Structured output contracts (`ok|refused|needs_user|error`)
- Event contracts + patch execution engine
- Patches (`MissedCallRecoveryPatch`, `ProposalAgent` as a domain patch module)
- Per-app configuration (`AppConfig`)
- Test harness (routing/policy/tools/budget/runtime/provider tests)

## Install

```bash
npm --workspaces=false install
```

## Validate

```bash
npm --workspaces=false run typecheck
npm --workspaces=false test
npm --workspaces=false pack --dry-run
```

## Offline Install Kit (Website + PC)

Build a portable installer kit on your machine:

```bash
npm run responseos:kit
```

This creates:

- `packages/response-os/offline-kit/artifacts/*.tgz` (package tarball)
- `packages/response-os/offline-kit/installer/install-responseos.ps1`

Copy the whole `offline-kit` folder to external storage.  
On a client Windows machine, run:

```powershell
.\installer\install-responseos.ps1 -AppDir "C:\path\to\client-app" -AppId "client-app-id"
```

This installs `@nss/response-os` from local files (offline) and adds a starter `responseos/client.js`.

## App Integration (Phase 2)

Every app should expose a thin adapter layer:

- `apps/<app>/src/responseos/adapter.ts`
- `apps/<app>/src/responseos/tools/*.tool.ts`
- `apps/<app>/src/responseos/config.ts`

### Create an App Client

```ts
import {
  createAppClient,
  createDefaultAppConfig,
  createFileExportTools,
  createStorageTools,
  createHttpFetchTool,
} from '@nss/response-os';

const appConfig = createDefaultAppConfig('my-app');
const storage = new Map<string, unknown>();

const client = createAppClient({
  appConfig,
  tools: [
    ...createStorageTools({
      async get(key) {
        return storage.get(key);
      },
      async set(key, value) {
        storage.set(key, value);
      },
    }),
    createHttpFetchTool(),
    ...createFileExportTools(),
  ],
});

const result = await client.run({
  userId: 'u1',
  sessionId: 's1',
  userMessage: 'Help me plan my day',
  platform: 'mobile',
});
```

### Hello Brain (Provider Off Compatible)

```ts
const result = await client.runHelloBrain({
  sessionId: 's1',
  userMessage: 'Hello Brain',
});

// result.actions -> UI buttons/retry actions
// result.data.workflow -> storage set/get verification
```

### Plan Save Export Workflow

```ts
const workflowResult = await client.runPlanSaveExport({
  sessionId: 's1',
  goal: 'Launch onboarding v1',
  exportFormat: 'csv', // or 'pdf'
});

// workflowResult.artifacts -> file export payload for UI renderer
// workflowResult.data.workflow -> plan steps + save/export status
```

## Patch Model (Revenue Modules)

ResponseOS core stays app-agnostic. Revenue features are delivered as patches:

- `MissedCallRecoveryPatch` (first wedge for local businesses)
- `AutoReplyInboundPatch` (instant SMS intake + qualification)
- `AppointmentBookingPatch` (SMS booking to calendar action flow)
- `ReviewBoosterPatch` (post-job review request automation)
- `ProposalAgent` (proposal generation module)
- future patches: review booster, lead qualification, follow-up sequences

### Missed Call Recovery Patch

`MissedCallRecoveryPatch` runs deterministic logic for a `call.missed` event and returns:

- `sms.send` action
- `lead.upsert` action
- `followup.schedule` action
- optional owner alert action
- dedupe key and warnings

```ts
import { MissedCallRecoveryPatch, PatchEngine } from '@nss/response-os';

const patch = new MissedCallRecoveryPatch({
  businessName: 'NSS HVAC',
  callbackNumber: '+12025550999',
  timezone: 'America/New_York',
});

const engine = new PatchEngine({ patches: [patch] });

const result = engine.run({
  eventId: 'evt_1',
  type: 'call.missed',
  occurredAt: new Date().toISOString(),
  source: 'twilio',
  payload: {
    fromNumber: '+12025550100',
    toNumber: '+12025550999',
    callSid: 'CA123',
  },
});
```

## Core Money Features (Phase 1)

The package now includes deterministic patch scaffolds for immediate sellable automations:

- Missed call recovery (`call.missed`)
  - immediate SMS response
  - lead upsert action
  - owner notification action
  - timed or next-open follow-up action
- Instant inbound SMS auto-reply (`sms.received`)
  - service category + urgency qualification
  - lead stage update (`contacted`)
  - configurable follow-up sequence (10m, 24h, 3d)
- Appointment booking automation (`sms.received` booking intent)
  - calendar event create action
  - booking confirmation SMS
  - reminder scheduling
- Review booster (`job.completed`)
  - only triggers when lead is `won`
  - delayed or immediate review request
- Micro-CRM lead model
  - stages: `new`, `contacted`, `scheduled`, `estimate_sent`, `won`, `lost`
  - controlled stage transitions

Patch routing supports:
- multiple patch candidates per event type
- patch-level payload matching (`canHandle`)
- optional dedupe store to prevent duplicate automations

## ProposalAgent (Deterministic First)

`ProposalAgent` is a domain agent that returns structured proposal data your existing UI can render directly.

Built-in trade profiles:
- `hvac`
- `plumbing`
- `electrical`
- `renovation` (general apartment renovation)

Agent modes:
- `offline_generate` (deterministic core, works offline)
- `refine` (clarity/persuasion/tightening passes)
- `translate` (`en`/`es`/`it`)
- `qa` (missing info checklist + risk flags)

```ts
import { ProposalAgent } from '@nss/response-os';

const agent = new ProposalAgent();
const output = await agent.propose({
  goal: 'Prepare HVAC replacement proposal',
  intake: {
    clientName: 'Acme Properties',
    jobType: 'HVAC system replacement',
    squareFootage: 2400,
    materials: ['Condenser unit', 'Thermostat'],
    timeline: '2-3 weeks',
    specialConditions: ['Permit required'],
    includePricing: true,
  },
});

// output.data.proposal -> structured scope, line items, terms, and markdown for PDF rendering
```

## Memory Persistence (What We Have Now)

Use `KeyValueMemoryStore` to persist state on any key-value backend available today (for example AsyncStorage).

```ts
import { KeyValueMemoryStore } from '@nss/response-os';

const memoryStore = new KeyValueMemoryStore({
  namespace: 'my-app',
  adapter: {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => localStorage.setItem(key, value),
    getAllKeys: async () => Object.keys(localStorage),
  },
});
```

Planned for later:
- Cloud/SQL adapters (SQLite/Postgres/Supabase)
- Shared multi-user persistence service
