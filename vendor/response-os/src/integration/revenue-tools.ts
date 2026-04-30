import type { LeadStage } from '../leads/model.js';
import { appendLeadMessage, applyLeadStage, createLeadRecord, type LeadRecord } from '../leads/model.js';
import type { ToolContract } from '../tools/contracts.js';

export interface RevenueLeadUpsertInput {
  tenantId?: string;
  dedupeKey?: string;
  lead: {
    leadId?: string;
    phone: string;
    address?: string;
    stage?: LeadStage;
    source?: string;
    serviceCategory?: string;
    urgencyScore?: number;
    tags?: string[];
    lastEventAt?: string;
  };
}

export interface RevenueLeadRepository {
  upsert(input: RevenueLeadUpsertInput): Promise<LeadRecord>;
  getByPhone(phone: string, tenantId?: string): Promise<LeadRecord | null>;
  list(tenantId?: string): Promise<LeadRecord[]>;
}

export interface SmsAdapter {
  send(input: { to: string; from: string; body: string }): Promise<{ messageId: string }>;
}

export interface EmailAdapter {
  send(input: { to: string; subject: string; body: string }): Promise<{ messageId: string }>;
}

export interface CalendarAdapter {
  createEvent(input: {
    calendarId: string;
    title: string;
    startAt: string;
    endAt: string;
    timezone?: string;
    attendeePhone?: string;
  }): Promise<{ eventId: string }>;
}

export interface FollowupSchedulerAdapter {
  schedule(input: Record<string, unknown>): Promise<{ scheduleId: string }>;
}

export interface OwnerNotifierAdapter {
  notify(input: Record<string, unknown>): Promise<{ notificationId: string }>;
}

export interface VoicemailAdapter {
  drop(input: Record<string, unknown>): Promise<{ dropId: string }>;
}

export interface WebhookAdapter {
  post(input: Record<string, unknown>): Promise<{ status: number }>;
}

export interface RevenueToolsOptions {
  leadRepository?: RevenueLeadRepository;
  smsAdapter?: SmsAdapter;
  emailAdapter?: EmailAdapter;
  calendarAdapter?: CalendarAdapter;
  followupScheduler?: FollowupSchedulerAdapter;
  ownerNotifier?: OwnerNotifierAdapter;
  voicemailAdapter?: VoicemailAdapter;
  webhookAdapter?: WebhookAdapter;
}

export interface RevenueToolset {
  tools: ToolContract[];
  leadRepository: RevenueLeadRepository;
}

export class InMemoryRevenueLeadRepository implements RevenueLeadRepository {
  private readonly leads = new Map<string, LeadRecord>();

  async upsert(input: RevenueLeadUpsertInput): Promise<LeadRecord> {
    const tenantId = input.tenantId?.trim() || 'default';
    const key = keyForLead(tenantId, input.lead.phone);
    const existing = this.leads.get(key);
    const at = input.lead.lastEventAt ?? new Date().toISOString();

    if (!existing) {
      let lead = createLeadRecord({
        phone: input.lead.phone,
        tenantId,
        serviceCategory: input.lead.serviceCategory,
        urgencyScore: input.lead.urgencyScore,
        tags: input.lead.tags,
        atIso: at,
      });
      if (input.lead.stage) {
        lead = applyLeadStage(lead, input.lead.stage, at);
      }
      if (input.lead.address) {
        lead = { ...lead, address: input.lead.address };
      }

      const source = input.lead.source?.trim() || 'system';
      lead = appendLeadMessage(lead, {
        at,
        direction: 'system',
        channel: 'note',
        body: `Lead created from ${source}.`,
      });

      this.leads.set(key, lead);
      return lead;
    }

    let next: LeadRecord = {
      ...existing,
      serviceCategory: input.lead.serviceCategory ?? existing.serviceCategory,
      address: input.lead.address ?? existing.address,
      urgencyScore: clampUrgency(input.lead.urgencyScore ?? existing.urgencyScore),
      tags: uniqueTags([...(existing.tags ?? []), ...(input.lead.tags ?? [])]),
      updatedAt: at,
    };

    if (input.lead.stage) {
      next = applyLeadStage(next, input.lead.stage, at);
    }
    if (input.lead.source) {
      next = appendLeadMessage(next, {
        at,
        direction: 'system',
        channel: 'note',
        body: `Lead updated from ${input.lead.source}.`,
      });
    }

    this.leads.set(key, next);
    return next;
  }

  async getByPhone(phone: string, tenantId?: string): Promise<LeadRecord | null> {
    const key = keyForLead(tenantId?.trim() || 'default', phone);
    return this.leads.get(key) ?? null;
  }

  async list(tenantId?: string): Promise<LeadRecord[]> {
    const tenant = tenantId?.trim();
    if (!tenant) {
      return [...this.leads.values()];
    }
    return [...this.leads.entries()]
      .filter(([key]) => key.startsWith(`${tenant}::`))
      .map(([, lead]) => lead);
  }
}

export function createRevenueToolset(options: RevenueToolsOptions = {}): RevenueToolset {
  const leadRepository = options.leadRepository ?? new InMemoryRevenueLeadRepository();
  const smsAdapter = options.smsAdapter ?? defaultSmsAdapter;
  const emailAdapter = options.emailAdapter ?? defaultEmailAdapter;
  const calendarAdapter = options.calendarAdapter ?? defaultCalendarAdapter;
  const followupScheduler = options.followupScheduler ?? defaultFollowupScheduler;
  const ownerNotifier = options.ownerNotifier ?? defaultOwnerNotifier;
  const voicemailAdapter = options.voicemailAdapter ?? defaultVoicemailAdapter;
  const webhookAdapter = options.webhookAdapter ?? defaultWebhookAdapter;

  const tools: ToolContract[] = [
    {
      toolId: 'lead.upsert',
      description: 'Create or update a lead in the micro-CRM store.',
      schema: {
        tenantId: { type: 'string', required: false },
        dedupeKey: { type: 'string', required: false },
        lead: { type: 'object', required: true },
      },
      metadata: { timeoutMs: 5000, retries: 0, idempotent: false },
      handler: async (input) => {
        const leadInput = input.lead as RevenueLeadUpsertInput['lead'];
        const lead = await leadRepository.upsert({
          tenantId: typeof input.tenantId === 'string' ? input.tenantId : undefined,
          dedupeKey: typeof input.dedupeKey === 'string' ? input.dedupeKey : undefined,
          lead: {
            phone: String(leadInput.phone ?? ''),
            leadId: typeof leadInput.leadId === 'string' ? leadInput.leadId : undefined,
            address: typeof leadInput.address === 'string' ? leadInput.address : undefined,
            stage: isLeadStage(leadInput.stage) ? leadInput.stage : undefined,
            source: typeof leadInput.source === 'string' ? leadInput.source : undefined,
            serviceCategory: typeof leadInput.serviceCategory === 'string' ? leadInput.serviceCategory : undefined,
            urgencyScore: Number.isFinite(leadInput.urgencyScore) ? Number(leadInput.urgencyScore) : undefined,
            tags: Array.isArray(leadInput.tags) ? leadInput.tags.map(String) : undefined,
            lastEventAt: typeof leadInput.lastEventAt === 'string' ? leadInput.lastEventAt : undefined,
          },
        });
        return { ok: true, lead };
      },
    },
    {
      toolId: 'sms.send',
      description: 'Send SMS message via adapter.',
      schema: {
        to: { type: 'string', required: true },
        from: { type: 'string', required: true },
        body: { type: 'string', required: true },
      },
      metadata: { timeoutMs: 5000, retries: 1, idempotent: true },
      handler: async (input) => smsAdapter.send({
        to: String(input.to),
        from: String(input.from),
        body: String(input.body),
      }),
    },
    {
      toolId: 'email.send',
      description: 'Send email notification via adapter.',
      schema: {
        to: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        body: { type: 'string', required: true },
      },
      metadata: { timeoutMs: 7000, retries: 1, idempotent: true },
      handler: async (input) => emailAdapter.send({
        to: String(input.to),
        subject: String(input.subject),
        body: String(input.body),
      }),
    },
    {
      toolId: 'calendar.create_event',
      description: 'Create appointment event in external calendar.',
      schema: {
        calendarId: { type: 'string', required: true },
        title: { type: 'string', required: true },
        startAt: { type: 'string', required: true },
        endAt: { type: 'string', required: true },
        timezone: { type: 'string', required: false },
        attendeePhone: { type: 'string', required: false },
      },
      metadata: { timeoutMs: 7000, retries: 1, idempotent: true },
      handler: async (input) => calendarAdapter.createEvent({
        calendarId: String(input.calendarId),
        title: String(input.title),
        startAt: String(input.startAt),
        endAt: String(input.endAt),
        timezone: typeof input.timezone === 'string' ? input.timezone : undefined,
        attendeePhone: typeof input.attendeePhone === 'string' ? input.attendeePhone : undefined,
      }),
    },
    {
      toolId: 'followup.schedule',
      description: 'Schedule follow-up action for later execution.',
      schema: {
        strategy: { type: 'string', required: true },
        to: { type: 'string', required: false },
        at: { type: 'string', required: false },
      },
      metadata: { timeoutMs: 4000, retries: 1, idempotent: true },
      handler: async (input) => followupScheduler.schedule({ ...input }),
    },
    {
      toolId: 'notify.owner',
      description: 'Send owner alert notification.',
      schema: {
        destination: { type: 'string', required: true },
        message: { type: 'string', required: true },
      },
      metadata: { timeoutMs: 4000, retries: 1, idempotent: true },
      handler: async (input) => ownerNotifier.notify({ ...input }),
    },
    {
      toolId: 'call.voicemail_drop',
      description: 'Drop voicemail message for missed call recovery.',
      schema: {
        to: { type: 'string', required: true },
        script: { type: 'string', required: true },
      },
      metadata: { timeoutMs: 6000, retries: 1, idempotent: true },
      handler: async (input) => voicemailAdapter.drop({ ...input }),
    },
    {
      toolId: 'webhook.post',
      description: 'Forward payload to external webhook.',
      schema: {
        url: { type: 'string', required: true },
        payload: { type: 'object', required: true },
      },
      metadata: { timeoutMs: 6000, retries: 1, idempotent: true },
      handler: async (input) => webhookAdapter.post({
        url: String(input.url),
        payload: input.payload,
      }),
    },
  ];

  return {
    tools,
    leadRepository,
  };
}

const defaultSmsAdapter: SmsAdapter = {
  async send() {
    return {
      messageId: `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

const defaultEmailAdapter: EmailAdapter = {
  async send() {
    return {
      messageId: `email_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

const defaultCalendarAdapter: CalendarAdapter = {
  async createEvent() {
    return {
      eventId: `cal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

const defaultFollowupScheduler: FollowupSchedulerAdapter = {
  async schedule() {
    return {
      scheduleId: `fu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

const defaultOwnerNotifier: OwnerNotifierAdapter = {
  async notify() {
    return {
      notificationId: `owner_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

const defaultVoicemailAdapter: VoicemailAdapter = {
  async drop() {
    return {
      dropId: `vm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

const defaultWebhookAdapter: WebhookAdapter = {
  async post() {
    return {
      status: 200,
    };
  },
};

function isLeadStage(value: unknown): value is LeadStage {
  return value === 'new' || value === 'contacted' || value === 'scheduled' || value === 'estimate_sent' || value === 'won' || value === 'lost';
}

function keyForLead(tenantId: string, phone: string): string {
  return `${tenantId}::${phone}`;
}

function uniqueTags(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function clampUrgency(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
