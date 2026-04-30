import type { AnyResponseOsEvent } from '../events/contracts.js';
import type { PatchExecutionContext, PatchExecutionResult, ResponsePatch } from './contracts.js';

export interface PatchDedupeStore {
  has(key: string): boolean | Promise<boolean>;
  set(key: string, ttlSeconds?: number): void | Promise<void>;
}

export class InMemoryPatchDedupeStore implements PatchDedupeStore {
  private readonly values = new Map<string, number>();

  has(key: string): boolean {
    const expiresAt = this.values.get(key);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      this.values.delete(key);
      return false;
    }
    return true;
  }

  set(key: string, ttlSeconds = 300): void {
    const ttl = Math.max(30, ttlSeconds);
    this.values.set(key, Date.now() + ttl * 1000);
  }
}

export interface PatchEngineOptions {
  patches?: ResponsePatch[];
  routes?: Partial<Record<AnyResponseOsEvent['type'], ResponsePatch['id'] | ResponsePatch['id'][]>>;
  dedupeStore?: PatchDedupeStore;
  dedupeTtlSeconds?: number;
}

const DEFAULT_ROUTES: Record<AnyResponseOsEvent['type'], ResponsePatch['id'] | ResponsePatch['id'][] | undefined> = {
  'call.missed': 'missed-call-recovery',
  'sms.received': ['appointment-booking', 'auto-reply-inbound-sms'],
  'form.submitted': undefined,
  'appointment.booked': undefined,
  'appointment.cancelled': undefined,
  'operator.handled': undefined,
  'job.completed': 'review-booster',
};

export class PatchEngine {
  private readonly patchesById: Map<ResponsePatch['id'], ResponsePatch>;
  private readonly routes: Record<AnyResponseOsEvent['type'], ResponsePatch['id'] | ResponsePatch['id'][] | undefined>;
  private readonly dedupeStore?: PatchDedupeStore;
  private readonly dedupeTtlSeconds: number;

  constructor(options: PatchEngineOptions = {}) {
    this.patchesById = new Map((options.patches ?? []).map((patch) => [patch.id, patch]));
    this.routes = {
      ...DEFAULT_ROUTES,
      ...(options.routes ?? {}),
    };
    this.dedupeStore = options.dedupeStore;
    this.dedupeTtlSeconds = Math.max(30, options.dedupeTtlSeconds ?? 300);
  }

  register(patch: ResponsePatch): void {
    this.patchesById.set(patch.id, patch);
  }

  async run(event: AnyResponseOsEvent, context?: PatchExecutionContext): Promise<PatchExecutionResult> {
    const eventDedupeKey = createEventDedupeKey(event);
    if (eventDedupeKey && this.dedupeStore && (await this.dedupeStore.has(eventDedupeKey))) {
      return {
        patchId: 'none',
        status: 'ignored',
        summary: `Duplicate event ignored for key "${eventDedupeKey}".`,
        dedupeKey: eventDedupeKey,
        actions: [],
        warnings: ['Event dedupe prevented duplicate automation execution.'],
      };
    }

    const configured = this.routes[event.type];
    const patchCandidates = resolvePatchCandidates(configured, this.patchesById, event.type);
    if (patchCandidates.length === 0) {
      return {
        patchId: 'none',
        status: 'ignored',
        summary: `No patch route configured for event type "${event.type}".`,
        actions: [],
        warnings: [`Event "${event.type}" was received but no patch route is configured.`],
      };
    }

    let selectedPatch: ResponsePatch | undefined;
    for (const patch of patchCandidates) {
      if (patch.canHandle && !patch.canHandle(event as Parameters<NonNullable<typeof patch.canHandle>>[0])) {
        continue;
      }
      selectedPatch = patch;
      break;
    }

    if (!selectedPatch) {
      return {
        patchId: 'none',
        status: 'ignored',
        summary: `No eligible patch accepted event type "${event.type}".`,
        actions: [],
        warnings: [`Patches are configured for "${event.type}" but none accepted this payload.`],
      };
    }

    if (!selectedPatch.supportedEvents.includes(event.type)) {
      return {
        patchId: selectedPatch.id,
        status: 'failed',
        summary: `Patch "${selectedPatch.id}" does not support "${event.type}".`,
        actions: [],
        warnings: [`Invalid patch-event mapping for "${event.type}" -> "${selectedPatch.id}".`],
      };
    }

    const result = selectedPatch.run(event as Parameters<typeof selectedPatch.run>[0], context);
    const dedupeKey = result.dedupeKey ?? eventDedupeKey;
    if (this.dedupeStore && result.status === 'completed') {
      if (eventDedupeKey) {
        await this.dedupeStore.set(eventDedupeKey, this.dedupeTtlSeconds);
      }
      if (dedupeKey && dedupeKey !== eventDedupeKey) {
        await this.dedupeStore.set(dedupeKey, this.dedupeTtlSeconds);
      }
    }
    if (!result.dedupeKey && dedupeKey) {
      return {
        ...result,
        dedupeKey,
      };
    }
    return result;
  }
}

function resolvePatchCandidates(
  configured: ResponsePatch['id'] | ResponsePatch['id'][] | undefined,
  patchMap: Map<ResponsePatch['id'], ResponsePatch>,
  eventType: AnyResponseOsEvent['type']
): ResponsePatch[] {
  if (configured) {
    const routeIds = Array.isArray(configured) ? configured : [configured];
    return routeIds
      .map((id) => patchMap.get(id))
      .filter((value): value is ResponsePatch => Boolean(value))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  return [...patchMap.values()]
    .filter((patch) => patch.supportedEvents.includes(eventType))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

function createEventDedupeKey(event: AnyResponseOsEvent): string {
  if (event.type === 'call.missed') {
    return `evt:call.missed:${event.payload.callSid}`;
  }
  if (event.type === 'sms.received') {
    const sid = event.payload.messageSid ?? event.eventId;
    return `evt:sms.received:${sid}`;
  }
  if (event.type === 'job.completed') {
    return `evt:job.completed:${event.payload.leadId}:${event.payload.completedAt}`;
  }
  return `evt:${event.type}:${event.eventId}`;
}
