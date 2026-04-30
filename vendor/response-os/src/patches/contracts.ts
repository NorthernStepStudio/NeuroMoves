import type { AnyResponseOsEvent } from '../events/contracts.js';

export type PatchId =
  | 'missed-call-recovery'
  | 'auto-reply-inbound-sms'
  | 'appointment-booking'
  | 'review-booster'
  | 'proposal-generator';
export type PatchStatus = 'completed' | 'needs_human' | 'ignored' | 'failed';

export interface PatchToolAction {
  tool:
    | 'sms.send'
    | 'call.voicemail_drop'
    | 'email.send'
    | 'lead.upsert'
    | 'followup.schedule'
    | 'notify.owner'
    | 'calendar.create_event'
    | 'webhook.post';
  input: Record<string, unknown>;
}

export interface PatchLeadSnapshot {
  phone: string;
  status: 'new' | 'contacted' | 'scheduled' | 'estimate_sent' | 'won' | 'lost' | 'booked' | 'closed';
  source: string;
  lastEventAt: string;
}

export interface PatchExecutionResult {
  patchId: PatchId | 'none';
  status: PatchStatus;
  summary: string;
  dedupeKey?: string;
  actions: PatchToolAction[];
  warnings: string[];
  lead?: PatchLeadSnapshot;
  nextActionAt?: string;
}

export interface PatchExecutionContext {
  nowIso?: string;
}

export interface ResponsePatch<TEvent extends AnyResponseOsEvent = AnyResponseOsEvent> {
  readonly id: PatchId;
  readonly supportedEvents: readonly TEvent['type'][];
  readonly priority?: number;
  canHandle?(event: TEvent): boolean;
  run(event: TEvent, context?: PatchExecutionContext): PatchExecutionResult;
}
