import {
  createDefaultBusinessProfile,
  findNextOpenWindow,
  looksLikePhone,
  renderBusinessTemplate,
  resolveBusinessWindow,
  type BusinessProfile,
} from '../business/profile.js';
import { isSmsReceivedEvent, type SmsReceivedEvent } from '../events/contracts.js';
import { buildIntakePrompt, qualifyInboundMessage } from '../revenue/qualification.js';
import type { PatchExecutionContext, PatchExecutionResult, PatchToolAction, ResponsePatch } from './contracts.js';

export interface AutoReplyInboundPatchConfig {
  profile?: Partial<BusinessProfile>;
  ownerAlertDestination?: string;
  followupEnabled?: boolean;
}

export class AutoReplyInboundPatch implements ResponsePatch<SmsReceivedEvent> {
  readonly id = 'auto-reply-inbound-sms' as const;
  readonly supportedEvents = ['sms.received'] as const;
  readonly priority = 10;
  private readonly profile: BusinessProfile;
  private readonly ownerAlertDestination?: string;
  private readonly followupEnabled: boolean;

  constructor(config: AutoReplyInboundPatchConfig = {}) {
    this.profile = createDefaultBusinessProfile(config.profile);
    this.ownerAlertDestination = config.ownerAlertDestination?.trim();
    this.followupEnabled = config.followupEnabled ?? true;
  }

  canHandle(event: SmsReceivedEvent): boolean {
    if (!isSmsReceivedEvent(event)) return false;
    const text = event.payload.body.toLowerCase();
    return !/\b(book|schedule|appointment|slot)\b/.test(text);
  }

  run(event: SmsReceivedEvent, context: PatchExecutionContext = {}): PatchExecutionResult {
    if (!isSmsReceivedEvent(event)) {
      return {
        patchId: this.id,
        status: 'failed',
        summary: 'AutoReplyInboundPatch received unsupported event payload.',
        actions: [],
        warnings: ['Patch expected sms.received payload.'],
      };
    }

    const nowIso = context.nowIso ?? new Date().toISOString();
    const occurredAt = isIsoDate(event.occurredAt) ? event.occurredAt : nowIso;
    const validation = validateSmsEvent(event);
    if (validation.length > 0) {
      return {
        patchId: this.id,
        status: 'needs_human',
        summary: 'Inbound SMS payload is incomplete and needs manual review.',
        actions: [],
        warnings: validation,
      };
    }

    const qualification = qualifyInboundMessage(event.payload.body, {
      emergencyKeywords: this.profile.emergencyPolicy.emergencyKeywords,
    });
    const window = resolveBusinessWindow(occurredAt, this.profile.timezone, this.profile.hours);
    const callbackNumber = this.profile.callbackNumber || event.payload.toNumber;
    const dedupeKey = `inbound:${event.payload.messageSid ?? event.eventId}`;
    const leadId = `lead_${event.payload.fromNumber.replace(/\D/g, '').slice(-10)}_${Date.parse(occurredAt).toString(36)}`;

    const template = window.isOpen
      ? this.profile.templates.inboundAutoReplyOpen
      : this.profile.templates.inboundAutoReplyAfterHours;
    const baseBody = renderBusinessTemplate(template, {
      business_name: this.profile.businessName,
    });
    const smsBody =
      qualification.missingFields.length > 0
        ? `${baseBody} ${buildIntakePrompt(qualification.missingFields)}`
        : baseBody;

    const actions: PatchToolAction[] = [
      {
        tool: 'lead.upsert',
        input: {
          dedupeKey,
          lead: {
            leadId,
            phone: event.payload.fromNumber,
            stage: 'contacted',
            source: 'sms_inbound',
            address: qualification.extractedAddress,
            serviceCategory: qualification.serviceCategory,
            urgencyScore: qualification.urgencyScore,
            tags: qualification.tags,
            lastEventAt: occurredAt,
          },
          tenantId: event.tenantId,
        },
      },
    ];

    if (!qualification.isSpam) {
      actions.push({
        tool: 'sms.send',
        input: {
          to: event.payload.fromNumber,
          from: callbackNumber,
          body: smsBody,
          dedupeKey,
        },
      });
    }

    if ((qualification.hotLead || qualification.isSpam) && this.ownerAlertDestination) {
      actions.push({
        tool: 'notify.owner',
        input: {
          destination: this.ownerAlertDestination,
          channel: inferOwnerAlertChannel(this.ownerAlertDestination),
          message: qualification.isSpam
            ? `Potential spam SMS captured from ${event.payload.fromNumber}.`
            : `Hot lead detected (${qualification.serviceCategory}) from ${event.payload.fromNumber}.`,
          urgencyScore: qualification.urgencyScore,
          spamScore: qualification.spamScore,
          dedupeKey,
        },
      });
    }

    if (this.followupEnabled && !qualification.isSpam) {
      if (window.isOpen) {
        const followup10mAt = new Date(Date.parse(nowIso) + 10 * 60_000).toISOString();
        const followup24hAt = new Date(Date.parse(nowIso) + 24 * 60 * 60_000).toISOString();
        const followup3dAt = new Date(Date.parse(nowIso) + 72 * 60 * 60_000).toISOString();
        actions.push(
          {
            tool: 'followup.schedule',
            input: {
              strategy: 'no_reply_timeout',
              waitMinutes: 10,
              at: followup10mAt,
              to: event.payload.fromNumber,
              body: renderBusinessTemplate(this.profile.templates.inboundFollowup10m, {
                business_name: this.profile.businessName,
              }),
              dedupeKey,
            },
          },
          {
            tool: 'followup.schedule',
            input: {
              strategy: 'timed',
              waitHours: 24,
              at: followup24hAt,
              to: event.payload.fromNumber,
              body: renderBusinessTemplate(this.profile.templates.inboundFollowup24h, {
                business_name: this.profile.businessName,
              }),
              dedupeKey,
            },
          },
          {
            tool: 'followup.schedule',
            input: {
              strategy: 'timed',
              waitHours: 72,
              at: followup3dAt,
              to: event.payload.fromNumber,
              body: renderBusinessTemplate(this.profile.templates.inboundFollowup3d, {
                business_name: this.profile.businessName,
              }),
              dedupeKey,
            },
          }
        );
      } else {
        const nextOpen = findNextOpenWindow(occurredAt, this.profile.timezone, this.profile.hours);
        actions.push({
          tool: 'followup.schedule',
          input: {
            strategy: 'next_open_window',
            day: nextOpen.day,
            localTime: nextOpen.open,
            timezone: this.profile.timezone,
            to: event.payload.fromNumber,
            dedupeKey,
          },
        });
      }
    }

    const warnings: string[] = [];
    if (!looksLikePhone(event.payload.fromNumber)) {
      warnings.push(`Caller number "${event.payload.fromNumber}" is not in expected E.164 format.`);
    }
    if (!looksLikePhone(event.payload.toNumber)) {
      warnings.push(`Business number "${event.payload.toNumber}" is not in expected E.164 format.`);
    }
    if (!window.isOpen) {
      warnings.push('Inbound text received outside business hours; next-open follow-up scheduled.');
    }
    if (qualification.isSpam) {
      warnings.push(`Inbound SMS marked as potential spam (score ${qualification.spamScore}).`);
    }
    if (qualification.missingFields.length > 0) {
      warnings.push(`Intake is incomplete: missing ${qualification.missingFields.join(', ')}.`);
    }

    return {
      patchId: this.id,
      status: 'completed',
      summary: qualification.isSpam
        ? 'Inbound SMS captured as potential spam for manual review.'
        : qualification.hotLead
        ? 'Inbound SMS auto-replied and escalated as hot lead.'
        : 'Inbound SMS auto-replied and lead captured.',
      dedupeKey,
      actions,
      warnings,
      lead: {
        phone: event.payload.fromNumber,
        status: 'contacted',
        source: 'sms_inbound',
        lastEventAt: occurredAt,
      },
    };
  }
}

function validateSmsEvent(event: SmsReceivedEvent): string[] {
  const issues: string[] = [];
  if (!event.eventId?.trim()) issues.push('eventId is required.');
  if (!event.payload.fromNumber?.trim()) issues.push('payload.fromNumber is required.');
  if (!event.payload.toNumber?.trim()) issues.push('payload.toNumber is required.');
  if (!event.payload.body?.trim()) issues.push('payload.body is required.');
  if (!isIsoDate(event.occurredAt)) issues.push('occurredAt must be an ISO timestamp.');
  return issues;
}

function inferOwnerAlertChannel(destination: string): 'sms' | 'email' {
  return destination.includes('@') ? 'email' : 'sms';
}

function isIsoDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return Number.isFinite(Date.parse(value));
}
