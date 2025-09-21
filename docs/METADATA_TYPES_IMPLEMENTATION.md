# Generic Metadata Types Implementation

This document describes the implementation of proper metadata types with generics for the @hive-academy/langgraph-workflow-engine library.

## Overview

The previous implementation used loose typing with `any` types and manual property additions. This implementation provides a robust, type-safe metadata system using proper generics while maintaining compatibility with LangGraph's checkpoint system.

## 🎯 Key Improvements

### 1. Type Safety

- **Before**: `any` types, loose type casting, manual property extensions
- **After**: Strict generics, compile-time type checking, no `any` types in metadata

### 2. Generic Support

- **Before**: Fixed metadata structure with index signatures
- **After**: `WorkflowCheckpointMetadata<T>` supports custom payload types

### 3. LangGraph Compatibility

- **Before**: Manual property mapping between different metadata formats
- **After**: Proper extension of `BaseCheckpointMetadata` with seamless compatibility

### 4. Extensibility

- **Before**: Limited to predefined fields
- **After**: Support for domain-specific metadata payloads

## 📋 Implementation Details

### Core Interfaces

#### `WorkflowExecutionMetadata`

```typescript
interface WorkflowExecutionMetadata extends BaseCheckpointMetadata {
  readonly executionId: string;
  readonly type: 'initial' | 'progress' | 'final' | 'error' | 'milestone';
  readonly created_at: string;
  readonly nodeId?: string;
  readonly workflowName?: string;
  readonly workflowVersion?: string;
  readonly error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
```

#### `WorkflowCheckpointMetadata<TPayload>`

```typescript
interface WorkflowCheckpointMetadata<TPayload = Record<string, unknown>> extends WorkflowExecutionMetadata {
  readonly payload?: TPayload;
}
```

#### `WorkflowStreamMetadata<TStreamData>`

```typescript
interface WorkflowStreamMetadata<TStreamData = Record<string, unknown>> extends WorkflowExecutionMetadata {
  readonly sequenceNumber: number;
  readonly streamType: 'token' | 'message' | 'event' | 'progress' | 'milestone' | 'debug';
  readonly streamData?: TStreamData;
  readonly buffer?: {
    size: number;
    accumulated: string;
    progress: number;
  };
}
```

### Generic Record Types

#### `WorkflowCheckpointRecord<TData, TMetadata>`

```typescript
interface WorkflowCheckpointRecord<TData = unknown, TMetadata = Record<string, unknown>> {
  readonly id: string;
  readonly thread_id: string;
  readonly checkpoint: {
    readonly version: number;
    readonly data: TData;
  };
  readonly metadata: WorkflowCheckpointMetadata<TMetadata>;
}
```

### Predefined Payload Types

#### Individual Metadata Interfaces

```typescript
interface WorkflowAIMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptVersion?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

interface WorkflowBusinessMetadata {
  tenantId?: string;
  organizationId?: string;
  projectId?: string;
  environment?: 'development' | 'staging' | 'production';
  features?: string[];
  experiments?: Record<string, boolean>;
}

interface WorkflowPerformanceMetadata {
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkCalls?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

interface WorkflowUserMetadata {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  locale?: string;
}
```

## 🔧 Updated Services

### WorkflowCheckpointService

#### Method Signatures

```typescript
// Before
async saveCheckpoint(
  executionId: string,
  data: any,
  type: 'initial' | 'progress' | 'final' | 'error' = 'progress',
  metadata: Record<string, any> = {}
): Promise<void>

// After
async saveCheckpoint<TMetadata = Record<string, unknown>>(
  executionId: string,
  data: WorkflowCheckpointData,
  type: WorkflowExecutionMetadata['type'] = 'progress',
  customMetadata: TMetadata = {} as TMetadata
): Promise<void>
```

#### Type-Safe Operations

```typescript
// Resume with typed data
async resumeWorkflow<TData = WorkflowCheckpointData>(
  executionId: string
): Promise<TData | null>

// List with typed results
async listCheckpoints<
  TData = WorkflowCheckpointData,
  TMetadata = Record<string, unknown>
>(
  executionId: string,
  limit = 50,
  before?: string
): Promise<WorkflowCheckpointListResult<TData, TMetadata>>
```

### WorkflowStreamService

#### Updated Checkpoint Methods

```typescript
// Type-safe initial checkpoint
private async saveInitialCheckpoint<TMetadata = WorkflowPerformanceMetadata>(
  executionId: string,
  input: unknown,
  config: unknown,
  customMetadata?: TMetadata
): Promise<void>

// Type-safe final checkpoint
private async saveFinalCheckpoint<TMetadata = WorkflowPerformanceMetadata>(
  executionId: string,
  finalState: unknown,
  config: unknown,
  customMetadata?: TMetadata
): Promise<void>
```

## 📊 Usage Examples

### Basic AI Workflow

```typescript
// Define custom metadata type
type AIMetadata = WorkflowAIMetadata & {
  promptVersion: string;
  responseQuality: number;
};

// Use in service
await checkpointService.saveCheckpoint('ai-execution-123', workflowData, 'progress', {
  model: 'gpt-4',
  temperature: 0.7,
  tokenUsage: { prompt: 150, completion: 300, total: 450 },
  promptVersion: 'v2.1',
  responseQuality: 0.95,
} as AIMetadata);
```

### Business Workflow with Multiple Domains

```typescript
type MultiDomainMetadata = WorkflowBusinessMetadata & WorkflowUserMetadata & WorkflowPerformanceMetadata;

const results = await checkpointService.listCheckpoints<BusinessWorkflowData, MultiDomainMetadata>(executionId);

// All properties are strongly typed
results.checkpoints.forEach((checkpoint) => {
  const tenantId = checkpoint.metadata.payload?.tenantId; // string | undefined
  const userId = checkpoint.metadata.payload?.userId; // string | undefined
  const duration = checkpoint.metadata.payload?.duration; // number | undefined
});
```

### Streaming with Custom Data

```typescript
interface TokenStreamData {
  tokenizer: string;
  language: string;
  confidence: number;
}

const streamMetadata: WorkflowStreamMetadata<TokenStreamData> = {
  // ... base metadata
  streamType: 'token',
  streamData: {
    tokenizer: 'gpt-4-tokenizer',
    language: 'english',
    confidence: 0.97,
  },
};
```

## 🚀 Migration Guide

### For Existing Code

1. **Update Import Statements**

```typescript
// Add new imports
import { WorkflowCheckpointMetadata, WorkflowCheckpointData, WorkflowAIMetadata, WorkflowBusinessMetadata, WorkflowPerformanceMetadata, WorkflowUserMetadata } from '@hive-academy/langgraph-workflow-engine';
```

2. **Replace `any` Types**

```typescript
// Before
const metadata: any = {
  /* ... */
};

// After
const metadata: WorkflowCheckpointMetadata<MyCustomMetadata> = {
  /* ... */
};
```

3. **Update Service Calls**

```typescript
// Before
await service.saveCheckpoint(id, data, 'progress', { custom: 'value' });

// After
await service.saveCheckpoint<MyMetadata>(id, typedData, 'progress', { custom: 'value' });
```

## ✅ Validation

### Build Verification

- ✅ TypeScript compilation succeeds without errors
- ✅ All metadata-related `any` types replaced with generics
- ✅ LangGraph compatibility maintained
- ✅ Backward compatibility preserved through type casting

### Test Coverage

- ✅ Basic metadata creation
- ✅ AI workflow metadata with token usage
- ✅ Business workflow with multi-domain metadata
- ✅ Streaming metadata with custom data
- ✅ Complex checkpoint records with type safety
- ✅ Type validation and compilation checks

## 🎉 Benefits

1. **Compile-Time Safety**: Catch type errors during development
2. **IntelliSense Support**: Better IDE autocomplete and type hints
3. **Refactoring Safety**: Type-safe refactoring across the codebase
4. **Documentation**: Types serve as living documentation
5. **Performance**: No runtime type checking overhead
6. **Extensibility**: Easy to add new metadata payload types
7. **Maintainability**: Clear contracts between components

## 📁 Files Created/Modified

### New Files

- `workflow-metadata.interface.ts` - Core generic metadata interfaces
- `workflow-metadata.examples.ts` - Comprehensive usage examples
- `workflow-metadata.test.ts` - Type safety validation tests
- `METADATA_TYPES_IMPLEMENTATION.md` - This documentation

### Modified Files

- `workflow-checkpoint.service.ts` - Added generic type support
- `workflow-stream.service.ts` - Added type-safe checkpoint methods
- `index.ts` - Added exports for new interfaces

## 🔮 Future Enhancements

1. **Runtime Validation**: Add Zod or similar for runtime type checking
2. **Metadata Schemas**: JSON Schema generation from TypeScript types
3. **Telemetry Integration**: Automatic metrics collection from typed metadata
4. **Migration Tools**: Automated migration utilities for existing data
5. **Documentation Generation**: Auto-generate API docs from generic types

---

**Implementation Status**: ✅ Complete  
**Build Status**: ✅ Passing  
**Type Safety**: ✅ Validated  
**LangGraph Compatibility**: ✅ Maintained
