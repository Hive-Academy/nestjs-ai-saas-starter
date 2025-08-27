// =============================================================================
// Main NestJS LangGraph Library - Primary Entry Point
// =============================================================================

// Core module and configuration
export * from './lib/nestjs-langgraph.module';
export * from './lib/constants';

// Orchestration layer - main library's core responsibility
export * from './lib/providers';

// Adapters removed - child modules work directly through module loading

// Memory architecture consolidation - REMOVED: Memory functionality moved to @hive-academy/nestjs-memory

export type * from './lib/interfaces/module-options.interface';

// =============================================================================
// Note on Child Module Imports
// =============================================================================
// Child modules should be imported directly from their respective packages
// to avoid export conflicts. For example:
//
// import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
// import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';
//
// This ensures clean module boundaries and avoids symbol collisions.
// =============================================================================
