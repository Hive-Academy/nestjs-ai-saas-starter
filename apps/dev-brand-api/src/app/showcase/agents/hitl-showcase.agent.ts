import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import {
  StreamEvent,
  StreamEventType,
} from '@hive-academy/langgraph-streaming';
import { HumanMessage } from '@langchain/core/messages';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * ✅ HITL SHOWCASE AGENT - ZERO-CONFIG HUMAN-IN-THE-LOOP
 *
 * Demonstrates zero-config HITL patterns - complex approval configurations
 * simplified to single decorators.
 *
 * BEFORE: 35+ lines of approval configuration
 * AFTER: 3 simple decorators - 92% reduction!
 */
@Agent()
@Injectable()
export class HitlShowcaseAgent {
  @RequiresApproval()
  @StreamEvent()
  async nodeFunction(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('✅ HITL Showcase Agent demonstrating approval workflows...');

    // Simulate HITL processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
      ...state,
      currentAgentId: 'hitl-showcase',
      messages: [
        ...state.messages,
        new HumanMessage('Human-in-the-loop workflow demonstrated'),
      ],
    };
  }
}
