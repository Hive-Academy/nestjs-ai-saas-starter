import { Injectable } from '@nestjs/common';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { AgentState } from '@hive-academy/langgraph-multi-agent';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

@Agent({
  id: 'personal-brand-strategist',
  name: 'Personal Brand Strategist',
  capabilities: ['brand-analysis', 'strategic-positioning', 'career-guidance'],
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  priority: 'high',
  executionTime: 'medium',
})
@Injectable()
export class PersonalBrandStrategistAgent {
  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService
  ) {}

  @StreamProgress({ enabled: true, includeETA: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    const githubUsername =
      (state.metadata?.githubUsername as string) || 'developer';
    const achievements = (state.metadata?.achievements as any[]) || [];
    const githubData = state.metadata?.githubData;
    try {
      const devContext = await this.memory.getDevContext(githubUsername);
      const brandEvolution = await this.memory.getBrandEvolution(
        githubUsername
      );
      const brandVoice = await this.memory.getBrandVoice(githubUsername);
      const primaryTech = Array.isArray(
        (githubData as any)?.patterns?.primaryLanguages
      )
        ? (githubData as any).patterns.primaryLanguages.join(', ')
        : '';
      const prompt = `Create concise brand positioning for ${githubUsername}. Achievements: ${achievements.length}. Primary tech: ${primaryTech}`;
      const model = await this.llm.getLLM({ temperature: 0.5, maxTokens: 800 });
      const response = await model.invoke([{ role: 'user', content: prompt }]);
      const strategy = response.content.toString();
      return {
        messages: [new AIMessage(strategy)],
        metadata: {
          ...state.metadata,
          brandStrategyCompleted: true,
          brandStrategy: {
            positioning: strategy,
            createdAt: new Date().toISOString(),
          },
          memoryContext: devContext,
          brandEvolution,
          brandVoice,
        },
        next: 'content-creator',
        task: 'Create content from brand strategy',
      };
    } catch (e) {
      return {
        messages: [
          new AIMessage(`Fallback brand strategy for ${githubUsername}`),
        ],
        metadata: { ...state.metadata, brandStrategyCompleted: true },
        next: 'content-creator',
      };
    }
  }
}
