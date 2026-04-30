export type LeadStage = 'new' | 'contacted' | 'scheduled' | 'estimate_sent' | 'won' | 'lost';

export interface LeadMessageRecord {
  at: string;
  direction: 'inbound' | 'outbound' | 'system';
  body: string;
  channel: 'sms' | 'email' | 'call' | 'note';
}

export interface LeadRecord {
  leadId: string;
  tenantId?: string;
  phone: string;
  name?: string;
  address?: string;
  serviceCategory?: string;
  urgencyScore: number;
  stage: LeadStage;
  tags: string[];
  conversation: LeadMessageRecord[];
  createdAt: string;
  updatedAt: string;
}

const STAGE_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ['contacted', 'lost'],
  contacted: ['scheduled', 'estimate_sent', 'lost'],
  scheduled: ['estimate_sent', 'won', 'lost'],
  estimate_sent: ['won', 'lost'],
  won: [],
  lost: [],
};

export function createLeadRecord(input: {
  phone: string;
  tenantId?: string;
  serviceCategory?: string;
  urgencyScore?: number;
  tags?: string[];
  atIso?: string;
}): LeadRecord {
  const now = input.atIso ?? new Date().toISOString();
  return {
    leadId: `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId: input.tenantId,
    phone: input.phone,
    serviceCategory: input.serviceCategory,
    urgencyScore: normalizeUrgency(input.urgencyScore),
    stage: 'new',
    tags: uniqueTags(input.tags ?? []),
    conversation: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionLeadStage(current: LeadRecord, next: LeadStage, atIso = new Date().toISOString()): LeadRecord {
  if (!STAGE_TRANSITIONS[current.stage].includes(next)) {
    return {
      ...current,
      updatedAt: atIso,
      conversation: [
        ...current.conversation,
        {
          at: atIso,
          direction: 'system',
          channel: 'note',
          body: `Invalid stage transition blocked: ${current.stage} -> ${next}.`,
        },
      ],
    };
  }

  return {
    ...current,
    stage: next,
    updatedAt: atIso,
  };
}

export function applyLeadStage(current: LeadRecord, target: LeadStage, atIso = new Date().toISOString()): LeadRecord {
  if (current.stage === target) {
    return {
      ...current,
      updatedAt: atIso,
    };
  }

  const path = findTransitionPath(current.stage, target);
  if (!path) {
    return transitionLeadStage(current, target, atIso);
  }

  let nextLead = { ...current };
  for (const stage of path) {
    nextLead = transitionLeadStage(nextLead, stage, atIso);
  }
  return nextLead;
}

export function appendLeadMessage(
  lead: LeadRecord,
  message: Omit<LeadMessageRecord, 'at'> & { at?: string }
): LeadRecord {
  const at = message.at ?? new Date().toISOString();
  return {
    ...lead,
    updatedAt: at,
    conversation: [
      ...lead.conversation,
      {
        at,
        direction: message.direction,
        body: message.body,
        channel: message.channel,
      },
    ],
  };
}

function normalizeUrgency(input?: number): number {
  if (!Number.isFinite(input)) return 50;
  return Math.max(0, Math.min(100, Math.round(Number(input))));
}

function uniqueTags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of input) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function findTransitionPath(from: LeadStage, to: LeadStage): LeadStage[] | null {
  const queue: Array<{ stage: LeadStage; path: LeadStage[] }> = [{ stage: from, path: [] }];
  const visited = new Set<LeadStage>([from]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const next of STAGE_TRANSITIONS[current.stage]) {
      if (visited.has(next)) continue;
      const path = [...current.path, next];
      if (next === to) {
        return path;
      }
      visited.add(next);
      queue.push({ stage: next, path });
    }
  }

  return null;
}
