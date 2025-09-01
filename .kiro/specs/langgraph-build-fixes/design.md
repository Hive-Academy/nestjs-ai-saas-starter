# Design Document

## Overview

This design addresses systematic build failures across the langgraph-modules ecosystem by implementing consistent export patterns, proper Rollup configuration, and correct import/export type matching. The solution focuses on the dependency chain: core → streaming/checkpoint → functional-api → workflow-engine → hitl/multi-agent/time-travel.

## Architecture

### Module Dependency Hierarchy

```
Core Modules (Foundation):
├── langgraph-modules/core (@hive-academy/langgraph-core)
├── langgraph-modules/checkpoint (@hive-academy/langgraph-checkpoint)  
└── langgraph-modules/streaming (@hive-academy/langgraph-streaming)

Mid-Level Modules:
├── langgraph-modules/functional-api (@hive-academy/langgraph-functional-api)
│   └── depends on: core, checkpoint
└── langgraph-modules/workflow-engine
    └── depends on: core, streaming, functional-api

High-Level Modules:
├── langgraph-modules/hitl → depends on: core
├── langgraph-modules/multi-agent → depends on: core  
└── langgraph-modules/time-travel → depends on: checkpoint
```

### Build System Configuration

**Rollup Configuration Pattern:**
```json
{
  "buildLibsFromSource": true,
  "external": ["@hive-academy/langgraph-*"],
  "format": ["cjs", "esm"]
}
```

## Components and Interfaces

### 1. Export Standardization Component

**Purpose**: Ensure consistent export patterns across all modules

**Core Module Exports**:
```typescript
// Constants (runtime exports)
export { 
  WORKFLOW_METADATA_KEY,
  WORKFLOW_NODES_KEY, 
  WORKFLOW_EDGES_KEY,
  WORKFLOW_TOOLS_KEY,
  LANGGRAPH_MODULE_OPTIONS 
} from './lib/constants';

// Interfaces (type exports)
export type {
  WorkflowState,
  HumanFeedback,
  Command,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowError,
  LangGraphModuleOptions
} from './lib/interfaces/workflow.interface';

// Annotations (runtime exports)
export { 
  WorkflowStateAnnotation,
  createCustomStateAnnotation 
} from './lib/annotations/workflow-state.annotation';

// Utils (runtime exports)  
export { isWorkflow } from './lib/utils/workflow-metadata.utils';
```

**Streaming Module Exports**:
```typescript
// Services (runtime exports)
export { 
  TokenStreamingService,
  EventStreamProcessorService, 
  WebSocketBridgeService 
} from './lib/services';

// Interfaces (type exports)
export type {
  StreamUpdate,
  StreamMetadata,
  StreamContext,
  TokenData,
  StreamTokenMetadata,
  StreamEventMetadata,
  StreamProgressMetadata
} from './lib/interfaces/streaming.interface';

// Enums and functions (runtime exports)
export {
  StreamEventType,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata
} from './lib/interfaces/streaming.interface';
```

**Functional-API Module Exports**:
```typescript
// Decorators (runtime exports)
export * from './lib/decorators/workflow.decorator';
export * from './lib/decorators/node.decorator';
export * from './lib/decorators/edge.decorator';

// Metadata functions (runtime exports)
export { 
  getWorkflowMetadata,
  getWorkflowNodes,
  getWorkflowEdges,
  getAllStreamingMetadata
} from './lib/decorators';

// Metadata types (type exports)
export type { 
  NodeMetadata,
  EdgeMetadata 
} from './lib/decorators';

// Re-exports from core
export { isWorkflow } from '@hive-academy/langgraph-core';
```

### 2. Import Correction Component

**Purpose**: Fix import statements to match export types

**Type Import Pattern**:
```typescript
// For interfaces and types
import type {
  StreamUpdate,
  StreamMetadata,
  WorkflowState
} from '@hive-academy/langgraph-streaming';

// For enums, functions, and runtime values
import { 
  StreamEventType,
  getStreamTokenMetadata,
  WorkflowStateAnnotation
} from '@hive-academy/langgraph-streaming';
```

**Mixed Import Pattern**:
```typescript
import type { WorkflowState, Command } from '@hive-academy/langgraph-core';
import { 
  WORKFLOW_METADATA_KEY,
  WorkflowStateAnnotation,
  isWorkflow 
} from '@hive-academy/langgraph-core';
```

### 3. Rollup Configuration Component

**Purpose**: Configure Rollup for proper inter-module dependency handling

**Base Configuration**:
```json
{
  "executor": "@nx/rollup:rollup",
  "options": {
    "buildLibsFromSource": true,
    "external": [],
    "format": ["cjs", "esm"],
    "useLegacyTypescriptPlugin": false
  }
}
```

**Module-Specific External Dependencies**:
- **functional-api**: `["@hive-academy/langgraph-core", "@hive-academy/langgraph-checkpoint"]`
- **workflow-engine**: `["@hive-academy/langgraph-core", "@hive-academy/langgraph-streaming", "@hive-academy/langgraph-functional-api"]`
- **hitl**: `["@hive-academy/langgraph-core"]`
- **multi-agent**: `["@hive-academy/langgraph-core"]`
- **time-travel**: `["@hive-academy/langgraph-checkpoint"]`

## Data Models

### Export Classification Model

```typescript
interface ExportClassification {
  name: string;
  type: 'interface' | 'enum' | 'function' | 'constant' | 'class';
  exportType: 'type' | 'runtime' | 'both';
  module: string;
  dependencies: string[];
}
```

### Build Dependency Model

```typescript
interface ModuleDependency {
  module: string;
  dependsOn: string[];
  buildOrder: number;
  rollupConfig: {
    buildLibsFromSource: boolean;
    external: string[];
  };
}
```

## Error Handling

### Missing Export Detection
- Scan import statements across all modules
- Cross-reference with actual exports
- Generate missing export report
- Prioritize fixes by dependency order

### Build Failure Recovery
- Implement incremental build validation
- Rollback capability for configuration changes
- Clear error messaging for debugging
- Automated retry with corrected configurations

### Type Mismatch Resolution
- Detect type vs runtime import mismatches
- Suggest correct import syntax
- Validate export availability
- Ensure compatibility with buildLibsFromSource

## Testing Strategy

### Unit Testing
- Test individual module exports
- Validate import statement correctness
- Test Rollup configuration effectiveness
- Verify type resolution

### Integration Testing  
- Test cross-module imports
- Validate build order dependencies
- Test complete build pipeline
- Verify API server startup

### Build Validation Testing
- Automated build success verification
- Import/export completeness checks
- Performance regression testing
- Configuration consistency validation

## Implementation Phases

### Phase 1: Core Module Fixes (Priority: Critical)
- Fix core module exports (constants, interfaces, annotations)
- Add missing LANGGRAPH_MODULE_OPTIONS export
- Ensure WorkflowStateAnnotation is properly exported
- Validate all core interfaces are available

### Phase 2: Streaming Module Fixes (Priority: High)
- Add missing streaming interfaces and metadata types
- Fix StreamEventType enum export
- Add helper functions for metadata creation
- Correct type vs runtime export classification

### Phase 3: Functional-API Module Fixes (Priority: High)  
- Export metadata functions (getWorkflowMetadata, etc.)
- Export metadata types (NodeMetadata, EdgeMetadata)
- Ensure decorator exports are complete
- Fix isWorkflow re-export

### Phase 4: Rollup Configuration (Priority: High)
- Add buildLibsFromSource to all dependent modules
- Configure external dependencies properly
- Test build order and dependency resolution
- Validate configuration consistency

### Phase 5: Import Statement Corrections (Priority: Medium)
- Fix type imports in workflow-engine
- Correct runtime imports for enums and functions
- Ensure import/export type matching
- Validate all cross-module imports

### Phase 6: Validation and Testing (Priority: Medium)
- Test individual module builds
- Validate complete build pipeline
- Test API server startup
- Document patterns for future use
