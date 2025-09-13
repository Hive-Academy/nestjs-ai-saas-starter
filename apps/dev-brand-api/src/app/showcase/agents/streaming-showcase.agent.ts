import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { StreamAll, StreamEventType } from '@hive-academy/langgraph-streaming';
import { HumanMessage } from '@langchain/core/messages';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * 🌊 STREAMING SHOWCASE AGENT - ZERO-CONFIG STREAMING
 *
 * Demonstrates zero-config streaming - from complex configuration objects
 * to simple @Agent() and @StreamAll() decorators.
 *
 * BEFORE: 39+ lines of complex streaming configuration
 * AFTER: 2 simple decorators - 95% reduction!
 */
@Agent()
@Injectable()
export class StreamingShowcaseAgent {
  @StreamAll()
  async nodeFunction(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log(
      '🌊 Streaming Showcase Agent demonstrating all streaming capabilities...'
    );

    // Simulate streaming demonstration
    await this.demonstrateTokenStreaming();
    await this.demonstrateEventStreaming();
    await this.demonstrateProgressStreaming();

    return {
      ...state,
      currentAgentId: 'streaming-showcase',
      messages: [
        ...state.messages,
        new HumanMessage('Streaming capabilities demonstrated successfully'),
      ],
    };
  }

  private async demonstrateTokenStreaming() {
    console.log('  🎯 Demonstrating token streaming...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  private async demonstrateEventStreaming() {
    console.log('  📡 Demonstrating event streaming...');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  private async demonstrateProgressStreaming() {
    console.log('  📊 Demonstrating progress streaming...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
