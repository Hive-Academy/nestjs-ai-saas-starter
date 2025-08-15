// =============================================================================
// Main NestJS LangGraph Library - Primary Entry Point
// =============================================================================

// Core module and configuration
export * from './lib/nestjs-langgraph.module';
export * from './lib/constants';

// Core interfaces (orchestration layer only)
export * from './lib/interfaces';

// Orchestration layer - main library's core responsibility
export * from './lib/providers';
export * from './lib/routing/workflow-routing.service';
export * from './lib/routing/command-processor.service';
export * from './lib/core/workflow-graph-builder.service';

// Adapters for child module integration
export * from './lib/adapters';

// =============================================================================
// Child Module Re-exports - Convenience Access
// =============================================================================

// Note: Child modules are available for direct import but also re-exported here for convenience
// Users can import from '@anubis/nestjs-langgraph' or directly from specific child modules

// Multi-Agent System - Tools, Agents, and Coordination
export * from '@langgraph-modules/multi-agent';

// Functional API - Decorators, Workflows, and Functional Patterns
export * from '@langgraph-modules/functional-api';

// Human-in-the-Loop (HITL) - Human Approval and Interaction
export * from '@langgraph-modules/hitl';

// Streaming - Real-time Data Flow and Events
export * from '@langgraph-modules/streaming';

// Workflow Engine - Core Execution and Graph Building
export * from '@langgraph-modules/workflow-engine';

// =============================================================================
// Additional LangGraph Modules (Optional)
// =============================================================================

// Memory - Contextual memory management (if installed)
export * from '@langgraph-modules/memory';

// Checkpoint - Advanced state persistence (if installed)
export * from '@langgraph-modules/checkpoint';

// Platform - LangGraph Platform integration (if installed)
export * from '@langgraph-modules/platform';

// Time Travel - Workflow debugging and history (if installed)
export * from '@langgraph-modules/time-travel';

// Monitoring - Production observability (if installed)
export * from '@langgraph-modules/monitoring';