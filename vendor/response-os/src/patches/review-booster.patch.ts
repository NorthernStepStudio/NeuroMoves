import { createDefaultBusinessProfile, renderBusinessTemplate, type BusinessProfile } from '../business/profile.js';
import { isJobCompletedEvent, type JobCompletedEvent } from '../events/contracts.js';
import type { PatchExecutionContext, PatchExecutionResult, PatchToolAction, ResponsePatch } from './contracts.js';

export interface ReviewBoosterPatchConfig {
  profile?: Partial<BusinessProfile>;
  defaultReviewUrl?: string;
  delayHours?: number;
}

export class ReviewBoosterPatch implements ResponsePatch<JobCompletedEvent> {
  readonly id = 'review-booster' as const;
  readonly supportedEvents = ['job.completed'] as const;
  readonly priority = 20;
  private readonly profile: BusinessProfile;
  private readonly defaultReviewUrl?: string;
  private readonly delayHours: number;

  constructor(config: ReviewBoosterPatchConfig = {}) {
    this.profile = createDefaultBusinessProfile(config.profile);
    this.defaultReviewUrl = config.defaultReviewUrl?.trim();
    this.delayHours = normalizeDelayHours(config.delayHours);
  }

  run(event: JobCompletedEvent, context: PatchExecutionContext = {}): PatchExecutionResult {
    if (!isJobCompletedEvent(event)) {
      return {
        patchId: this.id,
        status: 'failed',
        summary: 'ReviewBoosterPatch received unsupported event payload.',
        actions: [],
        warnings: ['Patch expected job.completed payload.'],
      };
    }

    if (event.payload.leadStatus !== 'won') {
      return {
        patchId: this.id,
        status: 'ignored',
        summary: 'Review request skipped because lead is not marked won.',
        actions: [],
        warnings: ['Review booster sends only for won jobs.'],
      };
    }

    const reviewUrl = event.payload.reviewUrl || this.defaultReviewUrl;
    if (!reviewUrl) {
      return {
        patchId: this.id,
        status: 'needs_human',
        summary: 'Review URL is missing; cannot send review booster message.',
        actions: [],
        warnings: ['Set reviewUrl on event payload or patch config.'],
      };
    }

    const nowIso = context.nowIso ?? new Date().toISOString();
    const dedupeKey = `review:${event.payload.leadId}:${event.payload.completedAt}`;
    const callbackNumber = this.profile.callbackNumber || '';
    const smsBody = renderBusinessTemplate(this.profile.templates.reviewRequest, {
      business_name: this.profile.businessName,
      review_url: reviewUrl,
    });

    const actions: PatchToolAction[] = [];
    let nextActionAt: string | undefined;
    if (this.delayHours > 0) {
      nextActionAt = new Date(Date.parse(nowIso) + this.delayHours * 60 * 60_000).toISOString();
      actions.push({
        tool: 'followup.schedule',
        input: {
          strategy: 'review_delay',
          at: nextActionAt,
          to: event.payload.leadPhone,
          body: smsBody,
          from: callbackNumber,
          dedupeKey,
        },
      });
    } else {
      actions.push({
        tool: 'sms.send',
        input: {
          to: event.payload.leadPhone,
          from: callbackNumber,
          body: smsBody,
          dedupeKey,
        },
      });
    }

    actions.push({
      tool: 'lead.upsert',
      input: {
        dedupeKey,
        tenantId: event.tenantId,
        lead: {
          leadId: event.payload.leadId,
          phone: event.payload.leadPhone,
          stage: 'won',
          source: 'job_completed',
          tags: ['review_requested'],
          lastEventAt: nowIso,
        },
      },
    });

    return {
      patchId: this.id,
      status: 'completed',
      summary: this.delayHours > 0 ? 'Review request scheduled.' : 'Review request sent.',
      dedupeKey,
      actions,
      warnings: [],
      lead: {
        phone: event.payload.leadPhone,
        status: 'won',
        source: 'job_completed',
        lastEventAt: nowIso,
      },
      nextActionAt,
    };
  }
}

function normalizeDelayHours(value?: number): number {
  if (!Number.isFinite(value)) return 24;
  return Math.max(0, Math.min(72, Math.round(Number(value))));
}
