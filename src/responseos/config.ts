import { createDefaultAppConfig, type AppConfig } from '@nss/response-os';

export function createNeuromovesResponseOsConfig(): AppConfig {
  const config = createDefaultAppConfig('neuromoves-mobile');
  config.policyProfile = 'kids-safe';
  config.defaultProvider = 'off';
  config.enabledTools = ['storage.get', 'storage.set', 'http.fetch', 'file.export_csv', 'file.export_pdf'];
  config.allowedOutputFormats = ['text', 'json', 'markdown'];
  config.budgetDefaults = {
    maxSteps: 8,
    maxLlmCalls: 1,
    maxTokensIn: 2500,
    maxTokensOut: 1200,
    maxToolCalls: 6,
    maxMs: 8000,
  };
  return config;
}
