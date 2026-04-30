import type { AppConfig } from '../config/app-config.js';
import type { RuntimeContext } from '../context/runtime-context.js';
import { BudgetController, type RequestBudget } from '../core/budget.js';
import { ProviderExecutionError, ResponseOSError } from '../core/errors.js';
import type { AgentResult, Message } from '../core/types.js';
import { TemplateEngine } from '../engines/template.engine.js';
import { AuditLogger } from '../observability/audit.js';
import { createOutput, type AgentOutput } from '../output/contracts.js';
import { PolicyEngine } from '../policy/engine.js';
import type { Provider } from '../providers/provider.js';
import { OffProvider } from '../providers/off.provider.js';
import { Router } from '../router/router.js';
import type { ConversationState } from '../state/state-model.js';
import { ToolExecutor } from '../tools/executor.js';

export type ExecutionStepType = 'THINK' | 'TOOL_CALL' | 'OBSERVE' | 'RESPOND';

export interface AgentRuntimeRequest {
  context: RuntimeContext;
  appConfig: AppConfig;
  messages: Message[];
  state?: ConversationState;
  budgetOverride?: Partial<RequestBudget>;
  requestedTool?: {
    toolId: string;
    input: Record<string, unknown>;
    idempotencyKey?: string;
  };
}

export interface AgentRuntimeOptions {
  provider?: Provider;
  fallbackProvider?: Provider;
  router?: Router;
  policyEngine?: PolicyEngine;
  templateEngine?: TemplateEngine;
  toolExecutor?: ToolExecutor;
  auditLogger?: AuditLogger;
}

export class AgentRuntime {
  private readonly provider: Provider;
  private readonly fallbackProvider: Provider;
  private readonly router: Router;
  private readonly policyEngine: PolicyEngine;
  private readonly templateEngine: TemplateEngine;
  private readonly toolExecutor?: ToolExecutor;
  private readonly auditLogger: AuditLogger;

  constructor(options: AgentRuntimeOptions = {}) {
    this.provider = options.provider ?? new OffProvider();
    this.fallbackProvider = options.fallbackProvider ?? new OffProvider();
    this.router = options.router ?? new Router();
    this.policyEngine = options.policyEngine ?? new PolicyEngine();
    this.templateEngine = options.templateEngine ?? new TemplateEngine();
    this.toolExecutor = options.toolExecutor;
    this.auditLogger = options.auditLogger ?? new AuditLogger('agent-runtime');
  }

  async execute(request: AgentRuntimeRequest): Promise<AgentOutput> {
    const startedAt = Date.now();
    const budget = { ...request.appConfig.budgetDefaults, ...(request.budgetOverride ?? {}) };
    const budgetController = new BudgetController(budget);

    this.auditLogger.emit({
      type: 'REQUEST_RECEIVED',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: {
        messageCount: request.messages.length,
        budget,
      },
    });

    const lastUserMessage = [...request.messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) {
      return createOutput({
        status: 'needs_user',
        message: 'I need a user message to continue.',
        context: request.context,
        latencyMs: Date.now() - startedAt,
      });
    }

    budgetController.recordStep();
    const inputPolicy = this.policyEngine.evaluateInput(lastUserMessage.content, request.context);
    this.auditLogger.emit({
      type: 'POLICY_DECISION',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: {
        stage: 'input',
        ...inputPolicy,
      },
    });

    if (!inputPolicy.allowed) {
      return createOutput({
        status: 'refused',
        message: inputPolicy.reason ?? 'Request is not allowed by policy.',
        context: request.context,
        latencyMs: Date.now() - startedAt,
      });
    }

    const route = this.router.route({
      message: lastUserMessage.content,
      messages: request.messages,
      policyProfile: request.context.policyProfile,
      providerEnabled: this.provider instanceof OffProvider ? false : true,
      budget,
    });

    this.auditLogger.emit({
      type: 'ROUTE_SELECTED',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: { ...route },
    });

    if (request.appConfig.routingOverrides?.forceSafeMode) {
      route.pipeline = 'safe-mode';
      route.reason = 'Forced safe mode by app config.';
    } else if (request.appConfig.routingOverrides?.forceTemplateMode) {
      route.pipeline = 'template';
      route.reason = 'Forced template mode by app config.';
    }

    if (route.pipeline === 'safe-mode') {
      return createOutput({
        status: 'refused',
        message: 'I cannot help with that request safely.',
        context: request.context,
        latencyMs: Date.now() - startedAt,
        debug: { route },
      });
    }

    let toolSummary = '';
    if (request.requestedTool) {
      const toolResult = await this.executeToolStep(request, budgetController);
      if (!toolResult.ok) {
        return createOutput({
          status: toolResult.error?.retryable ? 'needs_user' : 'error',
          message: toolResult.error?.message ?? 'Tool execution failed.',
          context: request.context,
          latencyMs: Date.now() - startedAt,
          debug: {
            route,
            toolResult,
          },
        });
      }
      toolSummary = ` Tool result from ${toolResult.toolId} is available.`;
    }

    let responseText: string;
    let llmUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let providerFallbackUsed = false;
    let providerFallbackReason: string | undefined;

    if (
      route.pipeline === 'template' ||
      route.pipeline === 'deterministic-fallback' ||
      budgetController.shouldPreferDeterministic()
    ) {
      budgetController.recordStep();
      responseText = this.templateEngine.render({
        intent: route.intent,
        locale: request.context.locale,
      });
      if (toolSummary) responseText = `${responseText}${toolSummary}`;
    } else {
      budgetController.recordStep();
      this.auditLogger.emit({
        type: 'PROVIDER_CALLED',
        traceId: request.context.requestTraceId,
        context: request.context,
        payload: { provider: this.provider.constructor.name },
      });
      const providerResult = await this.generateWithRecovery(request.context, request.messages, budget);
      responseText = providerResult.result.content;
      llmUsage = providerResult.result.usage ?? llmUsage;
      providerFallbackUsed = providerResult.fallbackUsed;
      providerFallbackReason = providerResult.fallbackReason;
      budgetController.recordLlmCall(llmUsage.promptTokens, llmUsage.completionTokens);
      if (toolSummary) responseText = `${responseText}\n\n${toolSummary}`;
    }

    budgetController.recordStep();
    const outputPolicy = this.policyEngine.evaluateOutput(responseText, request.context);
    this.auditLogger.emit({
      type: 'POLICY_DECISION',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: {
        stage: 'output',
        ...outputPolicy,
      },
    });

    if (!outputPolicy.allowed) {
      return createOutput({
        status: 'refused',
        message: outputPolicy.reason ?? 'Output is not allowed by policy.',
        context: request.context,
        latencyMs: Date.now() - startedAt,
      });
    }

    const finalMessage = outputPolicy.modifiedContent ?? responseText;
    const output = createOutput({
      status: 'ok',
      message: finalMessage,
      context: request.context,
      latencyMs: Date.now() - startedAt,
      data: { route: { ...route } },
      debug: {
        budgetUsage: budgetController.getUsage(),
        provider: {
          fallbackUsed: providerFallbackUsed,
          fallbackReason: providerFallbackReason,
        },
      },
    });

    this.auditLogger.emit({
      type: 'RESPONSE_SENT',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: {
        status: output.status,
      },
    });

    return output;
  }

  private async executeToolStep(request: AgentRuntimeRequest, budgetController: BudgetController) {
    if (!request.requestedTool || !this.toolExecutor) {
      return {
        ok: false,
        toolId: request.requestedTool?.toolId ?? 'unknown',
        error: {
          code: 'TOOL_FAILED',
          message: 'Tool executor is not configured.',
          retryable: false,
        },
        attempts: 0,
      };
    }

    const policy = this.policyEngine.evaluateToolCall({
      toolId: request.requestedTool.toolId,
      appId: request.context.appId,
      policyProfile: request.context.policyProfile,
      allowedTools: request.appConfig.enabledTools,
    });

    this.auditLogger.emit({
      type: 'POLICY_DECISION',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: {
        stage: 'tool',
        ...policy,
      },
    });

    if (!policy.allowed) {
      return {
        ok: false,
        toolId: request.requestedTool.toolId,
        error: {
          code: 'TOOL_VALIDATION_FAILED',
          message: policy.reason ?? 'Tool call blocked by policy.',
          retryable: false,
        },
        attempts: 0,
      };
    }

    budgetController.recordToolCall();
    this.auditLogger.emit({
      type: 'TOOL_CALLED',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: {
        toolId: request.requestedTool.toolId,
      },
    });

    const result = await this.toolExecutor.execute({
      toolId: request.requestedTool.toolId,
      input: request.requestedTool.input,
      idempotencyKey: request.requestedTool.idempotencyKey,
      context: {
        runtimeContext: request.context,
        traceId: request.context.requestTraceId,
      },
    });

    this.auditLogger.emit({
      type: 'TOOL_RESULT',
      traceId: request.context.requestTraceId,
      context: request.context,
      payload: { ...result },
    });

    return result;
  }

  private async generateWithRecovery(
    context: RuntimeContext,
    messages: Message[],
    budget: RequestBudget
  ): Promise<{
    result: AgentResult;
    fallbackUsed: boolean;
    fallbackReason?: string;
  }> {
    try {
      const result = await this.provider.generate({
        messages,
        budget: {
          maxSteps: budget.maxSteps,
          maxTotalTokens: budget.maxTokensIn + budget.maxTokensOut,
          currentSteps: 0,
          currentTokens: 0,
        },
      });
      return {
        result,
        fallbackUsed: false,
      };
    } catch (error) {
      const fallbackReason = error instanceof Error ? error.message : String(error);
      this.auditLogger.emit({
        type: 'ERROR',
        traceId: context.requestTraceId,
        context,
        payload: {
          error: fallbackReason,
        },
      });

      try {
        this.auditLogger.emit({
          type: 'PROVIDER_FALLBACK',
          traceId: context.requestTraceId,
          context,
          payload: {
            from: this.provider.constructor.name,
            to: this.fallbackProvider.constructor.name,
            reason: fallbackReason,
          },
        });

        const result = await this.fallbackProvider.generate({
          messages,
          budget: {
            maxSteps: budget.maxSteps,
            maxTotalTokens: budget.maxTokensIn + budget.maxTokensOut,
            currentSteps: 0,
            currentTokens: 0,
          },
        });

        return {
          result,
          fallbackUsed: true,
          fallbackReason,
        };
      } catch (fallbackError) {
        throw new ProviderExecutionError('Primary and fallback providers failed.', fallbackError);
      }
    }
  }
}

export function defaultRecoveryMessage(error: unknown): string {
  if (error instanceof ResponseOSError && error.code === 'NEEDS_USER_INPUT') {
    return 'I need more information before I can continue.';
  }
  if (error instanceof ResponseOSError && error.code === 'BUDGET_EXCEEDED') {
    return 'I reached the current execution budget. Please retry with a smaller request.';
  }
  return 'Something went wrong. Please try again.';
}
