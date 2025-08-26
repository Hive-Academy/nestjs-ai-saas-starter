/**
 * Monitoring Module Configuration for dev-brand-api
 * Provides observability for LangGraph workflows and agents
 */
export function getMonitoringConfig() {
  return {
    // Metrics collection settings
    metrics: {
      enabled: process.env.MONITORING_METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '10000'), // 10 seconds
      retention: parseInt(process.env.MONITORING_METRICS_RETENTION || '86400'), // 24 hours
      exportFormat: process.env.MONITORING_EXPORT_FORMAT || 'prometheus', // prometheus, json, influx
    },
    
    // Tracing settings
    tracing: {
      enabled: process.env.MONITORING_TRACING_ENABLED !== 'false',
      samplingRate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '0.1'), // 10%
      maxSpanCount: parseInt(process.env.MONITORING_MAX_SPAN_COUNT || '10000'),
      exportEndpoint: process.env.MONITORING_TRACE_ENDPOINT || 'http://localhost:14268/api/traces',
    },
    
    // Logging settings
    logging: {
      level: process.env.MONITORING_LOG_LEVEL || 'info',
      structured: process.env.MONITORING_STRUCTURED_LOGS !== 'false',
      includeContext: process.env.MONITORING_INCLUDE_CONTEXT !== 'false',
      maxLogSize: parseInt(process.env.MONITORING_MAX_LOG_SIZE || '1048576'), // 1MB
    },
    
    // Alert settings
    alerts: {
      enabled: process.env.MONITORING_ALERTS_ENABLED === 'true',
      thresholds: {
        errorRate: parseFloat(process.env.MONITORING_ERROR_THRESHOLD || '0.05'), // 5%
        latencyP99: parseInt(process.env.MONITORING_LATENCY_THRESHOLD || '5000'), // 5 seconds
        memoryUsage: parseFloat(process.env.MONITORING_MEMORY_THRESHOLD || '0.8'), // 80%
      },
      webhookUrl: process.env.MONITORING_WEBHOOK_URL,
    },
    
    // Health check settings
    health: {
      enabled: process.env.MONITORING_HEALTH_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_HEALTH_INTERVAL || '30000'), // 30 seconds
      timeout: parseInt(process.env.MONITORING_HEALTH_TIMEOUT || '5000'), // 5 seconds
      endpoints: [
        '/health',
        '/metrics',
        '/ready',
      ],
    },
    
    // Development features for demo
    demo: {
      enableDashboard: process.env.NODE_ENV === 'development',
      mockMetrics: process.env.NODE_ENV === 'development',
      verboseLogging: process.env.NODE_ENV === 'development',
    },
  };
}