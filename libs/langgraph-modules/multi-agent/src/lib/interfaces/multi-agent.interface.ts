/**
 * Multi-Agent Module - Main Interface File
 *
 * This file provides centralized exports for all multi-agent types.
 * Types are now organized into focused files for better maintainability.
 *
 * REFACTORED (2025): Previously 1068 lines - now split into:
 * - agent.types.ts - Core agent interfaces and state
 * - handoff.types.ts - Handoff tool types (created by agent.types.ts)
 * - routing.types.ts - Routing decision types
 * - topology/*.types.ts - Pattern-specific configurations
 * - network.types.ts - Network and result types
 * - workflow.types.ts - Workflow definitions
 * - module-options.types.ts - Module configuration
 * - constants.ts - Shared constants
 * - errors.ts - Error classes
 * - validation/*.schemas.ts - Zod validation schemas
 */

// Core Agent Types
export type * from './agent.types';

// Routing Types
export type * from './routing.types';

// Topology Configuration Types
export type * from './topology';

// Network Types
export type * from './network.types';

// Workflow Types
export * from './workflow.types';

// Module Configuration Types
export type * from './module-options.types';

// Constants
export * from './constants';

// Error Classes
export * from './errors';

// Validation Schemas
export * from './validation';
