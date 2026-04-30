export type QualificationServiceCategory = 'hvac' | 'plumbing' | 'electrical' | 'renovation' | 'general';

export interface InboundQualification {
  serviceCategory: QualificationServiceCategory;
  urgencyScore: number;
  hotLead: boolean;
  spamScore: number;
  isSpam: boolean;
  extractedAddress?: string;
  extractedUrgencyLabel: 'low' | 'medium' | 'high';
  missingFields: Array<'service' | 'address' | 'urgency'>;
  tags: string[];
}

export interface QualificationOptions {
  emergencyKeywords?: string[];
}

export function qualifyInboundMessage(text: string, options: QualificationOptions = {}): InboundQualification {
  const normalized = normalizeText(text);
  const serviceCategory = detectServiceCategory(normalized);
  const urgencyScore = computeUrgencyScore(normalized, options.emergencyKeywords);
  const hotLead = urgencyScore >= 80;
  const spamScore = computeSpamScore(normalized);
  const isSpam = spamScore >= 70;
  const extractedAddress = extractAddress(text);
  const extractedUrgencyLabel = urgencyLabel(urgencyScore);
  const missingFields = inferMissingFields(normalized, serviceCategory, extractedAddress, extractedUrgencyLabel);
  const tags = buildTags({ serviceCategory, hotLead, isSpam, extractedUrgencyLabel });

  return {
    serviceCategory,
    urgencyScore,
    hotLead,
    spamScore,
    isSpam,
    extractedAddress,
    extractedUrgencyLabel,
    missingFields,
    tags,
  };
}

export function buildIntakePrompt(missingFields: Array<'service' | 'address' | 'urgency'>): string {
  if (missingFields.length === 0) {
    return 'Thanks. We have enough to route your request and will follow up with your next available slot.';
  }

  const questions: string[] = [];
  if (missingFields.includes('service')) {
    questions.push('service type');
  }
  if (missingFields.includes('address')) {
    questions.push('service address');
  }
  if (missingFields.includes('urgency')) {
    questions.push('urgency level');
  }
  return `Quick intake needed: please reply with your ${questions.join(', ')}.`;
}

function detectServiceCategory(text: string): QualificationServiceCategory {
  if (/\b(ac|furnace|hvac|heat|cool|duct)\b/.test(text)) return 'hvac';
  if (/\b(plumb|pipe|drain|water heater|leak)\b/.test(text)) return 'plumbing';
  if (/\b(electric|panel|breaker|wiring|outlet|sparking)\b/.test(text)) return 'electrical';
  if (/\b(remodel|renovation|kitchen|bath|apartment)\b/.test(text)) return 'renovation';
  return 'general';
}

function computeUrgencyScore(text: string, emergencyKeywords: string[] = []): number {
  const defaults = ['emergency', 'urgent', 'asap', 'flood', 'leak', 'no heat', 'no ac', 'sparking', 'gas smell'];
  const keywords = [...new Set([...defaults, ...emergencyKeywords.map((item) => item.toLowerCase().trim())])];

  let score = 45;
  const hits = keywords.filter((keyword) => keyword && text.includes(keyword)).length;
  score += hits * 15;
  if (/\btoday|now|immediately|right away\b/.test(text)) score += 10;
  if (/\bchildren|elderly|medical\b/.test(text)) score += 8;
  return clamp(score, 0, 100);
}

function computeSpamScore(text: string): number {
  let score = 0;
  if (text.length < 6) score += 25;
  if (/(free money|crypto investment|guaranteed profit|click here)/.test(text)) score += 60;
  if ((text.match(/https?:\/\//g) ?? []).length > 1) score += 25;
  if ((text.match(/!/g) ?? []).length > 5) score += 10;
  if (/^\d+$/.test(text)) score += 25;
  if ((text.match(/[A-Z]/g) ?? []).length > text.length * 0.6) score += 10;
  return clamp(score, 0, 100);
}

function extractAddress(raw: string): string | undefined {
  const line = raw.replace(/\s+/g, ' ').trim();
  const match = line.match(/\b\d{1,6}\s+[A-Za-z0-9.\- ]+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|way|blvd)\b/i);
  if (!match) return undefined;
  return match[0].trim();
}

function inferMissingFields(
  text: string,
  service: QualificationServiceCategory,
  address: string | undefined,
  urgency: 'low' | 'medium' | 'high'
): Array<'service' | 'address' | 'urgency'> {
  const missing: Array<'service' | 'address' | 'urgency'> = [];
  if (service === 'general' && !/\b(hvac|plumb|electric|remodel|renovation|repair|install)\b/.test(text)) {
    missing.push('service');
  }
  if (!address) {
    missing.push('address');
  }
  if (urgency === 'medium' && !/\b(low|medium|high|urgent|emergency|asap)\b/.test(text)) {
    missing.push('urgency');
  }
  return missing;
}

function buildTags(input: {
  serviceCategory: QualificationServiceCategory;
  hotLead: boolean;
  isSpam: boolean;
  extractedUrgencyLabel: 'low' | 'medium' | 'high';
}): string[] {
  const tags = [input.serviceCategory, `urgency_${input.extractedUrgencyLabel}`];
  if (input.hotLead) tags.push('hot_lead');
  if (input.isSpam) tags.push('spam');
  return tags;
}

function urgencyLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 80) return 'high';
  if (score <= 40) return 'low';
  return 'medium';
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
