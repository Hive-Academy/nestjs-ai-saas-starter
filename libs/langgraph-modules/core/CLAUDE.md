# Core Module - User Manual

## Overview

The **@hive-academy/langgraph-core** module provides the foundational interfaces, types, and utilities for building LangGraph workflows in NestJS applications. It defines the core data structures, state management primitives, and workflow execution patterns used by all other langgraph modules.

**Key Features:**

- **Workflow State Management** - Comprehensive state interfaces and annotations for LangGraph integration
- **Type-Safe Workflow Definitions** - Strongly typed interfaces for nodes, edges, and workflow configuration
- **State Annotations & Reducers** - LangGraph-compatible state annotations with intelligent reducers
- **Command & Control Flow** - Sophisticated command interface for workflow control and routing
- **Checkpoint Integration** - Abstract interfaces for checkpoint adapters and state persistence
- **Error Handling & Recovery** - Comprehensive error interfaces with recovery mechanisms

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-core
```

```typescript
import { Module } from '@nestjs/common';
import { CoreModule } from '@hive-academy/langgraph-core';

@Module({
  imports: [
    CoreModule.forRoot({
      stateManagement: {
        immutable: true,
        deepMerge: true,
        persistence: {
          enabled: true,
          compression: true,
          ttl: 3600000, // 1 hour
        },
      },
      checkpointing: {
        enabled: true,
        adapter: 'memory', // or 'postgres', 'redis'
        cleanupInterval: 86400000, // 24 hours
      },
    }),
  ],
})
export class AppModule {}
```

## Core Interfaces

### WorkflowState - Central State Interface

**Primary state structure** for all LangGraph workflows:

```typescript
interface WorkflowState {
  // Core identifiers
  executionId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

  // Execution tracking
  currentNode?: string;
  completedNodes: string[];
  previousNode?: string;
  nextNode?: string;

  // Decision making
  confidence: number;
  risks?: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; type: string; description: string }>;

  // Communication
  messages?: BaseMessage[];

  // Human oversight
  humanFeedback?: HumanFeedback;
  requiresApproval?: boolean;
  approvalReceived?: boolean;
  waitingForApproval?: boolean;

  // Error handling
  error?: WorkflowExecutionError;
  lastError?: WorkflowExecutionError;
  retryCount: number;
  rejectionReason?: string;

  // Timestamps
  timestamps: { started: Date; updated?: Date; completed?: Date };
  startedAt: Date;
  completedAt?: Date;

  // Extensible metadata
  metadata?: Record<string, any>;
  [key: string]: any; // Custom properties
}
```

### WorkflowState Annotation - LangGraph Integration

**LangGraph-compatible state annotation** with intelligent reducers:

```typescript
import { WorkflowStateAnnotation, createCustomStateAnnotation } from '@hive-academy/langgraph-core';

// Use the default annotation
const defaultState = WorkflowStateAnnotation;

// Create custom state with additional fields
const customState = createCustomStateAnnotation({
  taskData: Annotation<TaskInfo>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({ id: '', type: 'unknown', priority: 'medium' }),
  }),

  processingContext: Annotation<ProcessingContext>({
    reducer: (current, update) => ({
      ...current,
      ...update,
      history: [...(current.history || []), ...(update.history || [])],
    }),
    default: () => ({ environment: 'development', version: '1.0', history: [] }),
  }),

  businessRules: Annotation<BusinessRule[]>({
    reducer: (current, updates) => {
      const existing = new Map(current.map((r) => [r.id, r]));
      updates.forEach((rule) => existing.set(rule.id, rule));
      return Array.from(existing.values());
    },
    default: () => [],
  }),
});
```

### Complete Production Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowState, WorkflowDefinition, WorkflowNode, Command, WorkflowStateAnnotation, createCustomStateAnnotation } from '@hive-academy/langgraph-core';

interface DocumentProcessingState extends WorkflowState {
  document: {
    id: string;
    content: string;
    metadata: Record<string, any>;
    processingSteps: string[];
    validationResults: ValidationResult[];
  };
  processingConfig: {
    requiresApproval: boolean;
    confidenceThreshold: number;
    validationRules: string[];
    outputFormat: 'json' | 'xml' | 'pdf';
  };
  businessContext: {
    department: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    complianceFlags: string[];
    approvers: string[];
  };
}

// Custom state annotation with business-specific reducers
const DocumentProcessingStateAnnotation = createCustomStateAnnotation({
  document: Annotation<DocumentProcessingState['document']>({
    reducer: (current, update) => ({
      ...current,
      ...update,
      processingSteps: [...(current.processingSteps || []), ...(update.processingSteps || [])],
      validationResults: [...(current.validationResults || []), ...(update.validationResults || [])],
    }),
    default: () => ({
      id: '',
      content: '',
      metadata: {},
      processingSteps: [],
      validationResults: [],
    }),
  }),

  processingConfig: Annotation<DocumentProcessingState['processingConfig']>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      requiresApproval: false,
      confidenceThreshold: 0.8,
      validationRules: ['format', 'content'],
      outputFormat: 'json',
    }),
  }),

  businessContext: Annotation<DocumentProcessingState['businessContext']>({
    reducer: (current, update) => ({
      ...current,
      ...update,
      complianceFlags: [...new Set([...(current.complianceFlags || []), ...(update.complianceFlags || [])])],
      approvers: [...new Set([...(current.approvers || []), ...(update.approvers || [])])],
    }),
    default: () => ({
      department: 'general',
      priority: 'medium',
      complianceFlags: [],
      approvers: [],
    }),
  }),
});

@Injectable()
export class EnterpriseDocumentWorkflowService {
  async createDocumentProcessingWorkflow(): Promise<WorkflowDefinition<DocumentProcessingState>> {
    return {
      name: 'enterprise-document-processing',
      description: 'Comprehensive document processing with compliance and approval workflows',
      channels: DocumentProcessingStateAnnotation,

      nodes: [
        {
          id: 'validate-input',
          name: 'Input Validation',
          description: 'Validate document format and content',
          handler: this.validateInput.bind(this),
          config: {
            timeout: 30000,
            retry: { maxAttempts: 3, delay: 1000 },
          },
        },
        {
          id: 'content-analysis',
          name: 'Content Analysis',
          description: 'Analyze document content and extract metadata',
          handler: this.analyzeContent.bind(this),
          config: {
            streaming: true,
            tools: ['nlp-processor', 'metadata-extractor'],
          },
        },
        {
          id: 'compliance-check',
          name: 'Compliance Verification',
          description: 'Check document against compliance rules',
          handler: this.checkCompliance.bind(this),
          config: {
            requiresApproval: true,
            approval: {
              threshold: 0.7,
              riskLevel: 'medium',
              condition: (state) => state.businessContext.complianceFlags.length > 0,
              message: (state) => `Compliance review needed: ${state.businessContext.complianceFlags.join(', ')}`,
            },
          },
        },
        {
          id: 'human-review',
          name: 'Human Review',
          description: 'Human oversight for high-risk documents',
          handler: this.humanReview.bind(this),
          config: {
            requiresApproval: true,
            approval: {
              threshold: 0.9,
              riskLevel: 'high',
              message: 'High-risk document requires human approval',
            },
          },
        },
        {
          id: 'generate-output',
          name: 'Output Generation',
          description: 'Generate final processed document',
          handler: this.generateOutput.bind(this),
          config: {
            streaming: true,
            timeout: 60000,
          },
        },
      ],

      edges: [
        { from: 'validate-input', to: 'content-analysis' },
        {
          from: 'content-analysis',
          to: {
            condition: (state) => {
              const hasComplianceFlags = state.businessContext.complianceFlags.length > 0;
              const isHighRisk = state.businessContext.priority === 'urgent';
              const needsHumanReview = state.confidence < 0.8 || isHighRisk;

              if (hasComplianceFlags) return 'compliance-required';
              if (needsHumanReview) return 'human-review-required';
              return 'can-process';
            },
            routes: {
              'compliance-required': 'compliance-check',
              'human-review-required': 'human-review',
              'can-process': 'generate-output',
            },
            default: 'human-review',
          },
        },
        {
          from: 'compliance-check',
          to: 'generate-output',
          config: {
            condition: (state) => state.approvalReceived === true,
            minConfidence: 0.7,
          },
        },
        {
          from: 'human-review',
          to: 'generate-output',
          config: {
            condition: (state) => state.humanFeedback?.approved === true,
          },
        },
      ],

      entryPoint: 'validate-input',
      config: {
        retry: { maxAttempts: 2, delay: 5000 },
        timeout: 300000, // 5 minutes total
      },
    };
  }

  private async validateInput(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> {
    const { document } = state;

    // Input validation logic
    const validationResults: ValidationResult[] = [];

    if (!document.content || document.content.trim().length === 0) {
      validationResults.push({
        rule: 'content-required',
        passed: false,
        message: 'Document content is required',
      });
    }

    if (document.content.length > 1000000) {
      // 1MB limit
      validationResults.push({
        rule: 'size-limit',
        passed: false,
        message: 'Document exceeds size limit',
      });
    }

    const hasErrors = validationResults.some((r) => !r.passed);

    if (hasErrors) {
      return {
        status: 'failed',
        error: {
          id: `validation-${Date.now()}`,
          nodeId: 'validate-input',
          type: 'validation',
          message: 'Document validation failed',
          isRecoverable: true,
          timestamp: new Date(),
          context: { validationResults },
        },
        document: {
          ...document,
          validationResults,
        },
      };
    }

    return {
      status: 'active',
      currentNode: 'validate-input',
      completedNodes: ['validate-input'],
      confidence: 1.0,
      document: {
        ...document,
        validationResults,
        processingSteps: ['validation-passed'],
      },
      timestamps: { ...state.timestamps, updated: new Date() },
    };
  }

  private async analyzeContent(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> {
    const { document, businessContext } = state;

    try {
      // Simulate content analysis
      const analysisResults = await this.performContentAnalysis(document.content);

      const complianceFlags = this.detectComplianceIssues(analysisResults);
      const confidenceScore = this.calculateConfidence(analysisResults);

      return {
        currentNode: 'content-analysis',
        completedNodes: ['content-analysis'],
        confidence: confidenceScore,
        document: {
          ...document,
          metadata: { ...document.metadata, ...analysisResults.metadata },
          processingSteps: [...document.processingSteps, 'content-analyzed'],
        },
        businessContext: {
          ...businessContext,
          complianceFlags: [...businessContext.complianceFlags, ...complianceFlags],
        },
        timestamps: { ...state.timestamps, updated: new Date() },
      };
    } catch (error) {
      return {
        status: 'failed',
        error: {
          id: `analysis-${Date.now()}`,
          nodeId: 'content-analysis',
          type: 'execution',
          message: error.message,
          isRecoverable: true,
          timestamp: new Date(),
        },
      };
    }
  }

  private async checkCompliance(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState> | Command> {
    const { document, businessContext } = state;

    const complianceScore = await this.evaluateCompliance(document, businessContext);

    if (complianceScore < 0.6) {
      return {
        type: 'error',
        error: new Error('Document fails compliance requirements'),
        reason: 'Compliance score below threshold',
      };
    }

    if (complianceScore < 0.8) {
      return {
        requiresApproval: true,
        waitingForApproval: true,
        metadata: {
          ...state.metadata,
          complianceScore,
          approvalReason: 'Low compliance score requires review',
        },
      };
    }

    return {
      currentNode: 'compliance-check',
      completedNodes: ['compliance-check'],
      confidence: Math.min(state.confidence, complianceScore),
      document: {
        ...document,
        processingSteps: [...document.processingSteps, 'compliance-verified'],
      },
    };
  }

  private async humanReview(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState> | Command> {
    // This would typically pause execution for human input
    // For demonstration, we'll simulate approval logic

    const riskScore = this.assessRisk(state);

    if (riskScore > 0.9) {
      return {
        type: 'goto',
        goto: 'human-review',
        reason: 'High risk requires additional review',
      };
    }

    return {
      currentNode: 'human-review',
      completedNodes: ['human-review'],
      humanFeedback: {
        approved: true,
        status: 'approved',
        confidence: state.confidence,
        timestamp: new Date(),
        metadata: { reviewer: 'system', riskScore },
      },
      approvalReceived: true,
    };
  }

  private async generateOutput(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> {
    const { document, processingConfig } = state;

    const output = await this.createOutput(document, processingConfig.outputFormat);

    return {
      status: 'completed',
      currentNode: 'generate-output',
      completedNodes: ['generate-output'],
      document: {
        ...document,
        processingSteps: [...document.processingSteps, 'output-generated'],
      },
      metadata: {
        ...state.metadata,
        output,
        outputFormat: processingConfig.outputFormat,
        processingComplete: true,
      },
      timestamps: {
        ...state.timestamps,
        updated: new Date(),
        completed: new Date(),
      },
    };
  }

  // Helper methods
  private async performContentAnalysis(content: string): Promise<any> {
    // Simulate analysis
    return {
      wordCount: content.split(' ').length,
      language: 'en',
      topics: ['business', 'compliance'],
      metadata: {
        complexity: content.length > 5000 ? 'high' : 'medium',
        readabilityScore: 0.8,
      },
    };
  }

  private detectComplianceIssues(analysis: any): string[] {
    const flags = [];
    if (analysis.topics.includes('financial')) flags.push('financial-review');
    if (analysis.topics.includes('legal')) flags.push('legal-review');
    return flags;
  }

  private calculateConfidence(analysis: any): number {
    return Math.min(0.95, 0.6 + analysis.metadata.readabilityScore * 0.4);
  }

  private async evaluateCompliance(document: any, context: any): Promise<number> {
    // Simulate compliance evaluation
    let score = 0.8;
    if (context.complianceFlags.length > 0) score -= 0.2;
    if (context.priority === 'urgent') score -= 0.1;
    return Math.max(0.1, score);
  }

  private assessRisk(state: DocumentProcessingState): number {
    let risk = 0.3;
    if (state.businessContext.priority === 'urgent') risk += 0.3;
    if (state.businessContext.complianceFlags.length > 2) risk += 0.4;
    if (state.confidence < 0.7) risk += 0.3;
    return Math.min(1.0, risk);
  }

  private async createOutput(document: any, format: string): Promise<any> {
    return {
      format,
      content: `Processed document ${document.id}`,
      timestamp: new Date(),
      size: document.content.length,
    };
  }
}

interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
  details?: any;
}
```

## Configuration

### Basic Configuration

```typescript
CoreModule.forRoot({
  stateManagement: {
    immutable: true,
    deepMerge: true,
  },
  checkpointing: {
    enabled: false,
  },
});
```

### Production Configuration

```typescript
CoreModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    stateManagement: {
      immutable: configService.get('STATE_IMMUTABLE', true),
      deepMerge: configService.get('STATE_DEEP_MERGE', true),
      persistence: {
        enabled: configService.get('STATE_PERSISTENCE_ENABLED', true),
        storageKey: configService.get('STATE_STORAGE_KEY', 'workflow_state'),
        ttl: configService.get('STATE_TTL', 3600000), // 1 hour
        compression: configService.get('STATE_COMPRESSION', true),
      },
    },
    checkpointing: {
      enabled: configService.get('CHECKPOINTING_ENABLED', true),
      adapter: configService.get('CHECKPOINT_ADAPTER', 'postgres'),
      cleanupInterval: configService.get('CHECKPOINT_CLEANUP_INTERVAL', 86400000),
      retention: configService.get('CHECKPOINT_RETENTION_DAYS', 30),
    },
    errorHandling: {
      enableRecovery: configService.get('ERROR_RECOVERY_ENABLED', true),
      maxRetries: configService.get('MAX_RETRIES', 3),
      backoffStrategy: configService.get('BACKOFF_STRATEGY', 'exponential'),
    },
  }),
  inject: [ConfigService],
});
```

## Advanced Features

### Custom State Annotations

```typescript
// Business-specific state with custom reducers
const BusinessWorkflowState = createCustomStateAnnotation({
  // Complex object with merge strategy
  customerData: Annotation<CustomerInfo>({
    reducer: (current, update) => ({
      ...current,
      ...update,
      // Preserve contact history
      contacts: [...(current.contacts || []), ...(update.contacts || [])],
      // Update preferences with deep merge
      preferences: { ...current.preferences, ...update.preferences },
    }),
    default: () => ({ id: '', contacts: [], preferences: {} }),
  }),

  // Array with deduplication
  businessRules: Annotation<BusinessRule[]>({
    reducer: (current, updates) => {
      const ruleMap = new Map([...current, ...updates].map((rule) => [rule.id, rule]));
      return Array.from(ruleMap.values()).sort((a, b) => b.priority - a.priority);
    },
    default: () => [],
  }),

  // Audit trail with immutable history
  auditTrail: Annotation<AuditEntry[]>({
    reducer: (current, newEntries) => [
      ...current,
      ...newEntries.map((entry) => ({
        ...entry,
        timestamp: new Date(),
        id: `audit_${Date.now()}_${Math.random()}`,
      })),
    ],
    default: () => [],
  }),
});
```

### Workflow Commands & Control Flow

```typescript
@Injectable()
export class CommandFlowService {
  async handleConditionalFlow(state: WorkflowState): Promise<Partial<WorkflowState> | Command> {
    // Simple state update
    if (state.confidence > 0.9) {
      return { status: 'completed', currentNode: 'success' };
    }

    // Navigation command
    if (state.confidence < 0.5) {
      return {
        type: 'goto',
        goto: 'human-review',
        reason: 'Low confidence requires human review',
      };
    }

    // Retry command with backoff
    if (state.retryCount < 3) {
      return {
        type: 'retry',
        retry: { node: 'processing', delay: Math.pow(2, state.retryCount) * 1000 },
        maxAttempts: 3,
        reason: 'Temporary failure, retrying with backoff',
      };
    }

    // Error command
    return {
      type: 'error',
      error: new Error('Max retries exceeded'),
      reason: 'Unable to complete processing after 3 attempts',
    };
  }

  async handleWorkflowOrchestration(state: WorkflowState): Promise<Command> {
    const workflowType = state.metadata?.workflowType;

    // Dynamic workflow selection
    switch (workflowType) {
      case 'fast-track':
        return {
          type: 'update',
          update: {
            nextNode: 'fast-processing',
            metadata: { ...state.metadata, processingMode: 'fast' },
          },
          reason: 'Fast-track processing selected',
        };

      case 'comprehensive':
        return {
          type: 'goto',
          goto: 'detailed-analysis',
          params: { analysisLevel: 'deep', includeCompliance: true },
          reason: 'Comprehensive analysis required',
        };

      case 'emergency':
        return {
          type: 'update',
          update: {
            status: 'active',
            currentNode: 'emergency-handler',
            metadata: {
              ...state.metadata,
              priority: 'critical',
              escalated: true,
              escalationTime: new Date(),
            },
          },
          priority: 'critical',
          reason: 'Emergency workflow activated',
        };

      default:
        return {
          type: 'goto',
          goto: 'standard-processing',
          reason: 'Default processing path',
        };
    }
  }
}
```

## Core Interfaces Reference

### Primary Types

```typescript
// State management
interface WorkflowState {
  /* comprehensive state interface */
}
interface BaseWorkflowState {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
interface StateManager<TState> {
  /* state management operations */
}

// Workflow definition
interface WorkflowDefinition<TState> {
  name: string;
  nodes: WorkflowNode<TState>[];
  edges: WorkflowEdge<TState>[];
}
interface WorkflowNode<TState> {
  id: string;
  handler: (state: TState) => Promise<Partial<TState> | Command>;
}
interface WorkflowEdge<TState> {
  from: string;
  to: string | ConditionalRouting<TState>;
}

// Commands and control
interface Command<TState> {
  type: 'goto' | 'update' | 'end' | 'error' | 'retry' | 'skip' | 'stop';
}
interface ConditionalRouting<TState> {
  condition: (state: TState) => string | null;
  routes: Record<string, string>;
}

// Error handling
interface WorkflowError {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
}
interface WorkflowExecutionError {
  id: string;
  nodeId: string;
  type: string;
  message: string;
  isRecoverable: boolean;
}
```

## Error Handling

```typescript
import { WorkflowError, WorkflowExecutionError, Command } from '@hive-academy/langgraph-core';

@Injectable()
export class RobustWorkflowService {
  async safeNodeExecution<TState extends WorkflowState>(handler: (state: TState) => Promise<Partial<TState> | Command>, state: TState, nodeId: string): Promise<Partial<TState> | Command> {
    try {
      return await handler(state);
    } catch (error) {
      const workflowError: WorkflowExecutionError = {
        id: `error_${nodeId}_${Date.now()}`,
        nodeId,
        type: this.classifyError(error),
        message: error.message,
        stackTrace: error.stack,
        isRecoverable: this.isRecoverableError(error),
        timestamp: new Date(),
        context: { nodeId, executionId: state.executionId },
      };

      // Return error command for workflow handling
      return {
        type: 'error',
        error: workflowError,
        reason: `Node ${nodeId} execution failed: ${error.message}`,
      };
    }
  }

  private classifyError(error: Error): string {
    if (error.name === 'ValidationError') return 'validation';
    if (error.name === 'TimeoutError') return 'timeout';
    if (error.message.includes('permission')) return 'permission';
    return 'execution';
  }

  private isRecoverableError(error: Error): boolean {
    // Network errors are typically recoverable
    if (error.name === 'NetworkError') return true;
    // Validation errors might be recoverable with different input
    if (error.name === 'ValidationError') return true;
    // Permission errors usually aren't recoverable
    if (error.message.includes('permission')) return false;
    // Default to recoverable
    return true;
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { CoreModule, WorkflowStateAnnotation } from '@hive-academy/langgraph-core';

describe('CoreModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({
          stateManagement: { immutable: true },
          checkpointing: { enabled: false },
        }),
      ],
    }).compile();
  });

  it('should provide WorkflowStateAnnotation', () => {
    expect(WorkflowStateAnnotation).toBeDefined();
    expect(WorkflowStateAnnotation.spec.executionId).toBeDefined();
    expect(WorkflowStateAnnotation.spec.status).toBeDefined();
  });

  it('should handle state reduction correctly', () => {
    const initialState = WorkflowStateAnnotation.spec.completedNodes.default();
    const updatedState = WorkflowStateAnnotation.spec.completedNodes.reducer(initialState, ['node1', 'node2']);

    expect(updatedState).toEqual(['node1', 'node2']);

    // Test deduplication
    const dedupedState = WorkflowStateAnnotation.spec.completedNodes.reducer(updatedState, ['node2', 'node3']);

    expect(dedupedState).toEqual(['node1', 'node2', 'node3']);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. State Annotation Reducer Conflicts

```typescript
// Problem: State not merging correctly
// Solution: Implement proper reducers
const CustomState = createCustomStateAnnotation({
  complexData: Annotation<ComplexType>({
    reducer: (current, update) => {
      // Deep merge with conflict resolution
      return {
        ...current,
        ...update,
        // Handle array fields specially
        items: [...new Set([...(current.items || []), ...(update.items || [])])],
        // Handle nested objects
        config: { ...current.config, ...update.config },
      };
    },
    default: () => ({ items: [], config: {} }),
  }),
});
```

#### 2. Command Execution Not Working

```typescript
// Problem: Commands not being processed
// Solution: Ensure proper Command interface usage
const validCommand: Command = {
  type: 'goto',
  goto: 'target-node',
  reason: 'Clear reason for routing',
  metadata: { source: 'current-node' },
  priority: 'medium',
  timestamp: new Date(),
};
```

#### 3. Memory Leaks in Long-Running Workflows

```typescript
// Solution: Implement state cleanup and weak references
CoreModule.forRoot({
  stateManagement: {
    persistence: {
      enabled: true,
      ttl: 3600000, // 1 hour cleanup
      compression: true, // Reduce memory footprint
    },
  },
  checkpointing: {
    cleanupInterval: 1800000, // 30 minutes
    retention: 7, // days
  },
});
```

This foundational core module provides the essential building blocks for creating sophisticated LangGraph workflows with type safety, robust state management, and comprehensive error handling in enterprise NestJS applications.
