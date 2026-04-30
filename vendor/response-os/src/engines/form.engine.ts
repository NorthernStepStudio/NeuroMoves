export interface FormFieldRule {
  required?: boolean;
  type: 'string' | 'number' | 'boolean';
  normalize?: 'trim' | 'lowercase' | 'uppercase';
}

export type FormSchema = Record<string, FormFieldRule>;

export interface FormValidationResult {
  ok: boolean;
  normalized: Record<string, unknown>;
  errors: string[];
}

export class FormValidationEngine {
  validate(input: Record<string, unknown>, schema: FormSchema): FormValidationResult {
    const normalized: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const [key, rule] of Object.entries(schema)) {
      const value = input[key];
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required field "${key}".`);
        continue;
      }
      if (value === undefined || value === null) {
        continue;
      }

      const valueType = typeof value;
      if (valueType !== rule.type) {
        errors.push(`Field "${key}" should be ${rule.type}, got ${valueType}.`);
        continue;
      }

      normalized[key] = normalizeValue(value, rule.normalize);
    }

    return {
      ok: errors.length === 0,
      normalized,
      errors,
    };
  }
}

function normalizeValue(value: unknown, mode?: FormFieldRule['normalize']): unknown {
  if (typeof value !== 'string' || !mode) {
    return value;
  }
  if (mode === 'trim') return value.trim();
  if (mode === 'lowercase') return value.trim().toLowerCase();
  if (mode === 'uppercase') return value.trim().toUpperCase();
  return value;
}
