// Module
export { MonitoringModule } from './lib/monitoring.module';

// Providers (moved from main library)
export { MetricsProvider } from './lib/providers/metrics.provider';
export { TraceProvider } from './lib/providers/trace.provider';

// Services
export { MonitoringFacadeService } from './lib/services/monitoring-facade.service';
export { MetricsCollectorService } from './lib/services/metrics-collector.service';
export { AlertingService } from './lib/services/alerting.service';
export { HealthCheckService } from './lib/services/health-check.service';

// Interfaces
export * from './lib/interfaces/monitoring.interface';

// Constants
export * from './lib/constants';
