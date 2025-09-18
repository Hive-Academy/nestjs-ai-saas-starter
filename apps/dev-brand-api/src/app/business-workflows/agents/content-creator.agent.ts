import { Injectable } from '@nestjs/common';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { AgentState } from '@hive-academy/langgraph-multi-agent';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

@Agent({
  id: 'content-creator',
  name: 'Content Creator',
  capabilities: [
    'content-generation',
    'platform-optimization',
    'engagement-analysis',
  ],
  tools: [
    'linkedin-formatter',
    'devto-formatter',
    'content-optimizer',
    'quality-scorer',
  ],
  priority: 'high',
  executionTime: 'medium',
})
@Injectable()
export class ContentCreatorAgent {
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
    try {
      const voice = await this.memory.getBrandVoice(githubUsername);
      const strategy = state.metadata?.brandStrategy as any;
      const model = await this.llm.getLLM({ temperature: 0.6, maxTokens: 900 });
      const linkedinPrompt = `Create a concise LinkedIn style post for ${githubUsername} referencing ${achievements.length} achievements. Tone: ${voice.tone}`;
      const devtoPrompt = `Create a short dev.to style article intro for ${githubUsername}. Strategy: ${
        strategy?.positioning || ''
      }`;
      const [li, dev] = await Promise.all([
        model.invoke([{ role: 'user', content: linkedinPrompt }]),
        model.invoke([{ role: 'user', content: devtoPrompt }]),
      ]);
      const linkedin = li.content.toString();
      const devto = dev.content.toString();
      return {
        messages: [
          new AIMessage(
            `LinkedIn Post:\n${linkedin}\n\nDev.to Article Intro:\n${devto}`
          ),
        ],
        metadata: {
          ...state.metadata,
          contentCreated: true,
          linkedinContent: linkedin,
          devtoContent: devto,
          finalStage: true,
        },
        next: undefined,
      };
    } catch (e) {
      return {
        messages: [new AIMessage(`Fallback content for ${githubUsername}`)],
        metadata: {
          ...state.metadata,
          contentCreated: true,
          mode: 'template-fallback',
          finalStage: true,
        },
        next: undefined,
      };
    }
  }
}
