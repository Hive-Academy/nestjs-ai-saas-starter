# Memory Health Check Investigation Report

## Root Cause Analysis - Excessive Logging

**Investigation Date**: January 11, 2025
**Investigator**: Research Expert Agent
**Priority**: P1 - HIGH
**Status**: Analysis Complete - Recommendations Provided

---

## Executive Summary

**FINDING**: The memory health check logs "unhealthy" status every 60 seconds for 41+ minutes, creating excessive log noise. This investigation reveals **TWO DISTINCT PROBLEMS**:

1. **LOGGING ISSUE (P0)**: Logs repeat every check regardless of state (should only log on state _changes_)
2. **THRESHOLD ISSUE (P1)**: Missing memory usage values in logs prevent determination of actual vs. threshold problem

**IMPACT**:

- Log files polluted with repetitive health warnings (41 occurrences in 41 minutes)
- Inability to diagnose actual memory issues due to missing data
- False alarms potentially masking real problems
- Monitoring dashboard shows perpetual "unhealthy" state

**RECOMMENDATION**: Implement state-change-only logging + add actual memory values to logs

---

## 1. Current Implementation Analysis

### Location

`libs/langgraph-modules/monitoring/src/lib/services/health-check.service.ts`

### Memory Check Implementation (Lines 363-385)

```typescript
// Memory usage check with proper state differentiation
this.register('memory', async () => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  // Determine state explicitly to avoid ambiguity
  const isUnhealthy = usagePercent >= 90; // ❌ UNHEALTHY: >= 90%
  const isDegraded = usagePercent >= 80 && usagePercent < 90; // ⚠️ DEGRADED: 80-89%
  const isHealthy = usagePercent < 80; // ✅ HEALTHY: < 80%

  // Return object with explicit state determination
  return {
    healthy: isHealthy && !isDegraded && !isUnhealthy,
    degraded: !isHealthy && isDegraded && !isUnhealthy,
    unhealthy: !isHealthy && !isDegraded && isUnhealthy,
    usagePercent: Math.round(usagePercent * 100) / 100,
    heapUsedMB: Math.round(heapUsedMB),
    heapTotalMB: Math.round(heapTotalMB),
    rssUsedMB: Math.round(memUsage.rss / 1024 / 1024),
  };
});
```

**ANALYSIS**:

- ✅ Logic is correct: clear three-way state determination
- ✅ Returns detailed metadata including actual memory values
- ❌ **PROBLEM**: Metadata is NOT logged by the scheduled health check

### Scheduled Health Check (Lines 328-356)

```typescript
private async performScheduledHealthCheck(): Promise<void> {
  if (this.isShuttingDown) {
    return;
  }

  this.logger.debug('Performing scheduled health check...');

  try {
    const health = await this.getSystemHealth();

    if (health.overall !== 'healthy') {
      this.logger.warn('System health degraded:', {
        overall: health.overall,
        unhealthyServices: Object.entries(health.services)
          .filter(([_, service]) => service.state !== 'healthy')
          .map(([name, service]) => ({
            name,
            state: service.state,
            error: service.error,
            // ❌ MISSING: service.metadata (contains actual memory values!)
          })),
      });
    }
  } catch (error) {
    this.logger.error(
      'Scheduled health check failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}
```

**KEY FINDINGS**:

1. **No State Change Detection**: Logs on EVERY check, not just state changes
2. **Missing Metadata**: `service.metadata` (containing `usagePercent`, `heapUsedMB`, etc.) is NOT logged
3. **Runs Every 60 Seconds**: Hardcoded in constructor (line 61)

### What the Logs Show

```
[Nest] 28948  - 11/11/2025, 10:27:03 PM    WARN [HealthCheckService] System health degraded:
[Nest] 28948  - 11/11/2025, 10:27:03 PM    WARN [HealthCheckService] Object(2) {
  overall: 'unhealthy',
  unhealthyServices: [
    {
      name: 'memory',
      state: 'unhealthy',
      error: undefined        // ❌ No error = threshold exceeded, not exception
    }
  ]
}
```

**CRITICAL OBSERVATION**:

- `error: undefined` confirms this is a THRESHOLD issue, not an exception
- However, **actual memory values are missing**, preventing diagnosis
- Pattern repeats **every 60 seconds for 41 minutes** = 41 identical log entries

---

## 2. Actual Memory Usage Findings

### Problem: No Memory Values in Logs

**ISSUE**: The logs show `state: 'unhealthy'` but do NOT include:

- `usagePercent` (e.g., 92.5%)
- `heapUsedMB` (e.g., 450 MB)
- `heapTotalMB` (e.g., 512 MB)
- `rssUsedMB` (e.g., 600 MB)

**WHY**: Line 346 of `performScheduledHealthCheck()` only logs:

- `name`, `state`, `error`
- **NOT** `metadata` (which contains all memory values)

### What We Can Infer

From the pattern:

1. **Consistent State**: "unhealthy" for 41+ minutes straight
2. **No Error Message**: Indicates threshold breach, not crash
3. **Server Stability**: Application runs normally (no crashes, restarts, or degradation)
4. **No Recovery**: State never transitions to "degraded" or "healthy"

**LIKELY SCENARIOS**:

| Scenario                                     | Probability  | Evidence                                                  |
| -------------------------------------------- | ------------ | --------------------------------------------------------- |
| Memory usage genuinely 90%+                  | **HIGH**     | Consistent state, no recovery                             |
| Threshold too strict (should be 95% for dev) | **MEDIUM**   | Development environment may have tighter memory           |
| Memory leak (gradual)                        | **LOW**      | Would expect degradation over time, not instant unhealthy |
| Memory leak (instant)                        | **VERY LOW** | Server stable for 42+ minutes                             |

**RECOMMENDATION**: Cannot determine root cause without actual memory values. Must add logging.

---

## 3. Root Cause Determination

### Primary Issue: Excessive Logging Pattern

**ROOT CAUSE**: `performScheduledHealthCheck()` logs on EVERY execution, not just state changes.

**EVIDENCE**:

- 41 identical log entries in 41 minutes
- No conditional logic to detect state transitions
- Logs even when state hasn't changed

**DESIGN FLAW**:

```typescript
// Current behavior (WRONG):
if (health.overall !== 'healthy') {
  this.logger.warn(...);  // ❌ Logs EVERY TIME, even if state unchanged
}

// Should be:
if (health.overall !== 'healthy' && previousState !== health.overall) {
  this.logger.warn(...);  // ✅ Only logs on state CHANGE
}
```

### Secondary Issue: Missing Diagnostic Data

**ROOT CAUSE**: `performScheduledHealthCheck()` doesn't log `service.metadata`.

**EVIDENCE**:

- Memory check returns detailed metadata: `usagePercent`, `heapUsedMB`, etc.
- Scheduled check only logs: `name`, `state`, `error`
- Metadata discarded during logging (line 342-347)

**IMPACT**: Impossible to diagnose if threshold is:

- Too strict (e.g., 90% when actual is 91%)
- Appropriate (e.g., 90% when actual is 98% - genuine problem)

### Threshold Appropriateness (Unknown)

**CANNOT DETERMINE** without actual memory values. Possibilities:

**Scenario A: Threshold Too Strict (Likely for Dev)**

```
Actual: 91% usage
Threshold: 90% unhealthy
Conclusion: False alarm - dev environments often run hotter
Fix: Increase threshold to 95% for development
```

**Scenario B: Genuine High Memory Usage**

```
Actual: 97% usage
Threshold: 90% unhealthy
Conclusion: Real problem - investigate memory leak
Fix: Profile memory, identify leaks
```

**Scenario C: Environment-Specific Issue**

```
Actual: 92% usage in development, 70% in production
Threshold: 90% for both
Conclusion: Dev has less memory than prod config expects
Fix: Environment-specific thresholds
```

---

## 4. Recommendations with Priority

### P0: Fix Excessive Logging (Immediate - 30 minutes)

**PROBLEM**: Logs every 60 seconds regardless of state change
**SOLUTION**: Only log on state transitions

```typescript
// Add to HealthCheckService class:
private previousOverallState: HealthState | null = null;
private previousServiceStates = new Map<string, HealthState>();

private async performScheduledHealthCheck(): Promise<void> {
  if (this.isShuttingDown) {
    return;
  }

  this.logger.debug('Performing scheduled health check...');

  try {
    const health = await this.getSystemHealth();
    const stateChanged = this.previousOverallState !== health.overall;

    if (health.overall !== 'healthy' && stateChanged) {
      this.logger.warn('System health degraded:', {
        overall: health.overall,
        previousState: this.previousOverallState || 'unknown',
        unhealthyServices: Object.entries(health.services)
          .filter(([_, service]) => service.state !== 'healthy')
          .map(([name, service]) => ({
            name,
            state: service.state,
            error: service.error,
            metadata: service.metadata,  // ✅ ADD: Include actual values
          })),
      });
    } else if (stateChanged && health.overall === 'healthy') {
      this.logger.log('System health restored:', {
        overall: health.overall,
        previousState: this.previousOverallState || 'unknown',
      });
    }

    this.previousOverallState = health.overall;

    // Track individual service state changes for debugging
    Object.entries(health.services).forEach(([name, service]) => {
      const prevState = this.previousServiceStates.get(name);
      if (prevState !== service.state) {
        this.logger.log(`Service '${name}' state changed: ${prevState} -> ${service.state}`, {
          metadata: service.metadata,
        });
        this.previousServiceStates.set(name, service.state);
      }
    });
  } catch (error) {
    this.logger.error(
      'Scheduled health check failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}
```

**BENEFITS**:

- Reduces log noise by ~97% (1 log per state change vs. 1 per check)
- Clearly shows when problems start/stop
- Includes actual memory values for diagnosis

**EXAMPLE OUTPUT**:

```
[10:27:03] WARN System health degraded: { overall: 'unhealthy', previousState: 'healthy', unhealthyServices: [{ name: 'memory', state: 'unhealthy', metadata: { usagePercent: 92.34, heapUsedMB: 473, heapTotalMB: 512 } }] }
[10:32:15] LOG Service 'memory' state changed: unhealthy -> degraded { metadata: { usagePercent: 88.12, heapUsedMB: 451, heapTotalMB: 512 } }
[10:35:00] LOG System health restored: { overall: 'healthy', previousState: 'degraded' }
```

### P1: Add Environment-Specific Thresholds (High Priority - 1 hour)

**PROBLEM**: Hardcoded 90% threshold may be inappropriate for development
**SOLUTION**: Make thresholds configurable per environment

#### Step 1: Update Monitoring Configuration Interface

```typescript
// libs/langgraph-modules/monitoring/src/lib/interfaces/monitoring.interface.ts

export interface MonitoringConfig {
  // ... existing fields
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
    gracefulShutdownTimeout?: number;

    // ✅ ADD: Memory-specific thresholds
    memory?: {
      unhealthyThreshold: number; // Percentage (default: 90)
      degradedThreshold: number; // Percentage (default: 80)
    };
  };
}
```

#### Step 2: Update Health Check Service

```typescript
// health-check.service.ts constructor

constructor(
  @Optional() @Inject('MONITORING_CONFIG') private config?: MonitoringConfig
) {
  // ... existing interval setup
  this.registerDefaultChecks();
}

private registerDefaultChecks(): void {
  // Memory usage check with configurable thresholds
  this.register('memory', async () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    // ✅ USE CONFIGURABLE THRESHOLDS
    const unhealthyThreshold = this.config?.healthChecks?.memory?.unhealthyThreshold ?? 90;
    const degradedThreshold = this.config?.healthChecks?.memory?.degradedThreshold ?? 80;

    const isUnhealthy = usagePercent >= unhealthyThreshold;
    const isDegraded = usagePercent >= degradedThreshold && usagePercent < unhealthyThreshold;
    const isHealthy = usagePercent < degradedThreshold;

    return {
      healthy: isHealthy && !isDegraded && !isUnhealthy,
      degraded: !isHealthy && isDegraded && !isUnhealthy,
      unhealthy: !isHealthy && !isDegraded && isUnhealthy,
      usagePercent: Math.round(usagePercent * 100) / 100,
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      rssUsedMB: Math.round(memUsage.rss / 1024 / 1024),
      // ✅ ADD: Threshold info for debugging
      thresholds: {
        unhealthy: unhealthyThreshold,
        degraded: degradedThreshold,
      },
    };
  });

  // ... rest of checks
}
```

#### Step 3: Update Application Configuration

```typescript
// apps/dev-brand-api/src/app/config/monitoring.config.ts

export function getMonitoringConfig(): MonitoringConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // ... existing config
    healthChecks: {
      enabled: process.env.MONITORING_HEALTH_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_HEALTH_INTERVAL || '30000'),
      timeout: parseInt(process.env.MONITORING_HEALTH_TIMEOUT || '5000'),
      retries: parseInt(process.env.MONITORING_HEALTH_RETRIES || '3'),
      gracefulShutdownTimeout: parseInt(process.env.MONITORING_SHUTDOWN_TIMEOUT || '30000'),

      // ✅ ADD: Environment-specific memory thresholds
      memory: {
        unhealthyThreshold: parseInt(
          process.env.MEMORY_HEALTH_THRESHOLD_UNHEALTHY || (isDevelopment ? '95' : '90')
        ),
        degradedThreshold: parseInt(
          process.env.MEMORY_HEALTH_THRESHOLD_DEGRADED || (isDevelopment ? '90' : '80')
        ),
      },
    },
  };
}
```

#### Step 4: Update Environment Configuration

```bash
# apps/dev-brand-api/.env.example

# Memory Health Check Thresholds
# Development: More lenient (95%/90%)
# Production: Stricter (90%/80%)
MEMORY_HEALTH_THRESHOLD_UNHEALTHY=95  # Development: 95%, Production: 90%
MEMORY_HEALTH_THRESHOLD_DEGRADED=90   # Development: 90%, Production: 80%
```

**BENEFITS**:

- Development environments can tolerate higher memory usage
- Production gets early warnings at 80% degraded
- Easy to adjust without code changes
- Clear documentation of expected behavior

### P2: Add Memory Profiling Endpoint (Medium Priority - 1 hour)

**PROBLEM**: Cannot diagnose memory leaks from logs alone
**SOLUTION**: Add debug endpoint for detailed memory analysis

```typescript
// apps/dev-brand-api/src/app/controllers/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from '@hive-academy/langgraph-monitoring';

@Controller('health')
export class HealthController {
  constructor(private readonly healthCheck: HealthCheckService) {}

  @Get('memory/detailed')
  async getDetailedMemoryStats() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    return {
      timestamp: new Date(),
      process: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsedPercent:
          Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100 + '%',
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024) + ' MB',
      },
      v8: {
        totalHeapSize: Math.round(heapStats.total_heap_size / 1024 / 1024) + ' MB',
        usedHeapSize: Math.round(heapStats.used_heap_size / 1024 / 1024) + ' MB',
        heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024) + ' MB',
        mallocedMemory: Math.round(heapStats.malloced_memory / 1024 / 1024) + ' MB',
        numberOfNativeContexts: heapStats.number_of_native_contexts,
        numberOfDetachedContexts: heapStats.number_of_detached_contexts,
      },
      healthCheck: await this.healthCheck.getServiceHealth('memory'),
    };
  }
}
```

**USAGE**:

```bash
curl http://localhost:3000/api/health/memory/detailed
```

**EXAMPLE OUTPUT**:

```json
{
  "timestamp": "2025-01-11T23:15:00.000Z",
  "process": {
    "heapUsed": "473 MB",
    "heapTotal": "512 MB",
    "heapUsedPercent": "92.38%",
    "rss": "624 MB",
    "external": "12 MB",
    "arrayBuffers": "2 MB"
  },
  "v8": {
    "totalHeapSize": "512 MB",
    "usedHeapSize": "473 MB",
    "heapSizeLimit": "2048 MB",
    "mallocedMemory": "5 MB",
    "numberOfNativeContexts": 3,
    "numberOfDetachedContexts": 0
  },
  "healthCheck": {
    "state": "unhealthy",
    "lastCheck": "2025-01-11T23:15:00.000Z",
    "responseTime": 2,
    "metadata": {
      "usagePercent": 92.38,
      "heapUsedMB": 473,
      "heapTotalMB": 512,
      "rssUsedMB": 624,
      "thresholds": {
        "unhealthy": 95,
        "degraded": 90
      }
    }
  }
}
```

### P3: Implement Logging Rate Limiting (Optional - 30 minutes)

**PROBLEM**: If state change detection fails, logs still spam
**SOLUTION**: Add rate limiting as fallback protection

```typescript
// health-check.service.ts

private lastLogTime = new Map<string, number>();
private readonly logCooldown = 300000; // 5 minutes

private shouldLogStateChange(serviceName: string, force: boolean = false): boolean {
  if (force) return true;

  const lastLog = this.lastLogTime.get(serviceName) || 0;
  const now = Date.now();

  if (now - lastLog >= this.logCooldown) {
    this.lastLogTime.set(serviceName, now);
    return true;
  }

  return false;
}

private async performScheduledHealthCheck(): Promise<void> {
  // ... existing logic

  if (health.overall !== 'healthy' && stateChanged) {
    if (this.shouldLogStateChange('system', true)) {  // Force log on state change
      this.logger.warn('System health degraded:', {
        overall: health.overall,
        // ... rest of log
      });
    }
  } else if (health.overall !== 'healthy' && this.shouldLogStateChange('system')) {
    // Rate-limited periodic reminder (max once per 5 minutes)
    this.logger.warn('System health still degraded (periodic reminder):', {
      overall: health.overall,
      duration: Date.now() - (this.lastLogTime.get('system') || Date.now()),
      // ... rest of log
    });
  }
}
```

**BENEFITS**:

- Even if state change detection breaks, logs limited to 1 per 5 minutes
- Periodic reminders ensure persistent issues aren't forgotten
- Protects log files from excessive growth

---

## 5. Implementation Priority & Effort

| Priority | Recommendation                            | Effort | Impact                       | Risk                       |
| -------- | ----------------------------------------- | ------ | ---------------------------- | -------------------------- |
| **P0**   | Fix excessive logging (state-change-only) | 30 min | HIGH - Reduces log noise 97% | LOW - Backwards compatible |
| **P1**   | Add environment-specific thresholds       | 1 hour | HIGH - Fixes false alarms    | LOW - Backwards compatible |
| **P2**   | Add memory profiling endpoint             | 1 hour | MEDIUM - Enables diagnosis   | NONE - New feature         |
| **P3**   | Implement log rate limiting               | 30 min | LOW - Fallback protection    | NONE - Additional safety   |

**TOTAL EFFORT**: 3 hours
**EXPECTED LOG REDUCTION**: ~97% (41 logs → ~2 logs per incident)

---

## 6. Testing Checklist

After implementing P0 + P1 fixes:

### Scenario A: Normal Operation (Memory < 80%)

```
Expected Logs:
- [Startup] LOG: HealthCheckService initialized with 60s monitoring interval
- [Optional] DEBUG: Performing scheduled health check... (every 60s)
- NO WARN logs (system healthy)

✅ Pass: No repetitive warnings
```

### Scenario B: Degraded State (Memory 80-89% or 90-94% in dev)

```
Expected Logs:
- [First detection] WARN: System health degraded: { overall: 'degraded', previousState: 'healthy', unhealthyServices: [...] }
- [Optional] DEBUG: Performing scheduled health check... (every 60s)
- [Recovery] LOG: System health restored: { overall: 'healthy', previousState: 'degraded' }

✅ Pass: Only logs on state change
```

### Scenario C: Unhealthy State (Memory >= 90% prod or >= 95% dev)

```
Expected Logs:
- [First detection] WARN: System health degraded: { overall: 'unhealthy', previousState: 'degraded', unhealthyServices: [{ name: 'memory', metadata: { usagePercent: 96.5 } }] }
- [Optional] DEBUG: Performing scheduled health check... (every 60s)
- [If P3 implemented] WARN: System health still degraded (periodic reminder): ... (every 5 minutes)

✅ Pass: Clear indication of problem severity with actual values
```

### Scenario D: State Transitions

```
Expected Logs:
- [Healthy → Degraded] WARN: System health degraded: { overall: 'degraded', previousState: 'healthy' }
- [Degraded → Unhealthy] WARN: System health degraded: { overall: 'unhealthy', previousState: 'degraded' }
- [Unhealthy → Degraded] LOG: Service 'memory' state changed: unhealthy -> degraded { metadata: { usagePercent: 88.0 } }
- [Degraded → Healthy] LOG: System health restored: { overall: 'healthy', previousState: 'degraded' }

✅ Pass: All transitions logged once
```

---

## 7. Code Examples for Fixes

### Complete P0 Fix (State-Change-Only Logging)

**File**: `libs/langgraph-modules/monitoring/src/lib/services/health-check.service.ts`

```typescript
export class HealthCheckService implements IHealthCheck, OnModuleDestroy {
  private readonly logger = new Logger(HealthCheckService.name);

  // ✅ ADD: State tracking for change detection
  private previousOverallState: HealthState | null = null;
  private previousServiceStates = new Map<string, HealthState>();

  // ... existing fields

  private async performScheduledHealthCheck(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.logger.debug('Performing scheduled health check...');

    try {
      const health = await this.getSystemHealth();

      // ✅ ADD: Detect overall state change
      const overallStateChanged = this.previousOverallState !== health.overall;

      // ✅ CHANGE: Only log on state transitions
      if (health.overall !== 'healthy') {
        if (overallStateChanged) {
          // State just changed to degraded/unhealthy
          this.logger.warn('System health degraded:', {
            overall: health.overall,
            previousState: this.previousOverallState || 'unknown',
            unhealthyServices: Object.entries(health.services)
              .filter(([_, service]) => service.state !== 'healthy')
              .map(([name, service]) => ({
                name,
                state: service.state,
                error: service.error,
                metadata: service.metadata, // ✅ ADD: Include actual memory values
              })),
          });
        }
        // Note: No else clause - don't log if state unchanged
      } else if (overallStateChanged && this.previousOverallState !== null) {
        // State just changed to healthy (recovery)
        this.logger.log('System health restored:', {
          overall: health.overall,
          previousState: this.previousOverallState,
          timestamp: new Date(),
        });
      }

      // ✅ ADD: Track individual service state changes (optional, for debugging)
      Object.entries(health.services).forEach(([name, service]) => {
        const prevState = this.previousServiceStates.get(name);
        if (prevState !== service.state) {
          this.logger.log(
            `Service '${name}' state changed: ${prevState || 'unknown'} -> ${service.state}`,
            {
              metadata: service.metadata,
            }
          );
          this.previousServiceStates.set(name, service.state);
        }
      });

      // ✅ ADD: Update state tracking
      this.previousOverallState = health.overall;
    } catch (error) {
      this.logger.error(
        'Scheduled health check failed:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
```

### Complete P1 Fix (Configurable Thresholds)

**File 1**: `libs/langgraph-modules/monitoring/src/lib/interfaces/monitoring.interface.ts`

```typescript
export interface MonitoringConfig {
  enabled: boolean;
  metrics: MetricsConfig;
  alerting: AlertingConfig;
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
    gracefulShutdownTimeout?: number;

    // ✅ ADD: Memory-specific configuration
    memory?: {
      unhealthyThreshold: number; // Percentage (default: 90)
      degradedThreshold: number; // Percentage (default: 80)
    };
  };
  performance?: PerformanceConfig;
  dashboard?: DashboardConfig;
}
```

**File 2**: `health-check.service.ts` (continued from P0 fix)

```typescript
constructor(
  @Optional() @Inject('MONITORING_CONFIG') private config?: MonitoringConfig
) {
  // Start periodic health monitoring (every minute)
  this.monitoringInterval = setInterval(() => {
    this.performScheduledHealthCheck().catch((error) => {
      this.logger.error('Scheduled health check failed:', error);
    });
  }, 60000);

  // Register default system checks
  this.registerDefaultChecks();

  this.logger.log(
    'HealthCheckService initialized with 60s monitoring interval'
  );
}

private registerDefaultChecks(): void {
  // ✅ CHANGE: Use configurable thresholds
  this.register('memory', async () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    // ✅ ADD: Get thresholds from config or use defaults
    const unhealthyThreshold = this.config?.healthChecks?.memory?.unhealthyThreshold ?? 90;
    const degradedThreshold = this.config?.healthChecks?.memory?.degradedThreshold ?? 80;

    // ✅ CHANGE: Use configurable thresholds instead of hardcoded
    const isUnhealthy = usagePercent >= unhealthyThreshold;
    const isDegraded = usagePercent >= degradedThreshold && usagePercent < unhealthyThreshold;
    const isHealthy = usagePercent < degradedThreshold;

    return {
      healthy: isHealthy && !isDegraded && !isUnhealthy,
      degraded: !isHealthy && isDegraded && !isUnhealthy,
      unhealthy: !isHealthy && !isDegraded && isUnhealthy,
      usagePercent: Math.round(usagePercent * 100) / 100,
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      rssUsedMB: Math.round(memUsage.rss / 1024 / 1024),
      // ✅ ADD: Include threshold info for transparency
      thresholds: {
        unhealthy: unhealthyThreshold,
        degraded: degradedThreshold,
      },
    };
  });

  // CPU and uptime checks remain unchanged
  // ...
}
```

**File 3**: `apps/dev-brand-api/src/app/config/monitoring.config.ts`

```typescript
export function getMonitoringConfig(): MonitoringConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    enabled: process.env.MONITORING_ENABLED !== 'false',

    metrics: {
      backend: (process.env.MONITORING_METRICS_BACKEND as any) || 'prometheus',
      batchSize: parseInt(process.env.MONITORING_BATCH_SIZE || '100'),
      flushInterval: parseInt(process.env.MONITORING_FLUSH_INTERVAL || '10000'),
      maxBufferSize: parseInt(process.env.MONITORING_MAX_BUFFER_SIZE || '1000'),
      retention: process.env.MONITORING_METRICS_RETENTION || '24h',
      defaultTags: {
        service: 'dev-brand-api',
        environment: process.env.NODE_ENV || 'development',
      },
    },

    alerting: {
      enabled: process.env.MONITORING_ALERTING_ENABLED === 'true',
      evaluationInterval: parseInt(process.env.MONITORING_EVALUATION_INTERVAL || '30000'),
      defaultCooldown: parseInt(process.env.MONITORING_DEFAULT_COOLDOWN || '300000'),
      channels: [
        {
          type: 'webhook',
          name: 'default-webhook',
          config: { url: process.env.MONITORING_WEBHOOK_URL || '' },
          enabled: !!process.env.MONITORING_WEBHOOK_URL,
        },
      ] as const,
      escalationPolicies: [
        {
          id: 'default-escalation',
          name: 'Default Escalation Policy',
          rules: [
            {
              delay: 300000,
              channels: ['default-webhook'],
              severity: 'critical' as const,
            },
          ],
        },
      ] as const,
    },

    healthChecks: {
      enabled: process.env.MONITORING_HEALTH_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_HEALTH_INTERVAL || '30000'),
      timeout: parseInt(process.env.MONITORING_HEALTH_TIMEOUT || '5000'),
      retries: parseInt(process.env.MONITORING_HEALTH_RETRIES || '3'),
      gracefulShutdownTimeout: parseInt(process.env.MONITORING_SHUTDOWN_TIMEOUT || '30000'),

      // ✅ ADD: Environment-specific memory thresholds
      memory: {
        unhealthyThreshold: parseInt(
          process.env.MEMORY_HEALTH_THRESHOLD_UNHEALTHY || (isDevelopment ? '95' : '90')
        ),
        degradedThreshold: parseInt(
          process.env.MEMORY_HEALTH_THRESHOLD_DEGRADED || (isDevelopment ? '90' : '80')
        ),
      },
    },

    performance: {
      trackingEnabled: process.env.MONITORING_PERFORMANCE_ENABLED !== 'false',
      anomalyDetection: process.env.MONITORING_ANOMALY_DETECTION === 'true',
      baselineWindow: process.env.MONITORING_BASELINE_WINDOW || '1h',
      sensitivityThreshold: parseFloat(process.env.MONITORING_SENSITIVITY || '2.0'),
      minSamples: parseInt(process.env.MONITORING_MIN_SAMPLES || '30'),
    },

    dashboard: {
      id: 'dev-brand-dashboard',
      name: 'DevBrand Monitoring Dashboard',
      description: 'Real-time monitoring dashboard for DevBrand API',
      widgets: [] as const,
      refreshInterval: parseInt(process.env.MONITORING_REFRESH_INTERVAL || '5000'),
      timeRange: {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}
```

**File 4**: `apps/dev-brand-api/.env.example`

```bash
# ... existing config

# ============================================
# Memory Health Check Configuration
# ============================================
# Controls when memory health checks trigger degraded/unhealthy states
# These values represent heap usage percentage (heapUsed / heapTotal * 100)

# Development environment (more lenient):
# - UNHEALTHY: >= 95% (allows for higher memory pressure during dev)
# - DEGRADED: >= 90% (warning starts at 90%)
# - HEALTHY: < 90%

# Production environment (stricter):
# - UNHEALTHY: >= 90% (early warning for production issues)
# - DEGRADED: >= 80% (allows for proactive scaling)
# - HEALTHY: < 80%

# Percentage at which memory health becomes UNHEALTHY
# Development: 95, Production: 90
MEMORY_HEALTH_THRESHOLD_UNHEALTHY=95

# Percentage at which memory health becomes DEGRADED
# Development: 90, Production: 80
MEMORY_HEALTH_THRESHOLD_DEGRADED=90
```

---

## 8. Expected Outcomes

### Before Fix (Current State)

```
[10:27:03] WARN System health degraded: { overall: 'unhealthy', unhealthyServices: [{ name: 'memory', state: 'unhealthy', error: undefined }] }
[10:28:03] WARN System health degraded: { overall: 'unhealthy', unhealthyServices: [{ name: 'memory', state: 'unhealthy', error: undefined }] }
[10:29:03] WARN System health degraded: { overall: 'unhealthy', unhealthyServices: [{ name: 'memory', state: 'unhealthy', error: undefined }] }
... (41 identical entries)
```

**PROBLEMS**:

- 41 identical log entries
- No actual memory values
- No indication of when problem started
- No indication of severity

### After Fix (P0 + P1)

**Scenario: Memory leak developing**

```
[10:26:03] LOG HealthCheckService initialized with 60s monitoring interval
[10:26:03] DEBUG Default system health checks registered
[10:27:03] DEBUG Performing scheduled health check...
[10:28:03] DEBUG Performing scheduled health check...
[10:29:03] DEBUG Performing scheduled health check...
[10:30:00] LOG Service 'memory' state changed: healthy -> degraded { metadata: { usagePercent: 91.2, heapUsedMB: 467, heapTotalMB: 512, thresholds: { unhealthy: 95, degraded: 90 } } }
[10:30:00] WARN System health degraded: { overall: 'degraded', previousState: 'healthy', unhealthyServices: [{ name: 'memory', state: 'degraded', metadata: { usagePercent: 91.2, heapUsedMB: 467, heapTotalMB: 512 } }] }
[10:31:03] DEBUG Performing scheduled health check...  (no warning - state unchanged)
[10:32:03] DEBUG Performing scheduled health check...  (no warning - state unchanged)
[10:33:15] LOG Service 'memory' state changed: degraded -> unhealthy { metadata: { usagePercent: 96.8, heapUsedMB: 496, heapTotalMB: 512, thresholds: { unhealthy: 95, degraded: 90 } } }
[10:33:15] WARN System health degraded: { overall: 'unhealthy', previousState: 'degraded', unhealthyServices: [{ name: 'memory', state: 'unhealthy', metadata: { usagePercent: 96.8, heapUsedMB: 496, heapTotalMB: 512 } }] }
[10:34:03] DEBUG Performing scheduled health check...  (no warning - state unchanged)
[10:35:00] LOG Service 'memory' state changed: unhealthy -> degraded { metadata: { usagePercent: 93.0, heapUsedMB: 476, heapTotalMB: 512 } }
[10:36:22] LOG Service 'memory' state changed: degraded -> healthy { metadata: { usagePercent: 88.5, heapUsedMB: 453, heapTotalMB: 512 } }
[10:36:22] LOG System health restored: { overall: 'healthy', previousState: 'degraded' }
```

**IMPROVEMENTS**:

- ✅ Only 6 meaningful log entries (vs. 41 repetitive)
- ✅ Clear indication of state transitions
- ✅ Actual memory values visible (91.2%, 96.8%, etc.)
- ✅ Threshold configuration visible (unhealthy: 95, degraded: 90)
- ✅ Timeline of problem development visible
- ✅ Clear resolution indication

**LOG REDUCTION**: 85% fewer logs (6 vs. 41)

---

## 9. Additional Recommendations

### A. Add Heap Snapshot Capture on Critical Memory

**USE CASE**: Automatic memory profiling when memory becomes critical

```typescript
// health-check.service.ts

import { writeHeapSnapshot } from 'v8';
import { join } from 'path';

private async captureHeapSnapshot(reason: string): Promise<string | null> {
  try {
    const filename = `heap-${Date.now()}-${reason}.heapsnapshot`;
    const filepath = join(process.cwd(), 'logs', filename);

    writeHeapSnapshot(filepath);
    this.logger.warn(`Heap snapshot captured: ${filepath}`);

    return filepath;
  } catch (error) {
    this.logger.error('Failed to capture heap snapshot:', error);
    return null;
  }
}

private registerDefaultChecks(): void {
  this.register('memory', async () => {
    // ... existing memory check logic

    const result = {
      healthy: isHealthy && !isDegraded && !isUnhealthy,
      degraded: !isHealthy && isDegraded && !isUnhealthy,
      unhealthy: !isHealthy && !isDegraded && isUnhealthy,
      usagePercent,
      heapUsedMB,
      heapTotalMB,
      rssUsedMB,
      thresholds: {
        unhealthy: unhealthyThreshold,
        degraded: degradedThreshold,
      },
    };

    // ✅ ADD: Auto-capture heap snapshot when crossing unhealthy threshold
    if (isUnhealthy && !this.previousServiceStates.get('memory')?.includes('unhealthy')) {
      // State just changed to unhealthy - capture snapshot
      await this.captureHeapSnapshot('unhealthy');
    }

    return result;
  });
}
```

**BENEFIT**: Automatic memory leak diagnosis without manual intervention

### B. Add Memory Trend Analysis

**USE CASE**: Predict memory issues before they become critical

```typescript
// health-check.service.ts

private memoryHistory: Array<{ timestamp: number; usagePercent: number }> = [];
private readonly memoryHistoryLimit = 60; // Last 60 checks (~1 hour)

private analyzeMemoryTrend(): { trend: 'increasing' | 'decreasing' | 'stable'; rate: number } {
  if (this.memoryHistory.length < 10) {
    return { trend: 'stable', rate: 0 };
  }

  // Simple linear regression on last 30 data points
  const recent = this.memoryHistory.slice(-30);
  const n = recent.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  recent.forEach((point, i) => {
    sumX += i;
    sumY += point.usagePercent;
    sumXY += i * point.usagePercent;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  let trend: 'increasing' | 'decreasing' | 'stable';
  if (slope > 0.1) {
    trend = 'increasing';
  } else if (slope < -0.1) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  return { trend, rate: Math.abs(slope) };
}

private registerDefaultChecks(): void {
  this.register('memory', async () => {
    // ... existing check logic

    // ✅ ADD: Track memory history
    this.memoryHistory.push({
      timestamp: Date.now(),
      usagePercent,
    });

    if (this.memoryHistory.length > this.memoryHistoryLimit) {
      this.memoryHistory.shift();
    }

    // ✅ ADD: Analyze trend
    const trend = this.analyzeMemoryTrend();

    // ✅ ADD: Warn if rapidly increasing
    if (trend.trend === 'increasing' && trend.rate > 0.5) {
      this.logger.warn('Memory usage increasing rapidly:', {
        currentUsage: usagePercent,
        increaseRate: trend.rate + '% per minute',
        projectedUnhealthy: 'in ' + Math.round((unhealthyThreshold - usagePercent) / trend.rate) + ' minutes',
      });
    }

    return {
      // ... existing result fields
      trend: {
        direction: trend.trend,
        rate: Math.round(trend.rate * 100) / 100,
      },
    };
  });
}
```

**BENEFIT**: Proactive alerting before memory becomes critical

---

## 10. Summary

### Key Findings

1. **Root Cause of Excessive Logging**: `performScheduledHealthCheck()` logs every 60 seconds regardless of state change
2. **Root Cause of Missing Data**: Logs don't include `service.metadata` (which contains actual memory values)
3. **Threshold Issue**: Cannot determine if 90% threshold is appropriate without actual memory data
4. **Impact**: 41 identical log entries in 41 minutes, no diagnostic information

### Recommended Actions

| Priority | Action                              | Effort | Impact                            |
| -------- | ----------------------------------- | ------ | --------------------------------- |
| **P0**   | Implement state-change-only logging | 30 min | Reduces log noise 85-97%          |
| **P1**   | Add environment-specific thresholds | 1 hour | Fixes false alarms in development |
| **P2**   | Add memory profiling endpoint       | 1 hour | Enables real-time diagnosis       |
| **P3**   | Add log rate limiting fallback      | 30 min | Additional safety net             |

### Expected Outcomes

- **Log Reduction**: 85-97% fewer log entries (2-6 vs. 41)
- **Diagnostic Capability**: Actual memory values visible in logs
- **Environment Flexibility**: Appropriate thresholds for dev (95%) vs. prod (90%)
- **Clarity**: Clear indication of when problems start, worsen, and resolve

### Next Steps

1. Implement P0 fix (state-change-only logging)
2. Test with current workload - observe actual memory values
3. Determine if P1 fix (threshold adjustment) is needed based on data
4. Implement P2 (profiling endpoint) if memory leaks suspected

---

**Report Complete**
**Confidence Level**: HIGH (based on source code analysis)
**Recommendation**: Implement P0 immediately, P1 based on observed data
