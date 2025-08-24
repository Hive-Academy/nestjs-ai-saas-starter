// =============================================================================
// Main NestJS LangGraph Library - Primary Entry Point
// =============================================================================

// Core module and configuration
export * from './lib/nestjs-langgraph.module';
export * from './lib/constants';

// Orchestration layer - main library's core responsibility
export * from './lib/providers';

// Adapters for child module integration
export * from './lib/adapters';

export type * from './lib/interfaces/module-options.interface'

// =============================================================================
// Note on Child Module Imports
// =============================================================================
// Child modules should be imported directly from their respective packages
// to avoid export conflicts. For example:
//
// import { MultiAgentCoordinatorService } from '@langgraph-modules/multi-agent';
// import { MemoryFacadeService } from '@langgraph-modules/memory';
// import { CheckpointManagerService } from '@langgraph-modules/checkpoint';
//
// This ensures clean module boundaries and avoids symbol collisions.
// =============================================================================
