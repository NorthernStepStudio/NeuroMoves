export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  modifiedContent?: unknown;
}

export type PolicyContext = Record<string, unknown>;

export interface Policy<TContent = string> {
  id: string;
  validate(content: TContent, context: PolicyContext): Promise<PolicyResult>;
}

export class BasePolicy implements Policy<string> {
  id = 'base';
  private readonly prohibitedTerms: string[];

  constructor(prohibitedTerms: string[] = ['rude', 'offensive']) {
    this.prohibitedTerms = prohibitedTerms.map((term) => term.toLowerCase());
  }

  async validate(content: string, _context: PolicyContext): Promise<PolicyResult> {
    const lower = content.toLowerCase();
    const found = this.prohibitedTerms.filter((term) => lower.includes(term));

    if (found.length > 0) {
      return {
        allowed: false,
        reason: `Policy violation: inappropriate language (${found.join(', ')})`,
      };
    }

    return { allowed: true };
  }
}
