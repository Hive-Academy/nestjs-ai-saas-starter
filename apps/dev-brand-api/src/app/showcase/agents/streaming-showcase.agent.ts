import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { StreamAll, StreamEventType } from '@hive-academy/langgraph-streaming';
import { HumanMessage } from '@langchain/core/messages';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * 🌊 STREAMING SHOWCASE AGENT - Real-time Communication Specialist
 *
 * This agent is the ultimate demonstration of streaming capabilities,
 * showcasing ALL streaming decorators with sophisticated real-time features.
 */
@Agent({
  id: 'streaming-showcase',
  name: 'Streaming Showcase Agent',
  description:
    'Ultimate demonstration of real-time streaming capabilities with token, event, and progress streaming',

  tools: ['stream-processor', 'real-time-analyzer', 'buffer-manager'],
  capabilities: ['streaming'],
  priority: 'high',
  executionTime: 'medium',

  systemPrompt: `You are the Streaming Showcase Agent, the ultimate demonstration of real-time communication.
  You excel at token-level streaming, event broadcasting, and progress tracking with sophisticated buffering.`,

  metadata: {
    version: '1.0.0',
    category: 'streaming-demonstration',
    streamingCapabilities: ['token', 'event', 'progress', 'combined'],
    decoratorsUsed: [
      '@Agent',
      '@StreamToken',
      '@StreamEvent',
      '@StreamProgress',
      '@StreamAll',
    ],
  },
})
@Injectable()
export class StreamingShowcaseAgent {
  @StreamAll({
    token: { enabled: true, format: 'text', bufferSize: 25 },
    event: {
      events: [StreamEventType.VALUES, StreamEventType.UPDATES],
      bufferSize: 50,
    },
    progress: { enabled: true, granularity: 'fine' },
  })
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
