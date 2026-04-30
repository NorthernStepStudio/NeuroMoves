import type { MissedCallEvent } from '../events/contracts.js';
import { isMissedCallEvent } from '../events/contracts.js';
import type { PatchExecutionContext, PatchExecutionResult, PatchToolAction, ResponsePatch } from './contracts.js';

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface BusinessDayHours {
  open: string;
  close: string;
}

type BusinessSchedule = Record<Weekday, BusinessDayHours | null>;

interface MissedCallRecoveryConfig {
  businessName: string;
  callbackNumber?: string;
  timezone: string;
  services: string[];
  followupDelayMinutes: number;
  ownerAlertDestination?: string;
  schedule: BusinessSchedule;
}

const DEFAULT_SCHEDULE: BusinessSchedule = {
  monday: { open: '08:00', close: '18:00' },
  tuesday: { open: '08:00', close: '18:00' },
  wednesday: { open: '08:00', close: '18:00' },
  thursday: { open: '08:00', close: '18:00' },
  friday: { open: '08:00', close: '18:00' },
  saturday: { open: '09:00', close: '14:00' },
  sunday: null,
};

const WEEKDAY_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export class MissedCallRecoveryPatch implements ResponsePatch<MissedCallEvent> {
  readonly id = 'missed-call-recovery' as const;
  readonly supportedEvents = ['call.missed'] as const;
  private readonly config: MissedCallRecoveryConfig;

  constructor(config: Partial<MissedCallRecoveryConfig> = {}) {
    this.config = {
      businessName: config.businessName?.trim() || 'Your Business',
      callbackNumber: config.callbackNumber?.trim(),
      timezone: config.timezone?.trim() || 'America/New_York',
      services: normalizeServices(config.services),
      followupDelayMinutes: normalizeFollowupDelay(config.followupDelayMinutes),
      ownerAlertDestination: config.ownerAlertDestination?.trim(),
      schedule: {
        ...DEFAULT_SCHEDULE,
        ...(config.schedule ?? {}),
      },
    };
  }

  run(event: MissedCallEvent, context: PatchExecutionContext = {}): PatchExecutionResult {
    if (!isMissedCallEvent(event)) {
      return {
        patchId: this.id,
        status: 'failed',
        summary: 'MissedCallRecoveryPatch received an unsupported event payload.',
        actions: [],
        warnings: ['Patch expected call.missed input.'],
      };
    }

    const validationWarnings = validateMissedCallEvent(event);
    if (validationWarnings.length > 0) {
      return {
        patchId: this.id,
        status: 'needs_human',
        summary: 'Missed call event is incomplete and needs manual review.',
        actions: [],
        warnings: validationWarnings,
      };
    }

    const nowIso = context.nowIso ?? new Date().toISOString();
    const callIso = isIsoDate(event.occurredAt) ? event.occurredAt : nowIso;
    const businessWindow = resolveBusinessWindow(callIso, this.config.timezone, this.config.schedule);
    const callbackNumber = this.config.callbackNumber || event.payload.toNumber;
    const dedupeKey = buildDedupeKey(event);

    const lead = {
      phone: event.payload.fromNumber,
      status: 'new' as const,
      source: 'missed_call',
      lastEventAt: callIso,
    };

    const smsBody = businessWindow.isOpen
      ? buildOpenHoursMessage(this.config.businessName, callbackNumber)
      : buildClosedHoursMessage(this.config.businessName, this.config.services);

    const actions: PatchToolAction[] = [
      {
        tool: 'lead.upsert',
        input: {
          dedupeKey,
          tenantId: event.tenantId,
          lead,
          tags: ['missed_call'],
        },
      },
      {
        tool: 'sms.send',
        input: {
          to: event.payload.fromNumber,
          from: callbackNumber,
          body: smsBody,
          dedupeKey,
        },
      },
    ];

    if (this.config.ownerAlertDestination) {
      actions.push({
        tool: 'notify.owner',
        input: {
          destination: this.config.ownerAlertDestination,
          channel: inferOwnerAlertChannel(this.config.ownerAlertDestination),
          message: `Missed call captured from ${event.payload.fromNumber}. Auto-reply sent.`,
          leadPhone: event.payload.fromNumber,
          dedupeKey,
        },
      });
    }

    let nextActionAt: string | undefined;
    if (businessWindow.isOpen) {
      const followupAtIso = new Date(Date.parse(nowIso) + this.config.followupDelayMinutes * 60_000).toISOString();
      actions.push({
        tool: 'followup.schedule',
        input: {
          strategy: 'no_reply_timeout',
          waitMinutes: this.config.followupDelayMinutes,
          at: followupAtIso,
          to: event.payload.fromNumber,
          reason: 'No reply after missed-call recovery SMS.',
          dedupeKey,
        },
      });
      nextActionAt = followupAtIso;
    } else {
      const nextOpen = findNextOpenWindow(callIso, this.config.timezone, this.config.schedule);
      actions.push({
        tool: 'followup.schedule',
        input: {
          strategy: 'next_open_window',
          timezone: this.config.timezone,
          day: nextOpen.day,
          localTime: nextOpen.open,
          to: event.payload.fromNumber,
          reason: 'Follow up during next business open window.',
          dedupeKey,
        },
      });
    }

    const warnings = [
      ...formatPhoneWarnings(event.payload.fromNumber, event.payload.toNumber),
      ...(businessWindow.isOpen ? [] : ['Business is closed at call time. Follow-up scheduled for next open window.']),
    ];

    return {
      patchId: this.id,
      status: 'completed',
      summary: businessWindow.isOpen
        ? 'Missed call recovered: SMS sent and follow-up timer started.'
        : 'Missed call recovered after-hours: SMS sent and follow-up queued for open hours.',
      dedupeKey,
      actions,
      warnings,
      lead,
      nextActionAt,
    };
  }
}

function normalizeServices(services?: string[]): string[] {
  const list = (services ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
  return list.length > 0 ? list : ['service request', 'estimate', 'appointment'];
}

function normalizeFollowupDelay(value?: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.max(5, Math.min(45, Math.round(Number(value))));
}

function validateMissedCallEvent(event: MissedCallEvent): string[] {
  const issues: string[] = [];
  if (!event.eventId?.trim()) issues.push('eventId is required.');
  if (!event.payload.fromNumber?.trim()) issues.push('payload.fromNumber is required.');
  if (!event.payload.toNumber?.trim()) issues.push('payload.toNumber is required.');
  if (!event.payload.callSid?.trim()) issues.push('payload.callSid is required.');
  if (!isIsoDate(event.occurredAt)) issues.push('occurredAt must be an ISO timestamp.');
  return issues;
}

function buildDedupeKey(event: MissedCallEvent): string {
  const timeBucket = event.occurredAt.slice(0, 16);
  return `missed:${event.payload.callSid}:${event.payload.fromNumber}:${timeBucket}`;
}

function buildOpenHoursMessage(businessName: string, callbackNumber: string): string {
  return `Sorry we missed your call to ${businessName}. Reply with what you need and we will call you back from ${callbackNumber}.`;
}

function buildClosedHoursMessage(businessName: string, services: string[]): string {
  const options = services
    .slice(0, 3)
    .map((service, index) => `${index + 1}=${service}`)
    .join(', ');
  return `Thanks for calling ${businessName}. We are currently closed. Reply with ${options} and we will follow up when we open.`;
}

function resolveBusinessWindow(
  iso: string,
  timezone: string,
  schedule: BusinessSchedule
): { day: Weekday; localMinutes: number; isOpen: boolean } {
  const date = new Date(iso);
  const day = toWeekdayKey(formatDatePart(date, timezone, 'weekday'));
  const hours = schedule[day];
  const localMinutes = toLocalMinutes(formatDatePart(date, timezone, 'time'));
  if (!hours) {
    return {
      day,
      localMinutes,
      isOpen: false,
    };
  }

  const openMinutes = parseTime(hours.open);
  const closeMinutes = parseTime(hours.close);
  return {
    day,
    localMinutes,
    isOpen: localMinutes >= openMinutes && localMinutes < closeMinutes,
  };
}

function findNextOpenWindow(
  iso: string,
  timezone: string,
  schedule: BusinessSchedule
): { day: Weekday; open: string } {
  const date = new Date(iso);
  const currentDay = toWeekdayKey(formatDatePart(date, timezone, 'weekday'));
  const currentTimeMinutes = toLocalMinutes(formatDatePart(date, timezone, 'time'));
  const startIndex = WEEKDAY_ORDER.indexOf(currentDay);

  for (let offset = 0; offset < WEEKDAY_ORDER.length; offset += 1) {
    const day = WEEKDAY_ORDER[(startIndex + offset) % WEEKDAY_ORDER.length];
    const hours = schedule[day];
    if (!hours) continue;
    const openMinutes = parseTime(hours.open);
    if (offset === 0 && currentTimeMinutes < openMinutes) {
      return { day, open: hours.open };
    }
    if (offset > 0) {
      return { day, open: hours.open };
    }
  }

  return { day: 'monday', open: '08:00' };
}

function toWeekdayKey(value: string): Weekday {
  const key = value.toLowerCase().trim();
  if (key === 'monday') return 'monday';
  if (key === 'tuesday') return 'tuesday';
  if (key === 'wednesday') return 'wednesday';
  if (key === 'thursday') return 'thursday';
  if (key === 'friday') return 'friday';
  if (key === 'saturday') return 'saturday';
  return 'sunday';
}

function formatDatePart(date: Date, timezone: string, part: 'weekday' | 'time'): string {
  if (part === 'weekday') {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: timezone,
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

function toLocalMinutes(localTime: string): number {
  const [hourText, minuteText] = localTime.split(':');
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function parseTime(value: string): number {
  const [hourText, minuteText] = value.split(':');
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function inferOwnerAlertChannel(destination: string): 'sms' | 'email' {
  return destination.includes('@') ? 'email' : 'sms';
}

function isIsoDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function formatPhoneWarnings(from: string, to: string): string[] {
  const warnings: string[] = [];
  if (!looksLikePhone(from)) warnings.push(`Caller number "${from}" is not in expected E.164 format.`);
  if (!looksLikePhone(to)) warnings.push(`Destination number "${to}" is not in expected E.164 format.`);
  return warnings;
}

function looksLikePhone(value: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(value.trim());
}
