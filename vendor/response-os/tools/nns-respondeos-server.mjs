import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  InMemoryBusinessProfileStore,
  InMemoryPatchDedupeStore,
  InMemoryRevenueMetricsStore,
  RevenueRuntime,
  ToolExecutor,
  ToolRegistry,
  createDefaultBusinessProfile,
  createRevenueToolset,
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiPath = path.join(__dirname, 'nns-respondeos-ui.html');
const BASE_PORT = Number(process.env.NNS_RESPONDEOS_PORT ?? 4187);
const MAX_PORT_ATTEMPTS = Number(process.env.NNS_RESPONDEOS_PORT_ATTEMPTS ?? 20);
let listenPort = BASE_PORT;

const profileStore = new InMemoryBusinessProfileStore({
  defaultProfile: {
    businessId: 'default',
    businessName: 'NSS Local Services',
    timezone: 'America/New_York',
    callbackNumber: '+12025550999',
    services: ['hvac repair', 'plumbing', 'electrical', 'renovation'],
  },
});
const metricsStore = new InMemoryRevenueMetricsStore();
const dedupeStore = new InMemoryPatchDedupeStore();
const { tools, leadRepository } = createRevenueToolset();
const registry = new ToolRegistry();
for (const tool of tools) {
  registry.register(tool);
}
const toolExecutor = new ToolExecutor({
  registry,
  allowedToolIds: tools.map((tool) => tool.toolId),
});
const runtime = new RevenueRuntime({
  profileStore,
  toolExecutor,
  dedupeStore,
  metricsStore,
});

const server = createServer(async (req, res) => {
  try {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `127.0.0.1:${listenPort}`}`);
    const pathname = url.pathname;

    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const html = await readFile(uiPath, 'utf8');
      send(res, 200, html, 'text/html; charset=utf-8');
      return;
    }

    if (method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'nns-respondeos',
        port: listenPort,
        now: new Date().toISOString(),
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/profile') {
      const tenantId = url.searchParams.get('tenantId') ?? undefined;
      const profile = await profileStore.get(tenantId);
      sendJson(res, 200, { ok: true, profile });
      return;
    }

    if (method === 'PUT' && pathname === '/api/profile') {
      const body = await readJson(req);
      const tenantId = stringOrDefault(body.tenantId, 'default');
      const current = await profileStore.get(tenantId);
      const merged = createDefaultBusinessProfile({
        ...current,
        ...body.profile,
        businessId: tenantId,
      });
      await profileStore.upsert(merged);
      sendJson(res, 200, { ok: true, profile: merged });
      return;
    }

    if (method === 'GET' && pathname === '/api/leads') {
      const tenantId = url.searchParams.get('tenantId') ?? undefined;
      const leads = await leadRepository.list(tenantId);
      sendJson(res, 200, { ok: true, leads });
      return;
    }

    if (method === 'GET' && pathname === '/api/metrics') {
      const tenantId = url.searchParams.get('tenantId') ?? undefined;
      const metrics = metricsStore.get(tenantId);
      sendJson(res, 200, { ok: true, metrics });
      return;
    }

    if (method === 'POST' && pathname.startsWith('/api/events/')) {
      const eventType = decodeURIComponent(pathname.replace('/api/events/', ''));
      const body = await readJson(req);
      const event = body.event ?? buildEvent(eventType, body);
      const output = await runtime.process({
        event,
      });
      sendJson(res, 200, {
        ok: true,
        result: output,
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Route not found.' });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

listenPort = await listenWithPortFallback(server, BASE_PORT, MAX_PORT_ATTEMPTS);
console.log(`[NNS RespondeOS] http://127.0.0.1:${listenPort}`);

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload, null, 2), 'application/json; charset=utf-8');
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function buildEvent(type, body) {
  const now = new Date().toISOString();
  const tenantId = stringOrUndefined(body.tenantId);

  if (type === 'call.missed') {
    return {
      eventId: body.eventId || makeId('evt_call'),
      type: 'call.missed',
      occurredAt: body.occurredAt || now,
      source: body.source || 'nns-respondeos-ui',
      tenantId,
      payload: {
        fromNumber: stringOrDefault(body.fromNumber, '+12025550111'),
        toNumber: stringOrDefault(body.toNumber, '+12025550999'),
        callSid: stringOrDefault(body.callSid, makeId('CA')),
      },
    };
  }

  if (type === 'sms.received') {
    return {
      eventId: body.eventId || makeId('evt_sms'),
      type: 'sms.received',
      occurredAt: body.occurredAt || now,
      source: body.source || 'nns-respondeos-ui',
      tenantId,
      payload: {
        fromNumber: stringOrDefault(body.fromNumber, '+12025550112'),
        toNumber: stringOrDefault(body.toNumber, '+12025550999'),
        body: stringOrDefault(body.body, 'Need help with AC not cooling at 123 Main St'),
        messageSid: body.messageSid || makeId('SM'),
      },
    };
  }

  if (type === 'job.completed') {
    return {
      eventId: body.eventId || makeId('evt_job'),
      type: 'job.completed',
      occurredAt: body.occurredAt || now,
      source: body.source || 'nns-respondeos-ui',
      tenantId,
      payload: {
        leadId: stringOrDefault(body.leadId, makeId('lead')),
        leadPhone: stringOrDefault(body.leadPhone, '+12025550113'),
        leadStatus: body.leadStatus || 'won',
        completedAt: body.completedAt || now,
        reviewUrl: stringOrUndefined(body.reviewUrl),
      },
    };
  }

  throw new Error(`Unsupported event type "${type}".`);
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function stringOrUndefined(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringOrDefault(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

async function listenWithPortFallback(httpServer, startPort, maxAttempts) {
  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const candidatePort = startPort + attempt;
    try {
      await new Promise((resolve, reject) => {
        const onListening = () => {
          httpServer.off('error', onError);
          resolve();
        };
        const onError = (error) => {
          httpServer.off('listening', onListening);
          reject(error);
        };

        httpServer.once('listening', onListening);
        httpServer.once('error', onError);
        httpServer.listen(candidatePort);
      });
      return candidatePort;
    } catch (error) {
      if (error?.code === 'EADDRINUSE' && attempt < maxAttempts) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to bind NNS RespondeOS server starting at port ${startPort} after ${maxAttempts + 1} attempts.`,
  );
}
