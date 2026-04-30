import type { Routine } from '../core/types.js';
import type { Policy, PolicyContext, PolicyResult } from './policy.js';

const PROHIBITED_TERMS = ['cure', 'diagnose', 'clinical', 'prescribe', 'doctor'];

export const NEUROMOVES_DISCLAIMER =
  'Disclaimer: This is for educational and routine-building purposes only. It is not medical advice. Consult with a qualified Occupational Therapist or healthcare provider for clinical needs.';

export class NeuroMovesPolicy implements Policy<string | Routine> {
  id = 'neuromoves-safety';

  async validate(content: string | Routine, _context: PolicyContext): Promise<PolicyResult> {
    const textToCheck = typeof content === 'string' ? content : JSON.stringify(content);
    const lower = textToCheck.toLowerCase();
    const found = PROHIBITED_TERMS.filter((term) => lower.includes(term));

    if (found.length > 0) {
      return {
        allowed: false,
        reason: `Safety violation: restricted medical terms found (${found.join(', ')}).`,
      };
    }

    if (typeof content === 'string') {
      return {
        allowed: true,
        modifiedContent: withDisclaimer(content),
      };
    }

    return {
      allowed: true,
      modifiedContent: {
        ...content,
        disclaimer: withDisclaimer(content.disclaimer || '').replace(/^Disclaimer:\s*/i, 'Disclaimer: '),
      },
    };
  }
}

function withDisclaimer(content: string): string {
  if (/not medical advice/i.test(content)) {
    return content;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return NEUROMOVES_DISCLAIMER;
  }

  return `${trimmed}\n\n${NEUROMOVES_DISCLAIMER}`;
}
