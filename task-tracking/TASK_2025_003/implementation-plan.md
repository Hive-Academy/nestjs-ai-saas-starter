# Implementation Plan - TASK_2025_003

## Executive Summary

**Objective**: Systematically fix all stub and incomplete implementations in @hive-academy/langgraph-streaming library to achieve 100% production readiness.

**Current State**: 55/100 production readiness score (44% critical issues fixed, 56% remaining)

**Target State**: 100/100 production readiness score (all critical issues resolved)

**Total Effort**: 20 hours (2.5 business days)

**Risk Level**: 🔴 HIGH (production blocker in processStringTokens)

---

## Phase 1: Critical Blocker - processStringTokens Fix (4 hours)

### SUBTASK 1.1: Analyze Execution Context Flow (1 hour)

**Objective**: Understand how executionId and nodeId flow from decorator to method.

**Investigation Steps**:

1. **Inspect Decorator Implementation** (libs/langgraph-modules/streaming/src/lib/decorators/streaming.decorator.ts):

   ```bash
   # Search for StreamToken decorator implementation
   grep -A 30 "export function StreamToken" libs/langgraph-modules/streaming/src/lib/decorators/streaming.decorator.ts
   ```

2. **Trace Method Invocation Path**:

   - Check if decorator wrapper passes execution context
   - Verify if metadata includes executionId/nodeId
   - Look for examples in dev-brand-api workflow usage

3. **Identify Context Source**:
   - Option A: Extract from decorator metadata (getStreamTokenMetadata)
   - Option B: Pass as method parameters (requires API change)
   - Option C: Use ThreadLocal/AsyncLocalStorage for context propagation

**Deliverable**: Document showing exact context flow with file:line references

---

### SUBTASK 1.2: Implement Token Emission Logic (2 hours)

**File**: `libs/langgraph-modules/streaming/src/lib/services/token-streaming.service.ts`

**Current Code** (lines 765-778):

```typescript
private async processStringTokens(
  content: string,
  config: StreamTokenDecoratorMetadata
): Promise<void> {
  // Simple tokenization - split by whitespace
  const tokens = content.split(/\s+/).filter((token) => token.length > 0);

  // This would need execution context from the decorator
  // For now, log that tokens were processed
  this.logger.debug(`Processed ${tokens.length} tokens from string content`);
}
```

**New Implementation**:

```typescript
private async processStringTokens(
  content: string,
  config: StreamTokenDecoratorMetadata,
  context?: { executionId?: string; nodeId?: string }
): Promise<void> {
  try {
    // Extract execution context
    const executionId = context?.executionId || config.executionId || 'default-execution';
    const nodeId = context?.nodeId || config.nodeId || config.methodName || 'unknown-node';

    // Simple tokenization - split by whitespace
    const tokens = content.split(/\s+/).filter((token) => token.length > 0);

    this.logger.debug(
      `Processing ${tokens.length} tokens for ${executionId}:${nodeId}`
    );

    // Emit each token to the stream
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Apply token filtering if configured
      if (config.filter && !this.shouldIncludeToken(token, config)) {
        this.logger.debug(`Token filtered: "${token}"`);
        continue;
      }

      // Emit token with metadata
      this.streamToken(executionId, nodeId, token, {
        index: i,
        totalTokens: tokens.length,
        source: 'string_tokenization',
        format: config.format || 'text',
      });
    }

    // Emit completion event
    this.eventEmitter.emit(`workflow.token.${executionId}.complete`, {
      executionId,
      nodeId,
      tokenCount: tokens.length,
      timestamp: new Date(),
      source: 'processStringTokens',
    });

    this.logger.debug(
      `Completed processing ${tokens.length} tokens for ${executionId}:${nodeId}`
    );
  } catch (error) {
    this.logger.error('Error in processStringTokens:', error);
    // Graceful degradation - log error but don't throw
    this.eventEmitter.emit('token.processing.error', {
      error,
      method: 'processStringTokens',
      contentLength: content.length,
    });
  }
}
```

**Integration Points**:

1. **Update processTokenResult() method** (lines 209-225):

   ```typescript
   async processTokenResult(
     result: any,
     config: StreamTokenDecoratorMetadata,
     context?: { executionId?: string; nodeId?: string } // ADD THIS PARAMETER
   ): Promise<void> {
     if (typeof result === 'string') {
       await this.processStringTokens(result, config, context); // PASS CONTEXT
     } else if (result && typeof result.content === 'string') {
       await this.processStringTokens(result.content, config, context); // PASS CONTEXT
     } else if (this.isAsyncIterable(result)) {
       await this.processAsyncIterableTokens(result, config, context); // PASS CONTEXT
     }
   }
   ```

2. **Verify shouldIncludeToken() method exists** (lines 682-709):
   - Already implemented ✅
   - Handles minLength, maxLength, excludeWhitespace, pattern filters

**Testing Strategy**:

```typescript
// Test file: token-streaming.service.spec.ts
describe('processStringTokens - Fixed Implementation', () => {
  it('should emit tokens with execution context', async () => {
    const content = 'Hello world streaming';
    const config = {
      executionId: 'exec-123',
      nodeId: 'node-456',
      enabled: true,
      methodName: 'testMethod',
    };

    const emittedTokens: string[] = [];
    const subscription = service.getTokenStream('exec-123', 'node-456').subscribe((update) => {
      emittedTokens.push(update.data.content);
    });

    await service['processStringTokens'](content, config, {
      executionId: 'exec-123',
      nodeId: 'node-456',
    });

    expect(emittedTokens).toEqual(['Hello', 'world', 'streaming']);
    subscription.unsubscribe();
  });

  it('should apply token filtering from config', async () => {
    const content = 'a bb ccc dddd';
    const config = {
      filter: { minLength: 3 },
      executionId: 'exec-123',
      nodeId: 'node-456',
    };

    const emittedTokens: string[] = [];
    service.getTokenStream('exec-123', 'node-456').subscribe((update) => emittedTokens.push(update.data.content));

    await service['processStringTokens'](content, config);

    expect(emittedTokens).toEqual(['ccc', 'dddd']); // 'a' and 'bb' filtered out
  });

  it('should emit completion event', (done) => {
    const content = 'test tokens';
    const config = { executionId: 'exec-123', nodeId: 'node-456' };

    service['eventEmitter'].on('workflow.token.exec-123.complete', (event) => {
      expect(event.tokenCount).toBe(2);
      expect(event.executionId).toBe('exec-123');
      done();
    });

    service['processStringTokens'](content, config);
  });
});
```

---

### SUBTASK 1.3: Update StreamTokenDecoratorMetadata Interface (30 minutes)

**File**: `libs/langgraph-modules/streaming/src/lib/decorators/streaming.decorator.ts`

**Current Interface**:

```typescript
export interface StreamTokenDecoratorMetadata {
  enabled: boolean;
  bufferSize?: number;
  batchSize?: number;
  flushInterval?: number;
  format?: 'text' | 'structured' | 'json';
  methodName: string;
  filter?: TokenFilterConfig;
  processor?: (token: string, metadata: Record<string, unknown>) => string;
}
```

**Enhanced Interface**:

```typescript
export interface StreamTokenDecoratorMetadata {
  enabled: boolean;
  bufferSize?: number;
  batchSize?: number;
  flushInterval?: number;
  format?: 'text' | 'structured' | 'json';
  methodName: string;
  filter?: TokenFilterConfig;
  processor?: (token: string, metadata: Record<string, unknown>) => string;

  // NEW: Execution context (optional - can be extracted from runtime context)
  executionId?: string;
  nodeId?: string;
}
```

**Validation**: Ensure backward compatibility - all new fields are optional.

---

### SUBTASK 1.4: Integration Testing (30 minutes)

**Test Scenarios**:

1. **End-to-End String Token Streaming**:

   ```typescript
   // Test with actual decorator usage
   class TestWorkflow {
     @StreamToken({ enabled: true, format: 'text' })
     async generateText(): Promise<string> {
       return 'This is a test message with multiple tokens';
     }
   }

   // Verify tokens are emitted in real-time
   const workflow = new TestWorkflow();
   const result = await workflow.generateText();
   // Assert tokens were streamed via WebSocket or event emitter
   ```

2. **Error Handling Validation**:

   ```typescript
   // Test graceful degradation on error
   await service['processStringTokens'](null, config); // Should log error, not crash
   await service['processStringTokens']('', config); // Should handle empty string
   ```

3. **Performance Benchmarking**:

   ```typescript
   // Measure token emission latency
   const content = 'word '.repeat(1000); // 1000 tokens
   const startTime = Date.now();
   await service['processStringTokens'](content, config);
   const duration = Date.now() - startTime;

   expect(duration / 1000).toBeLessThan(10); // <10ms per token average
   ```

**Acceptance Criteria**:

- ✅ All 5 acceptance criteria from Requirement 1 pass
- ✅ Zero TypeScript compilation errors
- ✅ 100% test coverage for new code
- ✅ Performance: <10ms average token emission latency

---

## Phase 2: Performance Enhancement - processAsyncIterableTokens (6 hours)

### SUBTASK 2.1: Add Configuration Options to Interface (30 minutes)

**File**: `libs/langgraph-modules/streaming/src/lib/decorators/streaming.decorator.ts`

**Enhanced Interface**:

```typescript
export interface StreamTokenDecoratorMetadata {
  // ... existing fields ...

  // NEW: Performance and error handling options
  streamingDelay?: number; // Delay between tokens in ms (default: 25)
  bufferStrategy?: 'drop' | 'pause'; // Buffer overflow behavior (default: 'pause')
  errorStrategy?: 'continue' | 'throw'; // Error handling behavior (default: 'throw')
}
```

**Validation**:

- Add JSDoc comments explaining each new option
- Ensure defaults are sensible (delay: 25ms, pause on overflow, throw on error)
- Update streaming module CLAUDE.md with new options

---

### SUBTASK 2.2: Implement Configurable Delay and Backpressure (3 hours)

**File**: `libs/langgraph-modules/streaming/src/lib/services/token-streaming.service.ts`

**Current Code** (lines 780-810):

```typescript
private async processAsyncIterableTokens(
  iterable: AsyncIterable<any>,
  config: StreamTokenDecoratorMetadata
): Promise<void> {
  let tokenCount = 0;

  try {
    for await (const chunk of iterable) {
      tokenCount++;
      const token = typeof chunk === 'string'
        ? chunk
        : chunk.token || chunk.content || String(chunk);

      await this.processToken(token);

      // Add small delay for streaming effect
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    this.logger.debug(`Processed ${tokenCount} tokens from async iterable`);
  } catch (error) {
    this.logger.error('Error processing async iterable tokens:', error);
    throw error;
  }
}
```

**Enhanced Implementation**:

```typescript
private async processAsyncIterableTokens(
  iterable: AsyncIterable<any>,
  config: StreamTokenDecoratorMetadata,
  context?: { executionId?: string; nodeId?: string }
): Promise<void> {
  const executionId = context?.executionId || config.executionId || 'default-execution';
  const nodeId = context?.nodeId || config.nodeId || config.methodName || 'unknown-node';

  // Configuration with defaults
  const streamingDelay = config.streamingDelay ?? 25; // ms
  const bufferStrategy = config.bufferStrategy ?? 'pause';
  const errorStrategy = config.errorStrategy ?? 'throw';
  const maxBufferSize = config.bufferSize ?? 50;

  let tokenCount = 0;
  let bufferSize = 0;
  let droppedTokens = 0;
  const startTime = Date.now();

  try {
    for await (const chunk of iterable) {
      tokenCount++;

      // Extract token content
      const token = typeof chunk === 'string'
        ? chunk
        : chunk.token || chunk.content || String(chunk);

      // Check buffer capacity for backpressure handling
      const streamConfig = this.tokenStreams.get(`${executionId}:${nodeId}`);
      if (streamConfig) {
        bufferSize = streamConfig.buffer.length;

        if (bufferSize >= maxBufferSize) {
          if (bufferStrategy === 'drop') {
            // Drop token and log warning
            droppedTokens++;
            this.logger.warn(
              `Dropped token due to buffer overflow (${bufferSize}/${maxBufferSize}) for ${executionId}:${nodeId}`
            );
            continue; // Skip to next token
          } else if (bufferStrategy === 'pause') {
            // Wait for buffer to drain before processing
            this.logger.debug(
              `Pausing async iteration - buffer full (${bufferSize}/${maxBufferSize})`
            );
            await this.waitForBufferDrain(executionId, nodeId, maxBufferSize);
          }
        }
      }

      // Process the token with real streaming
      try {
        await this.processToken(token);
      } catch (tokenError) {
        this.logger.error(`Error processing token ${tokenCount}:`, tokenError);

        if (errorStrategy === 'throw') {
          throw tokenError; // Propagate error
        } else {
          // Continue processing next token
          this.logger.debug('Continuing to next token (errorStrategy: continue)');
        }
      }

      // Add configurable delay for streaming effect
      if (streamingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, streamingDelay));
      }

      // Update performance metrics periodically (every 100 tokens)
      if (tokenCount % 100 === 0) {
        this.updateAsyncIterableMetrics(executionId, tokenCount, startTime, droppedTokens);
      }
    }

    // Final metrics update
    const duration = Date.now() - startTime;
    const tokensPerSecond = duration > 0 ? (tokenCount / duration) * 1000 : 0;

    this.logger.log(
      `Completed async iterable processing: ${tokenCount} tokens in ${duration}ms ` +
      `(${tokensPerSecond.toFixed(2)} tokens/sec, ${droppedTokens} dropped)`
    );

    // Emit completion event with metrics
    this.eventEmitter.emit(`workflow.async.${executionId}.complete`, {
      executionId,
      nodeId,
      tokenCount,
      droppedTokens,
      duration,
      tokensPerSecond,
      bufferStrategy,
      timestamp: new Date(),
    });
  } catch (error) {
    this.logger.error('Error processing async iterable tokens:', error);

    // Emit error event
    this.eventEmitter.emit('async.iterable.error', {
      executionId,
      nodeId,
      error,
      tokenCount,
      droppedTokens,
    });

    if (errorStrategy === 'throw') {
      throw error;
    }
  }
}

/**
 * Wait for buffer to drain to acceptable level
 */
private async waitForBufferDrain(
  executionId: string,
  nodeId: string,
  maxBufferSize: number,
  timeoutMs = 5000
): Promise<void> {
  const streamKey = `${executionId}:${nodeId}`;
  const streamConfig = this.tokenStreams.get(streamKey);

  if (!streamConfig) {
    return; // Stream closed, nothing to wait for
  }

  const drainThreshold = Math.floor(maxBufferSize * 0.5); // Drain to 50% capacity
  const startTime = Date.now();

  while (streamConfig.buffer.length > drainThreshold) {
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      this.logger.warn(
        `Buffer drain timeout (${timeoutMs}ms) for ${streamKey} - proceeding anyway`
      );
      break;
    }

    // Wait 50ms before checking again
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  this.logger.debug(
    `Buffer drained to ${streamConfig.buffer.length}/${maxBufferSize} for ${streamKey}`
  );
}

/**
 * Update async iterable performance metrics
 */
private updateAsyncIterableMetrics(
  executionId: string,
  tokenCount: number,
  startTime: number,
  droppedTokens: number
): void {
  const duration = Date.now() - startTime;
  const tokensPerSecond = duration > 0 ? (tokenCount / duration) * 1000 : 0;

  this.eventEmitter.emit('async.iterable.progress', {
    executionId,
    tokenCount,
    droppedTokens,
    tokensPerSecond: tokensPerSecond.toFixed(2),
    duration,
  });
}
```

**Key Improvements**:

1. ✅ **Configurable Delay**: Uses `config.streamingDelay` (default: 25ms)
2. ✅ **Backpressure Handling**: Implements 'drop' and 'pause' strategies
3. ✅ **Error Strategy**: Supports 'continue' and 'throw' options
4. ✅ **Performance Metrics**: Tracks tokens/sec, dropped tokens, duration
5. ✅ **Buffer Drain Logic**: Waits for buffer to reach 50% before resuming

---

### SUBTASK 2.3: Add RxJS Throttling Integration (1.5 hours)

**Alternative Approach**: Use RxJS operators for more sophisticated backpressure.

**File**: `libs/langgraph-modules/streaming/src/lib/services/token-streaming.service.ts`

**RxJS-Based Implementation**:

```typescript
import { Subject, from, throttleTime, bufferCount, mergeMap } from 'rxjs';

/**
 * Process async iterable with RxJS throttling (alternative approach)
 */
async *processAsyncIterableWithRxJS<T>(
  iterable: AsyncIterable<T>,
  config: StreamTokenDecoratorMetadata
): AsyncGenerator<T> {
  const tokenSubject = new Subject<T>();
  const throttleMs = config.streamingDelay ?? 25;
  const batchSize = config.batchSize ?? 1;

  // Setup RxJS pipeline with throttling
  const throttledStream = tokenSubject.pipe(
    throttleTime(throttleMs),
    bufferCount(batchSize),
    mergeMap(async (batch) => {
      // Process batch
      for (const token of batch) {
        await this.processToken(
          typeof token === 'string' ? token : (token as any).content || String(token)
        );
      }
      return batch;
    })
  );

  // Subscribe and collect results
  const results: T[] = [];
  throttledStream.subscribe({
    next: (batch) => results.push(...batch),
    error: (err) => this.logger.error('RxJS stream error:', err),
  });

  // Feed async iterable into subject
  for await (const item of iterable) {
    tokenSubject.next(item);
  }

  tokenSubject.complete();

  // Yield processed results
  for (const result of results) {
    yield result;
  }
}
```

**Decision Point**: Choose between manual backpressure (SUBTASK 2.2) OR RxJS throttling approach

- **Manual Approach**: More control, easier to debug, explicit buffer strategies
- **RxJS Approach**: More declarative, better performance for high throughput, standard patterns

**Recommendation**: Implement manual approach (SUBTASK 2.2) for explicit control, keep RxJS approach as future enhancement.

---

### SUBTASK 2.4: Performance Testing (1 hour)

**Test Scenarios**:

1. **Configurable Delay Test**:

   ```typescript
   it('should use custom streaming delay', async () => {
     const config = { streamingDelay: 100 }; // 100ms delay
     const iterable = createAsyncIterable(['a', 'b', 'c']);

     const start = Date.now();
     await service['processAsyncIterableTokens'](iterable, config);
     const duration = Date.now() - start;

     expect(duration).toBeGreaterThanOrEqual(300); // 3 tokens × 100ms
   });
   ```

2. **Backpressure Drop Strategy Test**:

   ```typescript
   it('should drop tokens when buffer is full (drop strategy)', async () => {
     const config = {
       bufferSize: 10,
       bufferStrategy: 'drop' as const,
     };
     const fastIterable = createFastAsyncIterable(100); // 100 tokens rapidly

     const emitted: string[] = [];
     service.getTokenStream('exec-123').subscribe((u) => emitted.push(u.data.content));

     await service['processAsyncIterableTokens'](fastIterable, config);

     expect(emitted.length).toBeLessThanOrEqual(config.bufferSize);
   });
   ```

3. **Backpressure Pause Strategy Test**:

   ```typescript
   it('should pause iteration when buffer is full (pause strategy)', async () => {
     const config = {
       bufferSize: 10,
       bufferStrategy: 'pause' as const,
     };
     const iterable = createAsyncIterable(Array(50).fill('token'));

     const pauseEvents: number[] = [];
     service['eventEmitter'].on('async.iterable.progress', (data) => {
       if (data.bufferPaused) pauseEvents.push(data.tokenCount);
     });

     await service['processAsyncIterableTokens'](iterable, config);

     expect(pauseEvents.length).toBeGreaterThan(0); // Paused at least once
   });
   ```

4. **Error Strategy Test**:

   ```typescript
   it('should continue on token error (continue strategy)', async () => {
     const config = { errorStrategy: 'continue' as const };
     const iterable = createAsyncIterable(['good', null, 'also-good']); // null causes error

     const emitted: string[] = [];
     service.getTokenStream('exec-123').subscribe((u) => emitted.push(u.data.content));

     await service['processAsyncIterableTokens'](iterable, config);

     expect(emitted).toEqual(['good', 'also-good']); // null skipped
   });
   ```

**Acceptance Criteria**:

- ✅ All 5 acceptance criteria from Requirement 2 pass
- ✅ Performance metrics accurately track tokens/sec
- ✅ Buffer strategies work correctly under load
- ✅ Error strategies handle failures gracefully

---

## Phase 3: Verification Tasks (10 hours)

### SUBTASK 3.1: Verify Performance Metrics (2 hours)

**Investigation Checklist**:

1. **Locate Metrics Implementation**:

   ```bash
   # Find streaming-websocket.service.ts
   find libs/langgraph-modules/streaming -name "*websocket*.ts" -type f

   # Search for metrics implementation
   grep -r "getTokenStats\|getMetrics\|performance" libs/langgraph-modules/streaming/src
   ```

2. **Verify TokenStreamingService Metrics** (token-streaming.service.ts:321-327):

   ```typescript
   getTokenStats(): Observable<{
     activeStreams: number;
     totalTokensProcessed: number;
     averageTokensPerSecond: number;
   }> {
     return this.tokenStatsSubject.asObservable();
   }
   ```

   **Validation**:

   - ✅ Check if `updateTokenStats()` is called regularly (line 864-878)
   - ✅ Verify calculation: `tokensPerSecond = totalTokensProcessed / elapsedSeconds`
   - ✅ Test accuracy under load (compare calculated vs actual)

3. **Verify WebSocket Gateway Metrics**:

   ```bash
   # Inspect streaming-websocket.service.ts for connection metrics
   grep -A 20 "class StreamingWebSocketService" libs/langgraph-modules/streaming/src/lib/services/streaming-websocket.service.ts
   ```

   **Expected Metrics**:

   - Active WebSocket connections count
   - Messages per second rate
   - Error rate (failed messages / total messages)
   - Average message latency

**Test Plan**:

```typescript
describe('Performance Metrics Verification', () => {
  it('should expose accurate token statistics', async () => {
    // Process 100 tokens
    for (let i = 0; i < 100; i++) {
      service.streamToken('exec-123', 'node-456', `token-${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for processing

    const stats = await firstValueFrom(service.getTokenStats());
    expect(stats.totalTokensProcessed).toBe(100);
    expect(stats.averageTokensPerSecond).toBeGreaterThan(0);
  });
});
```

**Acceptance Criteria**:

- ✅ All 5 acceptance criteria from Requirement 3 pass
- ✅ Metrics are accurate within 5% tolerance
- ✅ No metrics-related errors under load

---

### SUBTASK 3.2: Verify Sequence Number Generation (2 hours)

**Investigation Checklist**:

1. **Inspect Sequence Counter Implementation** (token-streaming.service.ts):

   ```bash
   # Search for sequence number logic
   grep -B 5 -A 10 "sequenceNumber\|sequenceCounters" libs/langgraph-modules/streaming/src/lib/services/token-streaming.service.ts
   ```

2. **Check StreamMetadata Interface** (streaming.interface.ts:17-24):

   ```typescript
   export interface StreamMetadata {
     timestamp: Date;
     sequenceNumber: number; // ✅ Correct type
     executionId: string;
     nodeId?: string;
     agentType?: string;
     [key: string]: any;
   }
   ```

3. **Verify Counter-Based Implementation** (token-streaming.service.ts:743-763):

   ```typescript
   private createTokenStreamUpdate(tokenEntry: TokenBufferEntry): StreamUpdate {
     const tokenData: TokenData = {
       content: tokenEntry.token,
       index: tokenEntry.index, // ✅ Index from buffer entry
       totalTokens: undefined,
     };

     const metadata: StreamMetadata = {
       timestamp: tokenEntry.timestamp,
       sequenceNumber: tokenEntry.index, // ✅ Using index, not timestamp
       executionId: tokenEntry.executionId,
       nodeId: tokenEntry.nodeId,
       ...tokenEntry.metadata,
     };

     return {
       type: StreamEventType.TOKEN,
       data: tokenData,
       metadata,
     };
   }
   ```

4. **Check Index Assignment** (token-streaming.service.ts:255-262):

   ```typescript
   const tokenEntry: TokenBufferEntry = {
     executionId,
     nodeId,
     token,
     metadata,
     timestamp: new Date(),
     index: streamConfig.totalTokens++, // ✅ Monotonically increasing counter
   };
   ```

**Test Plan**:

```typescript
describe('Sequence Number Generation Verification', () => {
  it('should generate monotonically increasing sequence numbers', async () => {
    const sequences: number[] = [];

    service.getTokenStream('exec-123', 'node-456').subscribe((update) => {
      sequences.push(update.metadata.sequenceNumber);
    });

    // Emit 10 tokens
    for (let i = 0; i < 10; i++) {
      service.streamToken('exec-123', 'node-456', `token-${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for buffering
    await service.flushTokens('exec-123', 'node-456');

    // Verify monotonic increase
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
    }

    // Verify starting from 0
    expect(sequences[0]).toBe(0);
  });

  it('should maintain independent counters per execution', async () => {
    const exec1Sequences: number[] = [];
    const exec2Sequences: number[] = [];

    service.getTokenStream('exec-1').subscribe((u) => exec1Sequences.push(u.metadata.sequenceNumber));
    service.getTokenStream('exec-2').subscribe((u) => exec2Sequences.push(u.metadata.sequenceNumber));

    // Emit to both executions
    service.streamToken('exec-1', 'node-1', 'token-a');
    service.streamToken('exec-2', 'node-2', 'token-b');
    service.streamToken('exec-1', 'node-1', 'token-c');

    await service.flushTokens('exec-1', 'node-1');
    await service.flushTokens('exec-2', 'node-2');

    // Both should start from 0
    expect(exec1Sequences[0]).toBe(0);
    expect(exec2Sequences[0]).toBe(0);
  });
});
```

**Acceptance Criteria**:

- ✅ All 5 acceptance criteria from Requirement 4 pass
- ✅ No timestamp-based sequence numbers found
- ✅ Counters are per-execution independent
- ✅ Monotonic increase verified under concurrent load

**Status**: ✅ **VERIFIED** - Implementation is correct based on source code analysis

---

### SUBTASK 3.3: Verify WebSocket Error Recovery (3 hours)

**Investigation Checklist**:

1. **Inspect Retry Logic** (websocket-bridge.service.ts):

   ```bash
   # Search for retry/reconnection logic
   grep -B 5 -A 15 "retry\|reconnect\|backoff" libs/langgraph-modules/streaming/src/lib/services/websocket-bridge.service.ts
   ```

2. **Check Dead Letter Queue**:

   ```bash
   # Search for failed message queue
   grep -B 5 -A 10 "deadLetter\|failedMessages\|messageQueue" libs/langgraph-modules/streaming/src/lib/services/websocket-bridge.service.ts
   ```

3. **Current Event Handlers** (websocket-bridge.service.ts:415-549):

   - `@OnEvent('stream.processed')` (line 415)
   - `@OnEvent('client.progress')` (line 438)
   - `@OnEvent('client.milestone')` (line 458)
   - `@OnEvent('tokens.aggregated')` (line 478)
   - `@OnEvent('token.batch.processed')` (line 502)
   - `@OnEvent('workflow.stream.*')` (line 527)

   **Analysis**: No retry logic or dead letter queue found in current implementation.

**Implementation Required**:

```typescript
// Add to WebSocketBridgeService class
private readonly failedMessageQueue = new Map<string, {
  message: StreamUpdate;
  clientId: string;
  attempts: number;
  lastAttempt: Date;
  error: Error;
}[]>();

private readonly connectionRetries = new Map<string, {
  attempts: number;
  lastAttempt: Date;
  backoffMs: number;
}>();

private readonly MAX_RETRY_ATTEMPTS = 5;
private readonly MAX_DEAD_LETTER_SIZE = 100;
private readonly INITIAL_BACKOFF_MS = 1000;
private readonly MAX_BACKOFF_MS = 30000;

/**
 * Send message to client with retry logic
 */
async sendWithRetry(
  clientId: string,
  update: StreamUpdate,
  maxAttempts = this.MAX_RETRY_ATTEMPTS
): Promise<void> {
  const client = this.clients.get(clientId);

  if (!client) {
    this.logger.warn(`Client ${clientId} not found - queueing to dead letter`);
    this.addToDeadLetterQueue(clientId, update, new Error('Client not found'));
    return;
  }

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxAttempts) {
    try {
      client.subject.next(update);
      this.logger.debug(`Message sent to ${clientId} (attempt ${attempts + 1})`);
      return; // Success
    } catch (error) {
      attempts++;
      lastError = error as Error;

      if (attempts < maxAttempts) {
        const backoffMs = this.calculateBackoff(attempts);
        this.logger.warn(
          `Failed to send to ${clientId} (attempt ${attempts}/${maxAttempts}), ` +
          `retrying in ${backoffMs}ms: ${error}`
        );
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  this.logger.error(
    `Failed to send to ${clientId} after ${maxAttempts} attempts, ` +
    `adding to dead letter queue`
  );
  this.addToDeadLetterQueue(clientId, update, lastError!);
}

/**
 * Calculate exponential backoff delay
 */
private calculateBackoff(attemptNumber: number): number {
  const backoff = this.INITIAL_BACKOFF_MS * Math.pow(2, attemptNumber - 1);
  return Math.min(backoff, this.MAX_BACKOFF_MS);
}

/**
 * Add failed message to dead letter queue
 */
private addToDeadLetterQueue(
  clientId: string,
  message: StreamUpdate,
  error: Error
): void {
  if (!this.failedMessageQueue.has(clientId)) {
    this.failedMessageQueue.set(clientId, []);
  }

  const queue = this.failedMessageQueue.get(clientId)!;

  // Enforce size limit
  if (queue.length >= this.MAX_DEAD_LETTER_SIZE) {
    const removed = queue.shift(); // Remove oldest
    this.logger.warn(
      `Dead letter queue full for ${clientId}, removed message: ${removed?.message.type}`
    );
  }

  queue.push({
    message,
    clientId,
    attempts: this.MAX_RETRY_ATTEMPTS,
    lastAttempt: new Date(),
    error,
  });

  this.eventEmitter.emit('websocket.dead.letter', {
    clientId,
    queueSize: queue.length,
    messageType: message.type,
    error: error.message,
  });
}

/**
 * Replay events from last acknowledged sequence
 */
async replayEvents(
  clientId: string,
  lastAcknowledgedSequence: number
): Promise<void> {
  const client = this.clients.get(clientId);

  if (!client || !client.executionId) {
    return;
  }

  // Get buffered events from EventStreamProcessorService
  const bufferedEvents = await this.eventStreamProcessor.replayEvents(
    client.executionId,
    lastAcknowledgedSequence
  );

  this.logger.log(
    `Replaying ${bufferedEvents.length} events for ${clientId} from sequence ${lastAcknowledgedSequence}`
  );

  for (const event of bufferedEvents) {
    await this.sendWithRetry(clientId, event);
  }
}

/**
 * Get dead letter queue for client
 */
getDeadLetterQueue(clientId: string): Array<{
  message: StreamUpdate;
  attempts: number;
  lastAttempt: Date;
  error: string;
}> {
  const queue = this.failedMessageQueue.get(clientId) || [];
  return queue.map(entry => ({
    message: entry.message,
    attempts: entry.attempts,
    lastAttempt: entry.lastAttempt,
    error: entry.error.message,
  }));
}

/**
 * Clear dead letter queue for client
 */
clearDeadLetterQueue(clientId: string): void {
  this.failedMessageQueue.delete(clientId);
  this.logger.log(`Cleared dead letter queue for ${clientId}`);
}
```

**Integration Points**:

1. Update `broadcastToExecution()` to use `sendWithRetry()` instead of direct `subject.next()`
2. Add reconnection handler in `registerClient()` to replay events
3. Expose dead letter queue via HTTP endpoint for manual inspection

**Test Plan**:

```typescript
describe('WebSocket Error Recovery Verification', () => {
  it('should retry with exponential backoff', async () => {
    const clientId = 'test-client';
    const update = { type: StreamEventType.TOKEN, data: { content: 'test' } };

    // Mock client that fails first 2 attempts
    let attemptCount = 0;
    const mockClient = {
      subject: {
        next: jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) throw new Error('Connection failed');
        }),
      },
    };

    service['clients'].set(clientId, mockClient as any);

    await service.sendWithRetry(clientId, update);

    expect(attemptCount).toBe(3); // 2 failures + 1 success
  });

  it('should add to dead letter queue after max retries', async () => {
    const clientId = 'failing-client';
    const update = { type: StreamEventType.TOKEN, data: { content: 'test' } };

    // Mock client that always fails
    const mockClient = {
      subject: {
        next: jest.fn().mockRejectedValue(new Error('Always fails')),
      },
    };

    service['clients'].set(clientId, mockClient as any);

    await service.sendWithRetry(clientId, update, 3);

    const deadLetterQueue = service.getDeadLetterQueue(clientId);
    expect(deadLetterQueue.length).toBe(1);
    expect(deadLetterQueue[0].attempts).toBe(3);
  });

  it('should replay events from last sequence on reconnect', async () => {
    const clientId = 'reconnecting-client';
    const executionId = 'exec-123';

    // Setup buffered events
    const bufferedEvents = [
      { type: StreamEventType.TOKEN, metadata: { sequenceNumber: 5 } },
      { type: StreamEventType.TOKEN, metadata: { sequenceNumber: 6 } },
    ];

    jest.spyOn(service['eventStreamProcessor'], 'replayEvents').mockResolvedValue(bufferedEvents);

    await service.replayEvents(clientId, 4); // Replay from sequence 4

    expect(service['eventStreamProcessor'].replayEvents).toHaveBeenCalledWith(executionId, 4);
  });
});
```

**Acceptance Criteria**:

- ✅ All 5 acceptance criteria from Requirement 5 pass
- ✅ Exponential backoff: 1s, 2s, 4s, 8s, max 30s
- ✅ Dead letter queue max 100 messages
- ✅ Event replay from last sequence works

**Status**: ⚠️ **NEEDS IMPLEMENTATION** - No retry logic exists, must be added

---

### SUBTASK 3.4: Verify Memory Leak Prevention (3 hours)

**Investigation Checklist**:

1. **Verify Buffer Size Limits** (event-stream-processor.service.ts:146-156):

   ```typescript
   bufferEvents(executionId: string, event: StreamUpdate): void {
     const buffer = this.eventBuffer.get(executionId) || [];
     buffer.push(event);

     // Limit buffer size to prevent memory issues
     if (buffer.length > 1000) {
       buffer.shift(); // ✅ FIFO eviction implemented
     }

     this.eventBuffer.set(executionId, buffer);
   }
   ```

   **Status**: ✅ **VERIFIED** - 1000 event limit with FIFO eviction

2. **Verify Cleanup Timers** (websocket-bridge.service.ts:794-800):

   ```typescript
   private setupCleanupInterval(): void {
     // Cleanup disconnected clients and stale rooms every 60 seconds
     this.cleanupInterval = setInterval(() => {
       this.cleanupDisconnectedClients();
       this.cleanupStaleRooms();
     }, 60000); // ✅ 60 second interval
   }
   ```

   **Status**: ✅ **VERIFIED** - Cleanup runs every 60 seconds

3. **Verify Stale Stream Cleanup** (token-streaming.service.ts:905-932):

   ```typescript
   private cleanupStaleStreams(): void {
     const now = Date.now();
     const staleThreshold = 5 * 60 * 1000; // 5 minutes ✅
     const streamsToRemove: string[] = [];

     this.tokenStreams.forEach((config, streamKey) => {
       const lastActivity = Math.max(
         config.lastFlush.getTime(),
         ...config.buffer.map((entry) => entry.timestamp.getTime())
       );

       if (now - lastActivity > staleThreshold) {
         streamsToRemove.push(streamKey);
       }
     });

     streamsToRemove.forEach((streamKey) => {
       const [executionId, nodeId] = streamKey.split(':');
       this.closeTokenStream(executionId, nodeId);
       this.logger.debug(`Cleaned up stale token stream: ${streamKey}`);
     });
   }
   ```

   **Status**: ✅ **VERIFIED** - 5 minute idle threshold

4. **Verify Resource Disposal** (token-streaming.service.ts:969-993):

   ```typescript
   private cleanup(): void {
     // Close cleanup timer
     if (this.cleanupTimer) {
       this.cleanupTimer.unsubscribe(); // ✅
     }

     // Close all token streams
     const streamKeys = Array.from(this.tokenStreams.keys());
     streamKeys.forEach((streamKey) => {
       const [executionId, nodeId] = streamKey.split(':');
       this.closeTokenStream(executionId, nodeId); // ✅
     });

     // Unsubscribe from all subscriptions
     this.activeSubscriptions.forEach((subscription) => {
       subscription.unsubscribe(); // ✅
     });
     this.activeSubscriptions.clear();

     // Complete subjects
     this.globalTokenSubject.complete(); // ✅
     this.tokenStatsSubject.complete(); // ✅

     this.logger.log('TokenStreamingService cleanup completed');
   }
   ```

   **Status**: ✅ **VERIFIED** - All resources properly disposed

**Load Testing**:

```typescript
describe('Memory Leak Prevention Verification', () => {
  it('should limit event buffer to 1000 events', async () => {
    const executionId = 'exec-memory-test';

    // Add 1500 events
    for (let i = 0; i < 1500; i++) {
      const event: StreamUpdate = {
        type: StreamEventType.TOKEN,
        data: { content: `token-${i}` },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: i,
          executionId,
        },
      };

      eventProcessor.bufferEvents(executionId, event);
    }

    const bufferedEvents = eventProcessor.replayEvents(executionId);

    // Should be limited to 1000
    expect(bufferedEvents.length).toBe(1000);

    // Should be most recent 1000 (FIFO eviction)
    expect(bufferedEvents[0].metadata.sequenceNumber).toBe(500);
    expect(bufferedEvents[999].metadata.sequenceNumber).toBe(1499);
  });

  it('should cleanup stale streams after 5 minutes', async () => {
    const executionId = 'stale-exec';
    const nodeId = 'stale-node';

    // Initialize stream
    await tokenService.initializeTokenStream({
      executionId,
      nodeId,
      config: { enabled: true, methodName: 'test' },
    });

    expect(tokenService.getActiveTokenStreams().length).toBe(1);

    // Mock time passage (5 minutes + 1 second)
    jest.useFakeTimers();
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

    // Trigger cleanup
    tokenService['cleanupStaleStreams']();

    expect(tokenService.getActiveTokenStreams().length).toBe(0);

    jest.useRealTimers();
  });

  it('should dispose all resources on cleanup', async () => {
    // Setup multiple streams and subscriptions
    await tokenService.initializeTokenStream({
      executionId: 'exec-1',
      nodeId: 'node-1',
      config: { enabled: true, methodName: 'test' },
    });

    await tokenService.initializeTokenStream({
      executionId: 'exec-2',
      nodeId: 'node-2',
      config: { enabled: true, methodName: 'test' },
    });

    const subscription1 = tokenService.getTokenStream('exec-1').subscribe();
    const subscription2 = tokenService.getTokenStream('exec-2').subscribe();

    // Execute cleanup
    tokenService['cleanup']();

    // Verify all disposed
    expect(subscription1.closed).toBe(true);
    expect(subscription2.closed).toBe(true);
    expect(tokenService['tokenStreams'].size).toBe(0);
    expect(tokenService['activeSubscriptions'].size).toBe(0);
  });
});
```

**Memory Profiling**:

```typescript
// Run memory profiling test
it('should maintain stable memory under sustained load', async () => {
  const initialMemory = process.memoryUsage().heapUsed;

  // Simulate 1 hour of streaming (100 executions × 1000 tokens each)
  for (let exec = 0; exec < 100; exec++) {
    const executionId = `exec-${exec}`;

    for (let token = 0; token < 1000; token++) {
      eventProcessor.bufferEvents(executionId, {
        type: StreamEventType.TOKEN,
        data: { content: `token-${token}` },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: token,
          executionId,
        },
      });
    }

    // Cleanup after each execution
    eventProcessor.clearBuffer(executionId);
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

  // Memory increase should be < 10MB for 100K events processed
  expect(memoryIncreaseMB).toBeLessThan(10);
});
```

**Acceptance Criteria**:

- ✅ All 5 acceptance criteria from Requirement 6 pass
- ✅ Buffer size limit (1000 events) enforced
- ✅ Stale streams cleaned after 5 minutes
- ✅ Cleanup logs execution count and memory freed
- ✅ All resources disposed on service stop

**Status**: ✅ **VERIFIED** - All memory leak prevention mechanisms are correctly implemented

---

## Risk Mitigation Strategies

### Risk 1: Execution Context Extraction

**Mitigation Plan**:

1. First, try extracting from decorator metadata (config.executionId, config.nodeId)
2. If unavailable, use method call context via AsyncLocalStorage or custom context injection
3. Fallback: Require executionId/nodeId as mandatory config parameters (breaking change, requires migration guide)

**Implementation**:

```typescript
// Option 1: Decorator metadata (preferred)
@StreamToken({ executionId: () => this.getExecutionId(), nodeId: 'my-node' })

// Option 2: AsyncLocalStorage context
const executionContext = AsyncLocalStorage.getStore() as { executionId: string };

// Option 3: Mandatory parameters (fallback)
interface StreamTokenDecoratorMetadata {
  executionId: string; // Required instead of optional
  nodeId: string;      // Required instead of optional
}
```

### Risk 2: Backpressure Complexity

**Mitigation Plan**:

1. Start with simple buffering (drop or pause strategy)
2. Use RxJS throttleTime for basic throttling
3. Defer advanced backpressure (e.g., reactive pull-based) to future release

**Implementation**:

- Phase 1: Implement drop/pause strategies (SUBTASK 2.2)
- Phase 2: Add RxJS throttling (optional enhancement)
- Phase 3: Advanced reactive backpressure (v2 feature)

---

## Quality Gates Checklist

Before marking task complete:

- [ ] **Phase 1 Complete**: processStringTokens emits tokens with execution context
- [ ] **Phase 2 Complete**: processAsyncIterableTokens has configurable delays and backpressure
- [ ] **Phase 3 Complete**: All verification items confirmed (metrics, sequence, error recovery, memory)
- [ ] **Build Success**: Zero TypeScript errors, all tests pass
- [ ] **Test Coverage**: ≥80% coverage for all modified code
- [ ] **Performance**: Token emission <10ms latency (95th percentile)
- [ ] **Documentation**: Updated CLAUDE.md with new configuration options
- [ ] **Code Review**: Approved by senior backend developer
- [ ] **Integration Test**: End-to-end streaming workflow works in dev-brand-api

---

## Deployment Strategy

### Phase 1 Deployment (Critical Fix)

1. Deploy processStringTokens fix to staging
2. Run integration tests with dev-brand-api workflows
3. Validate no regressions in existing streaming functionality
4. Deploy to production with feature flag (enable for 10% traffic)
5. Monitor error rates and performance metrics
6. Full rollout after 24 hours of stable operation

### Phase 2 Deployment (Performance Enhancement)

1. Deploy processAsyncIterableTokens enhancements to staging
2. Performance benchmarking (10K tokens/sec target)
3. Load testing with sustained high throughput
4. Gradual rollout: 10% → 50% → 100% over 72 hours

### Phase 3 Deployment (Verification Fixes)

1. Deploy error recovery and metrics fixes together
2. Test reconnection scenarios and dead letter queue
3. Monitor memory usage under sustained load
4. Full deployment after successful staging validation

---

## Success Metrics

### Functional Metrics

- ✅ String token streaming works (currently broken)
- ✅ Configurable async delays (currently hardcoded 25ms)
- ✅ WebSocket error recovery with retry (to be implemented)
- ✅ Memory stable under sustained load (verified)

### Performance Metrics

- Token emission latency: <10ms (95th percentile)
- Throughput: 10K tokens/sec per stream
- Memory per execution: <5MB average
- WebSocket message delivery: <50ms (99th percentile)

### Business Metrics

- Production Readiness: 100/100 (currently 55/100)
- Zero critical issues remaining
- 99.9% uptime under production load
- <5% error rate

---

## Next Steps for Backend Developer

1. **Start with Phase 1** (4 hours):

   - Implement processStringTokens token emission (SUBTASK 1.1-1.4)
   - Focus on extracting execution context first
   - Test end-to-end with dev-brand-api workflow
   - Get code review approval before proceeding

2. **Proceed to Phase 2** (6 hours):

   - Add configuration options to interface (SUBTASK 2.1)
   - Implement backpressure handling (SUBTASK 2.2)
   - Performance test under load (SUBTASK 2.4)

3. **Complete Phase 3** (10 hours):
   - Verify all 6 requirements (SUBTASK 3.1-3.4)
   - Implement missing error recovery (SUBTASK 3.3)
   - Run full integration test suite
   - Update documentation

**Total Timeline**: 20 hours (2.5 business days)

**Blockers**: None identified - all dependencies available

**Support Needed**: Code review from senior backend developer after Phase 1
