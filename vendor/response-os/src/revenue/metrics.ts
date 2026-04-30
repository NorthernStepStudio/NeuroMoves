import type { PatchExecutionResult } from '../patches/contracts.js';

export interface RevenueMetricsSnapshot {
  eventsProcessed: number;
  missedCallsRecovered: number;
  inboundAutoReplies: number;
  appointmentsBooked: number;
  reviewsTriggered: number;
  hotLeads: number;
  spamCaptured: number;
  actionSuccess: number;
  actionFailures: number;
  lastUpdatedAt?: string;
}

export interface RevenueMetricsInput {
  tenantId?: string;
  patch: PatchExecutionResult;
  actionResults: Array<{
    ok: boolean;
    toolId: string;
  }>;
}

export class InMemoryRevenueMetricsStore {
  private readonly totals = new Map<string, RevenueMetricsSnapshot>();
  private static readonly DEFAULT_TENANT = 'default';

  record(input: RevenueMetricsInput): RevenueMetricsSnapshot {
    const tenantId = input.tenantId?.trim() || InMemoryRevenueMetricsStore.DEFAULT_TENANT;
    const base = this.totals.get(tenantId) ?? createInitialMetrics();
    const next: RevenueMetricsSnapshot = {
      ...base,
      eventsProcessed: base.eventsProcessed + 1,
      lastUpdatedAt: new Date().toISOString(),
    };

    if (input.patch.patchId === 'missed-call-recovery' && input.patch.status === 'completed') {
      next.missedCallsRecovered += 1;
    }
    if (input.patch.patchId === 'auto-reply-inbound-sms' && input.patch.status === 'completed') {
      next.inboundAutoReplies += 1;
    }
    if (input.patch.patchId === 'appointment-booking' && input.patch.status === 'completed') {
      next.appointmentsBooked += 1;
    }
    if (input.patch.patchId === 'review-booster' && input.patch.status === 'completed') {
      next.reviewsTriggered += 1;
    }

    if (containsTag(input.patch, 'hot_lead')) {
      next.hotLeads += 1;
    }
    if (containsTag(input.patch, 'spam')) {
      next.spamCaptured += 1;
    }

    for (const action of input.actionResults) {
      if (action.ok) {
        next.actionSuccess += 1;
      } else {
        next.actionFailures += 1;
      }
    }

    this.totals.set(tenantId, next);
    return next;
  }

  get(tenantId?: string): RevenueMetricsSnapshot {
    const key = tenantId?.trim() || InMemoryRevenueMetricsStore.DEFAULT_TENANT;
    return this.totals.get(key) ?? createInitialMetrics();
  }

  list(): Array<{ tenantId: string; metrics: RevenueMetricsSnapshot }> {
    if (this.totals.size === 0) {
      return [{ tenantId: InMemoryRevenueMetricsStore.DEFAULT_TENANT, metrics: createInitialMetrics() }];
    }
    return [...this.totals.entries()].map(([tenantId, metrics]) => ({
      tenantId,
      metrics,
    }));
  }
}

function createInitialMetrics(): RevenueMetricsSnapshot {
  return {
    eventsProcessed: 0,
    missedCallsRecovered: 0,
    inboundAutoReplies: 0,
    appointmentsBooked: 0,
    reviewsTriggered: 0,
    hotLeads: 0,
    spamCaptured: 0,
    actionSuccess: 0,
    actionFailures: 0,
  };
}

function containsTag(patch: PatchExecutionResult, tag: string): boolean {
  return patch.actions.some((action) => {
    if (action.tool !== 'lead.upsert') return false;
    const lead = action.input.lead as { tags?: string[] } | undefined;
    if (!lead?.tags) return false;
    return lead.tags.some((item) => item.toLowerCase() === tag.toLowerCase());
  });
}
