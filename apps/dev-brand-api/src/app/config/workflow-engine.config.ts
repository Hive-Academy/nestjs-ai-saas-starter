import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

/**
 * Workflow Engine Module Configuration for dev-brand-api
 * Core workflow orchestration for LangGraph applications
 */
export function getWorkflowEngineConfig(): WorkflowEngineModuleOptions {
  return {
    // Workflow execution settings
    execution: {
      maxConcurrentWorkflows: parseInt(
        process.env.WORKFLOW_MAX_CONCURRENT || '10'
      ),
      defaultTimeout: parseInt(
        process.env.WORKFLOW_DEFAULT_TIMEOUT || '300000'
      ), // 5 minutes
      retryAttempts: parseInt(process.env.WORKFLOW_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.WORKFLOW_RETRY_DELAY || '1000'),
    },

    // Workflow scheduling settings
    scheduling: {
      enabled: process.env.WORKFLOW_SCHEDULING_ENABLED !== 'false',
      maxScheduledWorkflows: parseInt(
        process.env.WORKFLOW_MAX_SCHEDULED || '100'
      ),
      cronEnabled: process.env.WORKFLOW_CRON_ENABLED === 'true',
      timezone: process.env.WORKFLOW_TIMEZONE || 'UTC',
    },

    // State management settings
    state: {
      persistenceEnabled: process.env.WORKFLOW_PERSISTENCE_ENABLED !== 'false',
      stateTimeout: parseInt(process.env.WORKFLOW_STATE_TIMEOUT || '3600000'), // 1 hour
      compressionEnabled: process.env.WORKFLOW_COMPRESSION_ENABLED === 'true',
      encryptionEnabled: process.env.WORKFLOW_ENCRYPTION_ENABLED === 'true',
    },

    // Error handling settings
    errorHandling: {
      strategy: process.env.WORKFLOW_ERROR_STRATEGY || 'retry', // retry, fail, ignore
      deadLetterQueue: process.env.WORKFLOW_DLQ_ENABLED === 'true',
      errorReporting: process.env.WORKFLOW_ERROR_REPORTING !== 'false',
      circuitBreaker: process.env.WORKFLOW_CIRCUIT_BREAKER_ENABLED === 'true',
    },

    // Performance optimization settings
    performance: {
      poolSize: parseInt(process.env.WORKFLOW_POOL_SIZE || '5'),
      queueSize: parseInt(process.env.WORKFLOW_QUEUE_SIZE || '1000'),
      batchProcessing: process.env.WORKFLOW_BATCH_PROCESSING_ENABLED === 'true',
      batchSize: parseInt(process.env.WORKFLOW_BATCH_SIZE || '10'),
    },

    // Monitoring and observability
    observability: {
      metricsEnabled: process.env.WORKFLOW_METRICS_ENABLED !== 'false',
      tracingEnabled: process.env.WORKFLOW_TRACING_ENABLED !== 'false',
      auditLogging: process.env.WORKFLOW_AUDIT_LOGGING_ENABLED !== 'false',
      healthChecks: process.env.WORKFLOW_HEALTH_CHECKS_ENABLED !== 'false',
    },

    // Development features for demo
    demo: {
      enableWorkflowBuilder: process.env.NODE_ENV === 'development',
      visualWorkflowExecution: process.env.NODE_ENV === 'development',
      mockWorkflows: process.env.WORKFLOW_MOCK_MODE === 'true',
      debugWorkflowSteps: process.env.NODE_ENV === 'development',
    },
  };
}
