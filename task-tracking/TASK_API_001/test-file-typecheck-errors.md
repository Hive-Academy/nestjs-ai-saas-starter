# Test File TypeScript Errors - TASK_API_001

## Summary

These are TypeScript errors in **test files** (.spec.ts extension) that need to be fixed systematically with proper test patterns and type safety.

## Critical Test File Errors to Fix

### Checkpoint Module Tests

**libs/langgraph-modules/checkpoint/src/lib/tests/checkpoint.independence.spec.ts**

- Line 2: Unused import `ConfigService` is declared but never read
- Lines 112, 113: Unused variables `threadId`, `checkpointNs` declared but never read
- Lines 179, 180: Unused variables `threadId`, `checkpointNs` declared but never read
- Line 200: Property 'providers' does not exist in type 'CheckpointModuleOptions'

### Monitoring Module Test Files

**libs/langgraph-modules/monitoring/src/lib/architecture-migration.benchmark.spec.ts**

- Line 1: Unused import `TestingModule` is declared but never read
- Lines 36, 82, 150, 215, 336, 379: Property 'providers' does not exist in type 'CheckpointModuleOptions'
- Lines 40, 90, 154, 229: Property 'enabled' does not exist in type 'StreamingModuleOptions'
- Lines 44, 98, 158, 241, 340: Property 'enabled' does not exist in type 'HitlModuleOptions'

**libs/langgraph-modules/monitoring/src/lib/architecture-validation.spec.ts**

- Line 31: Unused variable `coreConfig` declared but never read
- Line 39: Type `{enabled: boolean; bufferSize: number;}` has no properties in common with type 'StreamingModuleOptions'
- Lines 55, 56: Properties 'enabled' do not exist in respective module option types

**libs/langgraph-modules/monitoring/src/lib/core/monitoring-facade.service.spec.ts**

- Line 1: Unused import `TestingModule` is declared but never read

**libs/langgraph-modules/monitoring/src/lib/services/alerting.service.spec.ts**

- Lines 155, 197, 244: Argument of type 'string' is not assignable to parameter of type 'AlertRule'
- Lines 475, 476, 483: Expected 0-1 arguments, but got 2
- Line 513: Expected 0 arguments, but got 2
- Lines 518-520: Properties 'totalAlerts', 'averageAlertsPerHour', 'peakAlertPeriod' do not exist on alerting stats type
- Line 527: Unused variable 'rules' declared but never read
- Lines 551, 584: Properties 'ruleEvaluationTime', 'alertsProcessed' do not exist on stats type
- Line 613: Argument of type 'Date' is not assignable to parameter of type 'number'
- Line 640: Argument of type '"prometheus"' is not assignable to parameter of type '"json" | "csv" | undefined'
- Line 659: Expected 1 arguments, but got 2

**libs/langgraph-modules/monitoring/src/lib/services/dashboard.service.spec.ts**

- Line 5: 'DashboardData' is declared but never used

## Required Advanced Test Patterns

### 1. Proper Test Module Configuration

```typescript
// Fix module option type mismatches
const testModuleOptions: CheckpointModuleOptions = {
  // Remove 'providers' property - not part of CheckpointModuleOptions
  redisUrl: 'redis://localhost:6379',
  namespace: 'test',
};

const streamingOptions: StreamingModuleOptions = {
  // Remove 'enabled' property - use proper StreamingModuleOptions interface
  bufferSize: 1000,
  mode: 'values',
};
```

### 2. Advanced Test Type Guards

```typescript
// Proper alerting service test types
interface TestAlertRule extends AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Type-safe alert rule creation
const createTestAlertRule = (name: string): TestAlertRule => ({
  id: `test-${name}`,
  name,
  condition: 'cpu > 80',
  severity: 'medium',
});
```

### 3. Mock Service Pattern

```typescript
// Proper mock service configuration
const mockAlertingService = {
  createRule: jest.fn().mockImplementation((rule: AlertRule) => Promise.resolve(rule)),
  deleteRule: jest.fn().mockImplementation((ruleId: string) => Promise.resolve()),
  getStats: jest.fn().mockReturnValue({
    totalRules: 5,
    activeRules: 3,
    evaluationCount: 100,
    alertCount: 10,
    activeAlerts: 2,
    notificationProviders: 2,
  }),
};
```

### 4. Generic Test Utilities

```typescript
// Advanced test helper with proper typing
interface TestServiceConfig<T> {
  service: new (...args: any[]) => T;
  providers: Provider[];
  options?: Record<string, unknown>;
}

async function createTestModule<T>(config: TestServiceConfig<T>): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [config.service, ...config.providers],
  }).compile();
}
```

### 5. Parameter Type Validation

```typescript
// Fix argument count and type issues
interface AlertingServiceMethods {
  exportMetrics(format?: 'json' | 'csv'): Promise<string>;
  getHistoricalData(startTime: number, endTime?: number): Promise<HistoricalData>;
  processAlert(rule: AlertRule): Promise<void>;
}

// Type-safe method testing
const testAlertingMethods = (service: AlertingServiceMethods) => {
  // Correct parameter types and counts
  service.exportMetrics('json');
  service.getHistoricalData(Date.now() - 3600000, Date.now());
  service.processAlert(createTestAlertRule('test-rule'));
};
```

## Success Criteria

1. **Zero TypeScript errors** in all test files
2. **Proper module option types** with correct interfaces
3. **Type-safe mock implementations** for all services
4. **Correct parameter types and counts** for all method calls
5. **Advanced test patterns** with generic utilities
6. **No unused imports/variables** - clean test code
7. **Proper AlertRule typing** instead of string parameters

## Files to Focus On (Priority Order)

1. **Monitoring Tests**: Fix module option type mismatches and AlertRule typing
2. **Checkpoint Tests**: Fix unused variables and module configuration
3. **Service Tests**: Fix method signatures and return type expectations
4. **Architecture Tests**: Fix streaming and HITL module option types
5. **Dashboard Tests**: Remove unused imports and fix data types

## Advanced Test TypeScript Features to Apply

- Generic test module factory functions
- Discriminated unions for test data types
- Advanced mock typing with proper return types
- Template literal types for test identifiers
- Conditional types for service method parameters
- Proper interface segregation for test configurations

## Test-Specific Patterns

- **Module Testing**: Proper NestJS testing module configuration
- **Service Testing**: Type-safe mock implementations with Jest
- **Integration Testing**: Real service instances with proper typing
- **Benchmark Testing**: Performance test types with metrics interfaces
- **Validation Testing**: Type guards and runtime validation patterns
