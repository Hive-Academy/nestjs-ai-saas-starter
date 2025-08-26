# 🧪 Test Execution Guide - TASK_INT_011

## Test Files Created

1. **`standalone-memory-unit.test.ts`** - Core functionality validation
2. **`integration-direct-db.test.ts`** - Database integration tests
3. **`performance-benchmark.test.ts`** - Performance and bundle size tests  
4. **`architecture-validation.test.ts`** - Architectural pattern validation
5. **`edge-case-testing.test.ts`** - Comprehensive edge case scenarios

## Prerequisites

### Environment Setup
```bash
# Ensure test databases are running
npm run dev:services

# Or start individually:
docker run -d -p 8000:8000 chromadb/chroma:latest
docker run -d -p 7687:7687 -p 7474:7474 neo4j:latest
```

### Environment Variables
```bash
export CHROMADB_HOST=localhost
export CHROMADB_PORT=8000  
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=password
```

## Running Tests

### Individual Test Suites
```bash
# Unit tests (fastest)
npx jest standalone-memory-unit.test.ts

# Integration tests (requires databases)
npx jest integration-direct-db.test.ts

# Performance benchmarks
npx jest performance-benchmark.test.ts

# Architecture validation
npx jest architecture-validation.test.ts

# Edge case testing (most comprehensive)
npx jest edge-case-testing.test.ts
```

### All Tests
```bash
# Run all validation tests
npx jest task-tracking/TASK_INT_011/

# With coverage
npx jest task-tracking/TASK_INT_011/ --coverage

# Watch mode for development
npx jest task-tracking/TASK_INT_011/ --watch
```

## Expected Results

### Success Indicators
- ✅ All 70 test suites pass
- ✅ Performance benchmarks meet targets
- ✅ Edge cases handled gracefully
- ✅ No memory leaks detected
- ✅ Database connections stable

### Performance Benchmarks
- Bundle size reduction: 85-90%
- Startup time improvement: 75%+
- Operation latency: <100ms average
- Memory growth: <20MB per 100 operations

## Troubleshooting

### Common Issues

**1. Database Connection Failures**
```bash
# Check if services are running
docker ps | grep -E "(chroma|neo4j)"

# Restart services
npm run dev:stop
npm run dev:services
```

**2. Test Timeouts**
```bash
# Increase timeout for large dataset tests
npx jest --testTimeout=30000
```

**3. Memory Issues**
```bash
# Run with increased memory
node --max-old-space-size=4096 ./node_modules/.bin/jest
```

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js additions
module.exports = {
  testTimeout: 15000, // 15 second timeout
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  testMatch: ['**/task-tracking/TASK_INT_011/**/*.test.ts'],
  collectCoverageFrom: [
    'libs/nestjs-memory/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts'
  ]
};
```

### Test Setup
```typescript
// test-setup.js
beforeAll(async () => {
  // Ensure clean database state
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup test data
  console.log('Test cleanup complete');
});
```

## Interpreting Results

### Success Criteria
- **Functional Parity:** All memory operations work identically
- **Performance Gains:** Measurable improvements in speed/size
- **Architecture Validation:** Clean orchestration patterns work
- **Edge Case Resilience:** No crashes or data corruption
- **Production Readiness:** All requirements validated

### Failure Investigation
If any tests fail:
1. Check database connections
2. Verify environment variables
3. Review error logs for specific failures
4. Ensure latest code changes are compiled
5. Check for port conflicts

## Continuous Integration

### GitHub Actions
```yaml
# .github/workflows/memory-validation.yml
name: Memory Module Validation
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      chroma:
        image: chromadb/chroma:latest
        ports: [8000:8000]
      neo4j:
        image: neo4j:latest
        ports: [7687:7687, 7474:7474]
        env:
          NEO4J_AUTH: neo4j/password
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx jest task-tracking/TASK_INT_011/
```

---

**Note:** These tests validate the user's architectural vision for extracting the memory module from nestjs-langgraph. All tests should pass, confirming the standalone approach is superior.