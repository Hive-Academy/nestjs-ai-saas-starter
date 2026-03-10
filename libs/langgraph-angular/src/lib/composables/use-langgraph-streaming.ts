import { inject } from '@angular/core';

import { LangGraphStreamingService } from '../services/langgraph-streaming.service';

/**
 * Composable for LangGraph token/message streaming state.
 *
 * @remarks
 * Provides convenient access to real-time LLM streaming signals
 * by delegating to the injected `LangGraphStreamingService`.
 *
 * Must be called within an Angular injection context (constructor,
 * field initializer, or `runInInjectionContext`).
 *
 * @returns Readonly object with streaming state signals
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-chat',
 *   template: `
 *     @if (streaming.isStreaming()) {
 *       <p>{{ streaming.currentStreamingText() }}</p>
 *       <span>Tokens: {{ streaming.tokenCount() }}</span>
 *     }
 *   `,
 * })
 * export class ChatComponent {
 *   readonly streaming = useLangGraphStreaming();
 * }
 * ```
 *
 * @public
 */
export function useLangGraphStreaming() {
  const streamingService = inject(LangGraphStreamingService);

  return {
    /** Whether the service is actively streaming tokens. */
    isStreaming: streamingService.isStreaming,
    /** The complete accumulated streaming text from all tokens. */
    currentStreamingText: streamingService.currentStreamingText,
    /** All streaming messages grouped by node, with completion state. */
    streamingMessages: streamingService.streamingMessages,
    /** Total character count of the accumulated streaming text. */
    tokenCount: streamingService.tokenCount,
  } as const;
}
