/**
 * @file LangGraph Streaming Utilities
 * @description Production-ready utilities for handling LangGraph streams
 *
 * EXPORTS:
 * - Types: LangGraph stream event types
 * - Parser: Defensive stream chunk parser
 * - Transformer: Business logic event mapper
 *
 * USAGE PATTERN:
 * ```typescript
 * import { StreamEventParser, StreamEventTransformer } from '@hive-academy/langgraph-workflow-engine/streaming';
 *
 * const parser = new StreamEventParser();
 * const transformer = new StreamEventTransformer();
 *
 * for await (const chunk of langGraphStream) {
 *   const parsed = parser.parseChunk(chunk);
 *   if (parsed && !parser.shouldSkipEvent(parsed)) {
 *     const domainEvent = transformer.transformToDomainEvent(parsed, executionId);
 *     // Handle domain event
 *   }
 * }
 * ```
 */

// Types
export * from './types/stream-event.types';

// Parser
export { StreamEventParser } from './parsers/stream-event.parser';

// Transformer
export {
  StreamEventTransformer,
  type WorkflowUpdateEvent,
  type ToolExecutionEvent,
  type MessageStreamEvent,
  type CustomStreamEvent,
  type DebugStreamEvent,
  type DomainStreamEvent,
} from './transformers/stream-event.transformer';
