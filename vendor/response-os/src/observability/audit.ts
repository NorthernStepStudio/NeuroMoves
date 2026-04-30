import { Logger } from '../core/logger.js';
import type { RuntimeContext } from '../context/runtime-context.js';
import { redactValue } from '../memory/store.js';

export type AuditEventType =
  | 'REQUEST_RECEIVED'
  | 'ROUTE_SELECTED'
  | 'POLICY_DECISION'
  | 'TOOL_CALLED'
  | 'TOOL_RESULT'
  | 'PROVIDER_CALLED'
  | 'PROVIDER_FALLBACK'
  | 'RESPONSE_SENT'
  | 'ERROR';

export interface AuditEvent {
  type: AuditEventType;
  traceId: string;
  context: RuntimeContext;
  payload?: Record<string, unknown>;
}

export class AuditLogger {
  private readonly logger: Logger;

  constructor(component = 'response-os') {
    this.logger = new Logger(component);
  }

  emit(event: AuditEvent): void {
    this.logger.info(event.type, {
      traceId: event.traceId,
      appId: event.context.appId,
      userId: event.context.userId,
      sessionId: event.context.sessionId,
      policyProfile: event.context.policyProfile,
      platform: event.context.platform,
      payload: redactValue(event.payload ?? {}),
    });
  }
}
