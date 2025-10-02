/**
 * Enhanced Error Hierarchy for Business Workflows Module
 * 
 * Provides comprehensive error handling with context preservation,
 * proper error categorization, and recovery guidance.
 * 
 * Follows enterprise error handling patterns:
 * - Specific error types for different failure scenarios
 * - Context preservation for debugging
 * - Recovery guidance for automated error handling
 * - Proper error codes for API responses
 */

/**
 * Base Business Workflow Error
 * All business workflow errors extend from this base class
 */
export abstract class BusinessWorkflowError extends Error {
  public readonly errorCode: string;
  public readonly category: 'agent' | 'workflow' | 'integration' | 'validation' | 'configuration';
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;
  public readonly retryAfter?: number; // milliseconds

  constructor(
    message: string,
    errorCode: string,
    category: BusinessWorkflowError['category'],
    severity: BusinessWorkflowError['severity'],
    context: Record<string, any> = {},
    recoverable = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.category = category;
    this.severity = severity;
    this.context = { ...context };
    this.timestamp = new Date();
    this.recoverable = recoverable;
    this.retryAfter = retryAfter;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging and monitoring
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      retryAfter: this.retryAfter,
      stack: this.stack,
    };
  }

  /**
   * Get recovery guidance for automated error handling
   */
  abstract getRecoveryGuidance(): string;
}

// ============================================================================
// AGENT-SPECIFIC ERRORS
// ============================================================================

/**
 * Agent Initialization Error
 * Thrown when an agent fails to initialize properly
 */
export class AgentInitializationError extends BusinessWorkflowError {
  constructor(
    agentId: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Agent '${agentId}' failed to initialize: ${reason}`,
      'AGENT_INIT_FAILED',
      'agent',
      'high',
      { agentId, reason, ...context },
      true, // Usually recoverable with retry
      5000 // Retry after 5 seconds
    );
  }

  getRecoveryGuidance(): string {
    return 'Check agent configuration and dependencies. Verify all required services are available.';
  }
}

/**
 * Agent Execution Error
 * Thrown when an agent fails during task execution
 */
export class AgentExecutionError extends BusinessWorkflowError {
  constructor(
    agentId: string,
    taskName: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Agent '${agentId}' failed executing task '${taskName}': ${reason}`,
      'AGENT_EXEC_FAILED',
      'agent',
      'medium',
      { agentId, taskName, reason, ...context },
      true,
      3000
    );
  }

  getRecoveryGuidance(): string {
    return 'Review task parameters and agent state. Consider fallback execution or manual intervention.';
  }
}

/**
 * Agent Timeout Error
 * Thrown when an agent exceeds its execution timeout
 */
export class AgentTimeoutError extends BusinessWorkflowError {
  constructor(
    agentId: string,
    taskName: string,
    timeoutMs: number,
    context: Record<string, any> = {}
  ) {
    super(
      `Agent '${agentId}' timed out executing task '${taskName}' after ${timeoutMs}ms`,
      'AGENT_TIMEOUT',
      'agent',
      'medium',
      { agentId, taskName, timeoutMs, ...context },
      true,
      timeoutMs * 1.5 // Retry with longer timeout
    );
  }

  getRecoveryGuidance(): string {
    return 'Increase timeout configuration or optimize agent execution. Check for blocking operations.';
  }
}

// ============================================================================
// WORKFLOW-SPECIFIC ERRORS
// ============================================================================

/**
 * Workflow Configuration Error
 * Thrown when workflow configuration is invalid or incomplete
 */
export class WorkflowConfigurationError extends BusinessWorkflowError {
  constructor(
    workflowName: string,
    configIssue: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Workflow '${workflowName}' configuration error: ${configIssue}`,
      'WORKFLOW_CONFIG_INVALID',
      'workflow',
      'high',
      { workflowName, configIssue, ...context },
      false // Configuration errors are not automatically recoverable
    );
  }

  getRecoveryGuidance(): string {
    return 'Review and correct workflow configuration. Ensure all required parameters are provided.';
  }
}

/**
 * Workflow State Error
 * Thrown when workflow state becomes invalid or corrupted
 */
export class WorkflowStateError extends BusinessWorkflowError {
  constructor(
    workflowName: string,
    stateIssue: string,
    currentState: any,
    context: Record<string, any> = {}
  ) {
    super(
      `Workflow '${workflowName}' state error: ${stateIssue}`,
      'WORKFLOW_STATE_INVALID',
      'workflow',
      'high',
      { workflowName, stateIssue, currentState, ...context },
      true,
      1000
    );
  }

  getRecoveryGuidance(): string {
    return 'Reset workflow state or restore from last valid checkpoint. Review state transitions.';
  }
}

/**
 * Workflow Transition Error
 * Thrown when workflow cannot transition between states
 */
export class WorkflowTransitionError extends BusinessWorkflowError {
  constructor(
    workflowName: string,
    fromState: string,
    toState: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Workflow '${workflowName}' cannot transition from '${fromState}' to '${toState}': ${reason}`,
      'WORKFLOW_TRANSITION_FAILED',
      'workflow',
      'medium',
      { workflowName, fromState, toState, reason, ...context },
      true,
      2000
    );
  }

  getRecoveryGuidance(): string {
    return 'Check workflow state transitions and conditions. Verify state compatibility.';
  }
}

// ============================================================================
// INTEGRATION-SPECIFIC ERRORS
// ============================================================================

/**
 * External Service Error
 * Thrown when external service integration fails
 */
export class ExternalServiceError extends BusinessWorkflowError {
  constructor(
    serviceName: string,
    operation: string,
    reason: string,
    statusCode?: number,
    context: Record<string, any> = {}
  ) {
    super(
      `External service '${serviceName}' failed during '${operation}': ${reason}`,
      'EXTERNAL_SERVICE_FAILED',
      'integration',
      'medium',
      { serviceName, operation, reason, statusCode, ...context },
      true,
      5000
    );
  }

  getRecoveryGuidance(): string {
    return 'Check external service availability and credentials. Implement circuit breaker if needed.';
  }
}

/**
 * GitHub Integration Error
 * Specific error for GitHub API integration failures
 */
export class GitHubIntegrationError extends ExternalServiceError {
  constructor(
    operation: string,
    username: string,
    reason: string,
    statusCode?: number,
    context: Record<string, any> = {}
  ) {
    super(
      'GitHub',
      operation,
      `${reason} for user '${username}'`,
      statusCode,
      { username, ...context }
    );
    this.errorCode = 'GITHUB_API_FAILED';
  }

  getRecoveryGuidance(): string {
    return 'Verify GitHub token validity and rate limits. Check user permissions and repository access.';
  }
}

/**
 * Memory Service Error
 * Thrown when memory service operations fail
 */
export class MemoryServiceError extends BusinessWorkflowError {
  constructor(
    operation: string,
    namespace: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Memory service operation '${operation}' failed for namespace '${namespace}': ${reason}`,
      'MEMORY_SERVICE_FAILED',
      'integration',
      'medium',
      { operation, namespace, reason, ...context },
      true,
      3000
    );
  }

  getRecoveryGuidance(): string {
    return 'Check memory service connectivity and storage backend. Verify namespace configuration.';
  }
}

/**
 * LLM Provider Error
 * Thrown when LLM service operations fail
 */
export class LLMProviderError extends BusinessWorkflowError {
  constructor(
    provider: string,
    operation: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    super(
      `LLM provider '${provider}' failed during '${operation}': ${reason}`,
      'LLM_PROVIDER_FAILED',
      'integration',
      'high',
      { provider, operation, reason, ...context },
      true,
      10000 // LLM calls may need longer retry delay
    );
  }

  getRecoveryGuidance(): string {
    return 'Check API key validity and rate limits. Consider fallback model or cached responses.';
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Input Validation Error
 * Thrown when input data fails validation
 */
export class InputValidationError extends BusinessWorkflowError {
  constructor(
    field: string,
    value: any,
    validationRule: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Input validation failed for field '${field}': ${validationRule}`,
      'INPUT_VALIDATION_FAILED',
      'validation',
      'low',
      { field, value, validationRule, ...context },
      false // Validation errors require user input correction
    );
  }

  getRecoveryGuidance(): string {
    return 'Correct input data according to validation rules. Review API documentation for required formats.';
  }
}

/**
 * State Validation Error
 * Thrown when workflow state fails validation
 */
export class StateValidationError extends BusinessWorkflowError {
  constructor(
    workflowName: string,
    stateName: string,
    validationRule: string,
    actualState: any,
    context: Record<string, any> = {}
  ) {
    super(
      `State validation failed for workflow '${workflowName}' state '${stateName}': ${validationRule}`,
      'STATE_VALIDATION_FAILED',
      'validation',
      'medium',
      { workflowName, stateName, validationRule, actualState, ...context },
      true,
      1000
    );
  }

  getRecoveryGuidance(): string {
    return 'Reset workflow state or provide valid state data. Check state schema requirements.';
  }
}

// ============================================================================
// CONFIGURATION ERRORS
// ============================================================================

/**
 * Missing Configuration Error
 * Thrown when required configuration is missing
 */
export class MissingConfigurationError extends BusinessWorkflowError {
  constructor(
    configKey: string,
    component: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Missing required configuration '${configKey}' for component '${component}'`,
      'MISSING_CONFIG',
      'configuration',
      'critical',
      { configKey, component, ...context },
      false // Configuration errors require manual intervention
    );
  }

  getRecoveryGuidance(): string {
    return 'Provide missing configuration values. Check environment variables and configuration files.';
  }
}

/**
 * Invalid Configuration Error
 * Thrown when configuration values are invalid
 */
export class InvalidConfigurationError extends BusinessWorkflowError {
  constructor(
    configKey: string,
    configValue: any,
    expectedFormat: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Invalid configuration '${configKey}': expected ${expectedFormat}, got ${typeof configValue}`,
      'INVALID_CONFIG',
      'configuration',
      'high',
      { configKey, configValue, expectedFormat, ...context },
      false
    );
  }

  getRecoveryGuidance(): string {
    return 'Correct configuration format and values. Validate against configuration schema.';
  }
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Error Factory for creating specific error types
 */
export class BusinessWorkflowErrorFactory {
  /**
   * Create appropriate error based on error context
   */
  static createError(
    category: string,
    subtype: string,
    message: string,
    context: Record<string, any> = {}
  ): BusinessWorkflowError {
    switch (category) {
      case 'agent':
        switch (subtype) {
          case 'initialization':
            return new AgentInitializationError(
              context.agentId || 'unknown',
              message,
              context
            );
          case 'execution':
            return new AgentExecutionError(
              context.agentId || 'unknown',
              context.taskName || 'unknown',
              message,
              context
            );
          case 'timeout':
            return new AgentTimeoutError(
              context.agentId || 'unknown',
              context.taskName || 'unknown',
              context.timeoutMs || 30000,
              context
            );
          default:
            return new AgentExecutionError(
              context.agentId || 'unknown',
              'general',
              message,
              context
            );
        }

      case 'workflow':
        switch (subtype) {
          case 'configuration':
            return new WorkflowConfigurationError(
              context.workflowName || 'unknown',
              message,
              context
            );
          case 'state':
            return new WorkflowStateError(
              context.workflowName || 'unknown',
              message,
              context.currentState,
              context
            );
          case 'transition':
            return new WorkflowTransitionError(
              context.workflowName || 'unknown',
              context.fromState || 'unknown',
              context.toState || 'unknown',
              message,
              context
            );
          default:
            return new WorkflowConfigurationError(
              context.workflowName || 'unknown',
              message,
              context
            );
        }

      case 'integration':
        switch (subtype) {
          case 'github':
            return new GitHubIntegrationError(
              context.operation || 'unknown',
              context.username || 'unknown',
              message,
              context.statusCode,
              context
            );
          case 'memory':
            return new MemoryServiceError(
              context.operation || 'unknown',
              context.namespace || 'unknown',
              message,
              context
            );
          case 'llm':
            return new LLMProviderError(
              context.provider || 'unknown',
              context.operation || 'unknown',
              message,
              context
            );
          default:
            return new ExternalServiceError(
              context.serviceName || 'unknown',
              context.operation || 'unknown',
              message,
              context.statusCode,
              context
            );
        }

      case 'validation':
        switch (subtype) {
          case 'input':
            return new InputValidationError(
              context.field || 'unknown',
              context.value,
              message,
              context
            );
          case 'state':
            return new StateValidationError(
              context.workflowName || 'unknown',
              context.stateName || 'unknown',
              message,
              context.actualState,
              context
            );
          default:
            return new InputValidationError(
              context.field || 'unknown',
              context.value,
              message,
              context
            );
        }

      case 'configuration':
        switch (subtype) {
          case 'missing':
            return new MissingConfigurationError(
              context.configKey || 'unknown',
              context.component || 'unknown',
              context
            );
          case 'invalid':
            return new InvalidConfigurationError(
              context.configKey || 'unknown',
              context.configValue,
              context.expectedFormat || 'valid value',
              context
            );
          default:
            return new MissingConfigurationError(
              context.configKey || 'unknown',
              context.component || 'unknown',
              context
            );
        }

      default:
        // Default to agent execution error
        return new AgentExecutionError(
          'unknown',
          'general',
          message,
          context
        );
    }
  }

  /**
   * Check if error is recoverable and should be retried
   */
  static isRecoverable(error: BusinessWorkflowError): boolean {
    return error.recoverable && error.severity !== 'critical';
  }

  /**
   * Get retry delay for recoverable errors
   */
  static getRetryDelay(error: BusinessWorkflowError): number {
    return error.retryAfter || 5000; // Default 5 second delay
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: BusinessWorkflowError): string {
    return JSON.stringify(error.toJSON(), null, 2);
  }
}

// Export commonly used error types
export {
  BusinessWorkflowError,
  AgentInitializationError,
  AgentExecutionError,
  AgentTimeoutError,
  WorkflowConfigurationError,
  WorkflowStateError,
  WorkflowTransitionError,
  ExternalServiceError,
  GitHubIntegrationError,
  MemoryServiceError,
  LLMProviderError,
  InputValidationError,
  StateValidationError,
  MissingConfigurationError,
  InvalidConfigurationError,
  BusinessWorkflowErrorFactory,
};