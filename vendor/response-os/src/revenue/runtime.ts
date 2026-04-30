import { createDefaultBusinessProfile, type BusinessProfile } from '../business/profile.js';
import { createRuntimeContext } from '../context/runtime-context.js';
import type { AnyResponseOsEvent } from '../events/contracts.js';
import { AppointmentBookingPatch } from '../patches/appointment-booking.patch.js';
import { AutoReplyInboundPatch } from '../patches/auto-reply-inbound.patch.js';
import { type PatchDedupeStore, PatchEngine } from '../patches/engine.js';
import { MissedCallRecoveryPatch } from '../patches/missed-call-recovery.patch.js';
import type { PatchExecutionResult, ResponsePatch } from '../patches/contracts.js';
import { ReviewBoosterPatch } from '../patches/review-booster.patch.js';
import type { ToolExecutor } from '../tools/executor.js';
import type { ToolExecutionResult } from '../tools/contracts.js';
import type { InMemoryRevenueMetricsStore, RevenueMetricsSnapshot } from './metrics.js';

export interface RevenueRuntimeOptions {
  profileStore: BusinessProfileStore;
  toolExecutor?: ToolExecutor;
  dedupeStore?: PatchDedupeStore;
  dedupeTtlSeconds?: number;
  appId?: string;
  metricsStore?: InMemoryRevenueMetricsStore;
}

export interface RevenueRuntimeProcessInput {
  event: AnyResponseOsEvent;
  nowIso?: string;
}

export interface RevenueRuntimeActionOutcome {
  toolId: string;
  ok: boolean;
  attempts: number;
  output?: unknown;
  error?: ToolExecutionResult['error'];
}

export interface RevenueRuntimeProcessResult {
  eventId: string;
  tenantId?: string;
  patch: PatchExecutionResult;
  actionResults: RevenueRuntimeActionOutcome[];
  metrics?: RevenueMetricsSnapshot;
}

export interface BusinessProfileStore {
  get(tenantId?: string): Promise<BusinessProfile>;
  upsert(profile: BusinessProfile): Promise<void>;
  list(): Promise<BusinessProfile[]>;
}

export class InMemoryBusinessProfileStore implements BusinessProfileStore {
  private readonly profiles = new Map<string, BusinessProfile>();
  private readonly defaultTenantId: string;

  constructor(input: { defaultProfile?: Partial<BusinessProfile>; defaultTenantId?: string } = {}) {
    this.defaultTenantId = input.defaultTenantId?.trim() || 'default';
    const defaultProfile = createDefaultBusinessProfile({
      businessId: this.defaultTenantId,
      ...(input.defaultProfile ?? {}),
    });
    this.profiles.set(this.defaultTenantId, defaultProfile);
  }

  async get(tenantId?: string): Promise<BusinessProfile> {
    const key = tenantId?.trim() || this.defaultTenantId;
    const existing = this.profiles.get(key);
    if (existing) return existing;

    const created = createDefaultBusinessProfile({
      businessId: key,
    });
    this.profiles.set(key, created);
    return created;
  }

  async upsert(profile: BusinessProfile): Promise<void> {
    const key = profile.businessId.trim() || this.defaultTenantId;
    this.profiles.set(key, profile);
  }

  async list(): Promise<BusinessProfile[]> {
    return [...this.profiles.values()];
  }
}

export class RevenueRuntime {
  private readonly profileStore: BusinessProfileStore;
  private readonly toolExecutor?: ToolExecutor;
  private readonly dedupeStore?: PatchDedupeStore;
  private readonly dedupeTtlSeconds: number;
  private readonly appId: string;
  private readonly metricsStore?: InMemoryRevenueMetricsStore;

  constructor(options: RevenueRuntimeOptions) {
    this.profileStore = options.profileStore;
    this.toolExecutor = options.toolExecutor;
    this.dedupeStore = options.dedupeStore;
    this.dedupeTtlSeconds = Math.max(30, options.dedupeTtlSeconds ?? 300);
    this.appId = options.appId?.trim() || 'responseos-revenue-runtime';
    this.metricsStore = options.metricsStore;
  }

  async process(input: RevenueRuntimeProcessInput): Promise<RevenueRuntimeProcessResult> {
    const profile = await this.profileStore.get(input.event.tenantId);
    const patchEngine = new PatchEngine({
      patches: createRevenuePatchPack(profile),
      dedupeStore: this.dedupeStore,
      dedupeTtlSeconds: this.dedupeTtlSeconds,
    });

    const patchResult = await patchEngine.run(input.event, {
      nowIso: input.nowIso,
    });
    const actionResults = await this.executePatchActions(input.event, patchResult);
    const metrics = this.metricsStore?.record({
      tenantId: input.event.tenantId,
      patch: patchResult,
      actionResults: actionResults.map((item) => ({ ok: item.ok, toolId: item.toolId })),
    });

    return {
      eventId: input.event.eventId,
      tenantId: input.event.tenantId,
      patch: patchResult,
      actionResults,
      metrics,
    };
  }

  private async executePatchActions(
    event: AnyResponseOsEvent,
    patchResult: PatchExecutionResult
  ): Promise<RevenueRuntimeActionOutcome[]> {
    if (!this.toolExecutor || patchResult.actions.length === 0) {
      return [];
    }

    const runtimeContext = createRuntimeContext({
      appId: this.appId,
      userId: inferUserId(event),
      sessionId: event.eventId,
      platform: 'backend',
      policyProfile: 'general',
    });

    const outcomes: RevenueRuntimeActionOutcome[] = [];
    for (const [index, action] of patchResult.actions.entries()) {
      const result = await this.toolExecutor.execute({
        toolId: action.tool,
        input: action.input,
        context: {
          runtimeContext,
          traceId: runtimeContext.requestTraceId,
        },
        idempotencyKey: `${patchResult.dedupeKey ?? event.eventId}:${index}:${action.tool}`,
      });

      outcomes.push({
        toolId: result.toolId,
        ok: result.ok,
        attempts: result.attempts,
        output: result.output,
        error: result.error,
      });
    }

    return outcomes;
  }
}

export function createRevenuePatchPack(profile: BusinessProfile): ResponsePatch[] {
  return [
    new MissedCallRecoveryPatch({
      businessName: profile.businessName,
      callbackNumber: profile.callbackNumber,
      timezone: profile.timezone,
      services: profile.services,
      schedule: profile.hours,
    }),
    new AppointmentBookingPatch({
      profile,
    }),
    new AutoReplyInboundPatch({
      profile,
    }),
    new ReviewBoosterPatch({
      profile,
    }),
  ];
}

function inferUserId(event: AnyResponseOsEvent): string | undefined {
  if (event.type === 'call.missed') {
    return event.payload.fromNumber;
  }
  if (event.type === 'sms.received') {
    return event.payload.fromNumber;
  }
  if (event.type === 'job.completed') {
    return event.payload.leadPhone;
  }
  return undefined;
}
