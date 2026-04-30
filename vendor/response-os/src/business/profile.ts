export type BusinessWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface BusinessDayHours {
  open: string;
  close: string;
}

export type BusinessSchedule = Record<BusinessWeekday, BusinessDayHours | null>;

export interface EmergencyPolicy {
  enabled: boolean;
  emergencyKeywords: string[];
  emergencyRoute?: string;
}

export interface BusinessMessageTemplates {
  missedCallOpen: string;
  missedCallAfterHours: string;
  inboundAutoReplyOpen: string;
  inboundAutoReplyAfterHours: string;
  inboundFollowup10m: string;
  inboundFollowup24h: string;
  inboundFollowup3d: string;
  reviewRequest: string;
}

export interface BusinessProfile {
  businessId: string;
  businessName: string;
  timezone: string;
  services: string[];
  serviceArea?: string;
  callbackNumber?: string;
  hours: BusinessSchedule;
  emergencyPolicy: EmergencyPolicy;
  templates: BusinessMessageTemplates;
}

const DEFAULT_HOURS: BusinessSchedule = {
  monday: { open: '08:00', close: '18:00' },
  tuesday: { open: '08:00', close: '18:00' },
  wednesday: { open: '08:00', close: '18:00' },
  thursday: { open: '08:00', close: '18:00' },
  friday: { open: '08:00', close: '18:00' },
  saturday: { open: '09:00', close: '14:00' },
  sunday: null,
};

const DEFAULT_TEMPLATES: BusinessMessageTemplates = {
  missedCallOpen:
    'Sorry we missed your call to {business_name}. Reply with what you need and we will get back to you.',
  missedCallAfterHours:
    'Thanks for calling {business_name}. We are closed now. Reply 1 to request the first available slot tomorrow.',
  inboundAutoReplyOpen:
    'Thanks for texting {business_name}. Reply with: 1) service type, 2) address, 3) urgency (low/medium/high), 4) photo optional.',
  inboundAutoReplyAfterHours:
    'Thanks for texting {business_name}. We are currently closed. Send service type + address and we will prioritize your request at opening.',
  inboundFollowup10m:
    'Checking in from {business_name}. Want us to reserve your next available appointment window?',
  inboundFollowup24h:
    'Still need help? Reply YES and {business_name} will prioritize your request today.',
  inboundFollowup3d:
    'Final follow-up from {business_name}. Reply HELP anytime to restart scheduling.',
  reviewRequest:
    'Thanks for choosing {business_name}. If we helped you, please leave a quick review: {review_url}',
};

export function createDefaultBusinessProfile(input: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    businessId: input.businessId?.trim() || 'default-business',
    businessName: input.businessName?.trim() || 'Your Business',
    timezone: input.timezone?.trim() || 'America/New_York',
    services: normalizeServices(input.services),
    serviceArea: input.serviceArea?.trim(),
    callbackNumber: input.callbackNumber?.trim(),
    hours: {
      ...DEFAULT_HOURS,
      ...(input.hours ?? {}),
    },
    emergencyPolicy: {
      enabled: input.emergencyPolicy?.enabled ?? true,
      emergencyKeywords: normalizeEmergencyKeywords(input.emergencyPolicy?.emergencyKeywords),
      emergencyRoute: input.emergencyPolicy?.emergencyRoute?.trim(),
    },
    templates: {
      ...DEFAULT_TEMPLATES,
      ...(input.templates ?? {}),
    },
  };
}

export function renderBusinessTemplate(template: string, values: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), value);
  }
  return output;
}

export function isWithinBusinessHours(atIso: string, timezone: string, schedule: BusinessSchedule): boolean {
  return resolveBusinessWindow(atIso, timezone, schedule).isOpen;
}

export function resolveBusinessWindow(
  atIso: string,
  timezone: string,
  schedule: BusinessSchedule
): { day: BusinessWeekday; localMinutes: number; isOpen: boolean } {
  const date = new Date(atIso);
  const day = toWeekdayKey(formatDatePart(date, timezone, 'weekday'));
  const localMinutes = parseClock(formatDatePart(date, timezone, 'time'));
  const hours = schedule[day];
  if (!hours) {
    return {
      day,
      localMinutes,
      isOpen: false,
    };
  }

  const openMinutes = parseClock(hours.open);
  const closeMinutes = parseClock(hours.close);
  return {
    day,
    localMinutes,
    isOpen: localMinutes >= openMinutes && localMinutes < closeMinutes,
  };
}

export function findNextOpenWindow(
  atIso: string,
  timezone: string,
  schedule: BusinessSchedule
): { day: BusinessWeekday; open: string } {
  const week: BusinessWeekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const date = new Date(atIso);
  const currentDay = toWeekdayKey(formatDatePart(date, timezone, 'weekday'));
  const currentMinutes = parseClock(formatDatePart(date, timezone, 'time'));
  const start = week.indexOf(currentDay);

  for (let offset = 0; offset < week.length; offset += 1) {
    const day = week[(start + offset) % week.length];
    const hours = schedule[day];
    if (!hours) continue;
    const openMinutes = parseClock(hours.open);

    if (offset === 0 && currentMinutes < openMinutes) {
      return { day, open: hours.open };
    }
    if (offset > 0) {
      return { day, open: hours.open };
    }
  }

  return { day: 'monday', open: '08:00' };
}

export function looksLikePhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.trim());
}

function normalizeServices(input?: string[]): string[] {
  const values = (input ?? []).map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values : ['service', 'repair', 'estimate'];
}

function normalizeEmergencyKeywords(input?: string[]): string[] {
  const values = (input ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (values.length > 0) return values;
  return ['emergency', 'urgent', 'flood', 'leak', 'no heat', 'no ac', 'sparking'];
}

function toWeekdayKey(value: string): BusinessWeekday {
  const normalized = value.toLowerCase();
  if (normalized === 'monday') return 'monday';
  if (normalized === 'tuesday') return 'tuesday';
  if (normalized === 'wednesday') return 'wednesday';
  if (normalized === 'thursday') return 'thursday';
  if (normalized === 'friday') return 'friday';
  if (normalized === 'saturday') return 'saturday';
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

function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(':');
  const h = Number.parseInt(hours, 10);
  const m = Number.parseInt(minutes, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
