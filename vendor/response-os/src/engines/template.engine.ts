export interface TemplateResponseInput {
  intent: string;
  locale?: string;
  variables?: Record<string, string>;
}

const TEMPLATES: Record<string, string> = {
  support_request: 'Thanks for reaching out. I can help with this issue step-by-step.',
  planning_request: 'Here is a structured plan you can follow:',
  content_request: 'Here is a draft you can refine:',
  finance_request: 'Here is a cost-aware summary based on your request:',
  developer_request: 'Here is a technical path to solve this:',
  general_request: 'Here is a concise response:',
};

export class TemplateEngine {
  render(input: TemplateResponseInput): string {
    const template = TEMPLATES[input.intent] ?? TEMPLATES.general_request;
    const variables = input.variables ?? {};
    return Object.entries(variables).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), template);
  }
}
