import { createDefaultBusinessProfile, type BusinessProfile } from '../business/profile.js';
import { isSmsReceivedEvent, type SmsReceivedEvent } from '../events/contracts.js';
import type { PatchExecutionContext, PatchExecutionResult, PatchToolAction, ResponsePatch } from './contracts.js';

export interface AppointmentBookingPatchConfig {
  profile?: Partial<BusinessProfile>;
  calendarId?: string;
  slotMinutes?: number;
  reminderMinutesBefore?: number;
}

export class AppointmentBookingPatch implements ResponsePatch<SmsReceivedEvent> {
  readonly id = 'appointment-booking' as const;
  readonly supportedEvents = ['sms.received'] as const;
  readonly priority = 50;
  private readonly profile: BusinessProfile;
  private readonly calendarId: string;
  private readonly slotMinutes: number;
  private readonly reminderMinutesBefore: number;

  constructor(config: AppointmentBookingPatchConfig = {}) {
    this.profile = createDefaultBusinessProfile(config.profile);
    this.calendarId = config.calendarId?.trim() || 'primary';
    this.slotMinutes = normalizeSlotMinutes(config.slotMinutes);
    this.reminderMinutesBefore = normalizeReminderMinutes(config.reminderMinutesBefore);
  }

  canHandle(event: SmsReceivedEvent): boolean {
    if (!isSmsReceivedEvent(event)) return false;
    return /\b(book|schedule|appointment|slot)\b/i.test(event.payload.body);
  }

  run(event: SmsReceivedEvent, context: PatchExecutionContext = {}): PatchExecutionResult {
    if (!isSmsReceivedEvent(event)) {
      return {
        patchId: this.id,
        status: 'failed',
        summary: 'AppointmentBookingPatch received unsupported event payload.',
        actions: [],
        warnings: ['Patch expected sms.received payload.'],
      };
    }

    const nowIso = context.nowIso ?? new Date().toISOString();
    const dedupeKey = `booking:${event.payload.messageSid ?? event.eventId}`;
    const callbackNumber = this.profile.callbackNumber || event.payload.toNumber;
    const selectedSlot = chooseBookingSlot(nowIso, this.profile.timezone, this.slotMinutes);
    const reminderAt = new Date(Date.parse(selectedSlot.startIso) - this.reminderMinutesBefore * 60_000).toISOString();

    const actions: PatchToolAction[] = [
      {
        tool: 'calendar.create_event',
        input: {
          calendarId: this.calendarId,
          title: `${this.profile.businessName} service visit`,
          startAt: selectedSlot.startIso,
          endAt: selectedSlot.endIso,
          timezone: this.profile.timezone,
          attendeePhone: event.payload.fromNumber,
          dedupeKey,
        },
      },
      {
        tool: 'lead.upsert',
        input: {
          dedupeKey,
          tenantId: event.tenantId,
          lead: {
            phone: event.payload.fromNumber,
            stage: 'scheduled',
            source: 'sms_booking',
            lastEventAt: nowIso,
          },
        },
      },
      {
        tool: 'sms.send',
        input: {
          to: event.payload.fromNumber,
          from: callbackNumber,
          body:
            `Booked. Your appointment is set for ${selectedSlot.displayLabel}. ` +
            `Reply CHANGE to adjust the time.`,
          dedupeKey,
        },
      },
      {
        tool: 'followup.schedule',
        input: {
          strategy: 'appointment_reminder',
          at: reminderAt,
          to: event.payload.fromNumber,
          body: `Reminder: appointment with ${this.profile.businessName} at ${selectedSlot.displayLabel}.`,
          dedupeKey,
        },
      },
    ];

    return {
      patchId: this.id,
      status: 'completed',
      summary: 'Appointment slot offered and booking automation triggered.',
      dedupeKey,
      actions,
      warnings: [],
      lead: {
        phone: event.payload.fromNumber,
        status: 'scheduled',
        source: 'sms_booking',
        lastEventAt: nowIso,
      },
      nextActionAt: reminderAt,
    };
  }
}

function chooseBookingSlot(nowIso: string, timezone: string, slotMinutes: number) {
  const start = roundUpToNextSlot(new Date(Date.parse(nowIso) + 60 * 60_000), slotMinutes);
  const end = new Date(start.getTime() + slotMinutes * 60_000);
  const display = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(start);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    displayLabel: display,
  };
}

function roundUpToNextSlot(date: Date, slotMinutes: number): Date {
  const ms = slotMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function normalizeSlotMinutes(value?: number): number {
  if (!Number.isFinite(value)) return 60;
  return Math.max(30, Math.min(180, Math.round(Number(value))));
}

function normalizeReminderMinutes(value?: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.max(30, Math.min(24 * 60, Math.round(Number(value))));
}
