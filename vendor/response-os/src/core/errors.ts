export type ResponseOSErrorCode =
  | 'UNKNOWN'
  | 'INVALID_INPUT'
  | 'POLICY_VIOLATION'
  | 'TOOL_TIMEOUT'
  | 'TOOL_FAILED'
  | 'TOOL_VALIDATION_FAILED'
  | 'PROVIDER_FAILED'
  | 'PROVIDER_RATE_LIMIT'
  | 'BUDGET_EXCEEDED'
  | 'NEEDS_USER_INPUT';

export interface ResponseOSErrorOptions {
  code?: ResponseOSErrorCode;
  retryable?: boolean;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class ResponseOSError extends Error {
  readonly code: ResponseOSErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly cause: unknown;

  constructor(message: string, options: ResponseOSErrorOptions = {}) {
    super(message);
    this.name = 'ResponseOSError';
    this.code = options.code ?? 'UNKNOWN';
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class ProviderExecutionError extends ResponseOSError {
  constructor(message: string, cause?: unknown, details?: Record<string, unknown>) {
    super(message, {
      code: 'PROVIDER_FAILED',
      retryable: true,
      details,
      cause,
    });
    this.name = 'ProviderExecutionError';
  }
}

export class PolicyViolationError extends ResponseOSError {
  readonly policyId: string;

  constructor(policyId: string, reason: string, details?: Record<string, unknown>) {
    super(`Policy "${policyId}" blocked the response: ${reason}`, {
      code: 'POLICY_VIOLATION',
      retryable: false,
      details,
    });
    this.name = 'PolicyViolationError';
    this.policyId = policyId;
  }
}
