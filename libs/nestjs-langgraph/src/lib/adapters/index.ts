/**
 * Adapter exports for clean integration with enterprise modules
 * 
 * These adapters follow the Adapter pattern to bridge the main NestJS LangGraph
 * library with specialized enterprise modules while maintaining backward compatibility.
 */

export { CheckpointAdapter, createCheckpointProvider } from './checkpoint.adapter';
export { MemoryAdapter, type MemoryConfig } from './memory.adapter';
export { MultiAgentAdapter, type MultiAgentConfig, type MultiAgentResult } from './multi-agent.adapter';

// Re-export for backward compatibility
export { CheckpointAdapter as CheckpointProvider } from './checkpoint.adapter';
export { MemoryAdapter as MemoryProvider } from './memory.adapter';
export { MultiAgentAdapter as MultiAgentCoordinator } from './multi-agent.adapter';