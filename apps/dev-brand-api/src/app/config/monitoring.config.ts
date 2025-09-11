import type { MonitoringConfig } from '@hive-academy/langgraph-monitoring';

/**
 * Monitoring Module Configuration for dev-brand-api
 * Provides observability for LangGraph workflows and agents
 */
export function getMonitoringConfig(): MonitoringConfig {
  return {
    // Overall monitoring enabled flag
    enabled: process.env.MONITORING_ENABLED !== 'false',

    // Metrics collection settings
    metrics: {
      backend:
        (process.env.MONITORING_METRICS_BACKEND as
          | 'prometheus'
          | 'datadog'
          | 'custom'
          | 'memory') || 'prometheus',
      batchSize: parseInt(process.env.MONITORING_BATCH_SIZE || '100'),
      flushInterval: parseInt(process.env.MONITORING_FLUSH_INTERVAL || '10000'), // 10 seconds
      maxBufferSize: parseInt(process.env.MONITORING_MAX_BUFFER_SIZE || '1000'),
      retention: process.env.MONITORING_METRICS_RETENTION || '24h',
      defaultTags: {
        service: 'dev-brand-api',
        environment: process.env.NODE_ENV || 'development',
      },
    },

    // Alerting settings
    alerting: {
      enabled: process.env.MONITORING_ALERTING_ENABLED === 'true',
      evaluationInterval: parseInt(
        process.env.MONITORING_EVALUATION_INTERVAL || '30000'
      ), // 30 seconds
      channels: [
        {
          name: 'default-webhook',
          type: 'webhook',
          config: {
            url: process.env.MONITORING_WEBHOOK_URL || '',
          },
          enabled: !!process.env.MONITORING_WEBHOOK_URL,
        },
      ],
      rules: [
        {
          name: 'high-error-rate',
          description: 'Alert when error rate exceeds threshold',
          condition: {
            metric: 'workflow.error_rate',
            operator: '>',
            threshold: parseFloat(
              process.env.MONITORING_ERROR_THRESHOLD || '0.05'
            ), // 5%
            window: '5m',
          },
          severity: 'critical',
          cooldown: 300000, // 5 minutes
        },
      ],
      escalation: {
        id: 'default-escalation',
        name: 'Default Escalation Policy',
        rules: [
          {
            delay: 300000, // 5 minutes
            channels: ['default-webhook'],
            severity: 'critical',
          },
        ],
      },
    },

    // Health check settings
    healthChecks: {
      enabled: process.env.MONITORING_HEALTH_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_HEALTH_INTERVAL || '30000'), // 30 seconds
      timeout: parseInt(process.env.MONITORING_HEALTH_TIMEOUT || '5000'), // 5 seconds
      retries: parseInt(process.env.MONITORING_HEALTH_RETRIES || '3'),
      gracefulShutdownTimeout: parseInt(
        process.env.MONITORING_SHUTDOWN_TIMEOUT || '30000'
      ), // 30 seconds
    },

    // Performance monitoring settings
    performance: {
      trackingEnabled: process.env.MONITORING_PERFORMANCE_ENABLED !== 'false',
      anomalyDetection: process.env.MONITORING_ANOMALY_DETECTION === 'true',
      baselineWindow: process.env.MONITORING_BASELINE_WINDOW || '1h',
      sensitivityThreshold: parseFloat(
        process.env.MONITORING_SENSITIVITY || '2.0'
      ),
      minSamples: parseInt(process.env.MONITORING_MIN_SAMPLES || '30'),
    },

    // Dashboard settings
    dashboard: {
      httpPort: parseInt(process.env.MONITORING_DASHBOARD_PORT || '3001'),
      refreshInterval: parseInt(
        process.env.MONITORING_REFRESH_INTERVAL || '5000'
      ), // 5 seconds
      theme: process.env.MONITORING_DASHBOARD_THEME || 'dark',
      authentication: {
        enabled: process.env.MONITORING_AUTH_ENABLED === 'true',
        provider: 'basic',
        config: {
          username: process.env.MONITORING_USERNAME || 'admin',
          password: process.env.MONITORING_PASSWORD || 'admin',
        },
      },
    },
  };
}
