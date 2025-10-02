# @hive-academy/langgraph-core

> **Foundation Types & Interfaces for Enterprise LangGraph Workflows**

A TypeScript-first library providing type-safe foundations for building production-grade AI workflows with LangGraph. Enables rapid development of sophisticated AI applications with full type safety and integration patterns.

## 🚀 Business Value

- **⚡ Rapid Development**: Pre-built state annotations and interfaces eliminate boilerplate
- **🛡️ Type Safety**: Comprehensive TypeScript interfaces prevent runtime errors
- **🔗 Ecosystem Integration**: Foundation for 13+ specialized LangGraph modules
- **📈 Scalable Architecture**: Supports simple workflows to complex multi-agent systems
- **🏭 Production Ready**: Zero-overhead adapters and enterprise patterns

## 🎯 Who Should Use This

- **AI Application Developers** building LangGraph workflows
- **Enterprise Teams** requiring type-safe AI infrastructure
- **Startups** needing rapid AI product development
- **Platform Engineers** building AI-powered SaaS applications

## 📦 Installation

```bash
npm install @hive-academy/langgraph-core
```

## ⚡ Quick Start

```typescript
import { WorkflowState, WorkflowDefinition, WorkflowStateAnnotation } from '@hive-academy/langgraph-core';

// 1. Define your AI workflow state
interface AIWorkflowState extends WorkflowState {
  userQuery: string;
  aiResponse?: string;
  confidence: number;
}

// 2. Create type-safe workflow
const aiWorkflow: WorkflowDefinition<AIWorkflowState> = {
  name: 'ai-assistant',
  channels: WorkflowStateAnnotation,
  nodes: [
    {
      id: 'process',
      name: 'AI Processing',
      handler: async (state) => ({
        aiResponse: await processWithAI(state.userQuery),
        confidence: 0.95,
        status: 'completed',
      }),
    },
  ],
  edges: [{ from: 'process', to: 'end' }],
  entryPoint: 'process',
};

// 3. Ready for execution with workflow-engine!
```

## 🏗️ Ecosystem Architecture

The core module serves as the foundation for a comprehensive AI development ecosystem:

```
┌─────────────────────────────────────────────────────────────┐
│                    🏭 Production Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Monitoring  │ │ Time-Travel │ │      Platform           │ │
│  │ Observatory │ │ Debugging   │ │   LangGraph Cloud       │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   🤖 Agent Coordination                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │Multi-Agent  │ │Functional   │ │         HITL            │ │
│  │Coordination │ │   API       │ │  Human-in-the-Loop      │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  ⚡ Orchestration Layer                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Workflow    │ │  Streaming  │ │       Memory            │ │
│  │  Engine     │ │ Real-time   │ │   Context Mgmt          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   🗄️ Data Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ ChromaDB    │ │   Neo4j     │ │      Checkpoint         │ │
│  │Vector Store │ │Graph Store  │ │   State Persistence     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│            🏛️ CORE FOUNDATION (This Module)                │
│   Type-Safe Interfaces • State Annotations • Adapters     │
└─────────────────────────────────────────────────────────────┘
```

## 🔗 Integration Patterns

### 1. **Rapid AI Development** (Most Common)

```typescript
// Core → Workflow-Engine → Streaming
import { WorkflowDefinition } from '@hive-academy/langgraph-core';
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';
import { TokenStreamingService } from '@hive-academy/langgraph-streaming';

// Build real-time AI workflows in minutes
```

### 2. **Enterprise AI Systems**

```typescript
// Core → Multi-Agent → HITL → Monitoring
import { WorkflowState } from '@hive-academy/langgraph-core';
import { MultiAgentCoordinator } from '@hive-academy/langgraph-multi-agent';
import { HumanApprovalService } from '@hive-academy/langgraph-hitl';

// Build enterprise-grade AI with human oversight
```

### 3. **AI Data Applications**

```typescript
// Core → ChromaDB → Neo4j → Memory
import { createCustomStateAnnotation } from '@hive-academy/langgraph-core';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';

// Build intelligent data processing pipelines
```

## 📋 Core Capabilities

### **State Management**

- **WorkflowState**: Comprehensive state interface for all workflows
- **State Annotations**: LangGraph-compatible with intelligent reducers
- **Custom States**: Type-safe extensions for domain-specific needs

### **Workflow Definitions**

- **Type-Safe Workflows**: Strongly typed node and edge definitions
- **Command Patterns**: Sophisticated control flow and routing
- **Conditional Logic**: Dynamic workflow paths based on state

### **Integration Adapters**

- **Checkpoint Adapters**: State persistence abstraction
- **Streaming Interfaces**: Real-time processing integration
- **Memory Adapters**: Context management integration
- **NoOp Implementations**: Zero-overhead when features disabled

## 🛠️ Key Exports

### **Essential Types**

```typescript
// Workflow structure
export type { WorkflowState, WorkflowDefinition, WorkflowNode, Command };

// State management
export type { StateManager, StateTransformer, WorkflowError };

// Configuration
export type { LangGraphModuleOptions, WorkflowNodeConfig };
```

### **Runtime Functions**

```typescript
// State annotations
export { WorkflowStateAnnotation, createCustomStateAnnotation };

// Utilities
export { generateNodeId, generateExecutionId, isWorkflow };

// Integration adapters
export { ICheckpointAdapter, IStreamingService, IMemoryAdapter };
```

## 🚀 Usage Examples

### **Basic AI Workflow**

```typescript
import { WorkflowStateAnnotation, WorkflowDefinition } from '@hive-academy/langgraph-core';

const workflow: WorkflowDefinition = {
  name: 'ai-assistant',
  channels: WorkflowStateAnnotation,
  nodes: [
    /* AI processing nodes */
  ],
  edges: [
    /* workflow routing */
  ],
  entryPoint: 'start',
};
```

### **Custom State with Business Logic**

```typescript
import { createCustomStateAnnotation } from '@hive-academy/langgraph-core';

const BusinessWorkflowState = createCustomStateAnnotation({
  customerData: {
    default: () => ({ id: '', preferences: {} }),
    reducer: (current, update) => ({ ...current, ...update }),
  },
  businessRules: {
    default: [],
    reducer: (current, rules) => [...current, ...rules],
  },
});
```

### **Command-Based Control Flow**

```typescript
async function smartRouter(state: WorkflowState): Promise<Command> {
  if (state.confidence < 0.5) {
    return { type: 'goto', goto: 'human-review' };
  }
  return { type: 'end', reason: 'High confidence completion' };
}
```

## 🏭 Production Features

- **Zero Runtime Overhead**: Type-only library with minimal runtime exports
- **Enterprise Integration**: Ready for complex business workflows
- **Error Recovery**: Comprehensive error interfaces and recovery patterns
- **Human Oversight**: Built-in approval and feedback mechanisms
- **Monitoring Ready**: Structured for observability and debugging

## 📚 Module Ecosystem

| Module              | Purpose              | Integration Point                    |
| ------------------- | -------------------- | ------------------------------------ |
| **workflow-engine** | Workflow execution   | Uses core types for execution        |
| **streaming**       | Real-time processing | Implements core streaming interfaces |
| **multi-agent**     | Agent coordination   | Extends core state for agents        |
| **memory**          | Context management   | Implements core memory interfaces    |
| **hitl**            | Human oversight      | Uses core approval patterns          |
| **monitoring**      | Observability        | Monitors core state changes          |
| **chromadb**        | Vector storage       | Integrates with core workflow state  |
| **neo4j**           | Graph storage        | Stores workflow relationships        |

## 🎯 Next Steps

1. **Start Simple**: Use with `@hive-academy/langgraph-workflow-engine` for basic execution
2. **Add Intelligence**: Integrate `@hive-academy/langgraph-streaming` for real-time AI
3. **Scale Up**: Add `@hive-academy/langgraph-multi-agent` for complex coordination
4. **Go Enterprise**: Include `@hive-academy/langgraph-monitoring` for production

## 📖 Documentation

- **[Core Documentation](./CLAUDE.md)** - Complete implementation guide
- **[Workflow Engine](../workflow-engine/CLAUDE.md)** - Execution patterns
- **[Ecosystem Overview](../../CLAUDE.md)** - Full module ecosystem

## 🏷️ Version

**v0.0.1** - Foundation release with complete TypeScript interfaces and state management patterns.

---

**Built for Enterprise AI Development** | **Type-Safe by Design** | **Production Ready**
