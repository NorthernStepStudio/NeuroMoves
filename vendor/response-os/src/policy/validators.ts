const UNSAFE_TERMS = ['violence', 'blood', 'scary', 'rude'];

export class Validators {
  static isKidSafe(content: string): boolean {
    if (typeof content !== 'string') return false;
    const lower = content.toLowerCase();
    return !UNSAFE_TERMS.some((term) => lower.includes(term));
  }

  static hasDisclaimer(content: string): boolean {
    return /not (medical|financial) advice/i.test(content);
  }

  static ensureDisclaimer(content: string, disclaimer = 'Not medical advice.'): string {
    if (this.hasDisclaimer(content)) return content;
    const trimmed = content.trim();
    return trimmed ? `${trimmed}\n\n${disclaimer}` : disclaimer;
  }
}

export class ContentGuard {
  private readonly prohibitedTerms: string[];

  constructor(prohibitedTerms: string[] = UNSAFE_TERMS) {
    this.prohibitedTerms = prohibitedTerms.map((term) => term.toLowerCase());
  }

  isSafe(content: string): boolean {
    if (typeof content !== 'string') return false;
    const lower = content.toLowerCase();
    return !this.prohibitedTerms.some((term) => lower.includes(term));
  }

  findViolations(content: string): string[] {
    if (typeof content !== 'string') return [];
    const lower = content.toLowerCase();
    return this.prohibitedTerms.filter((term) => lower.includes(term));
  }
}
