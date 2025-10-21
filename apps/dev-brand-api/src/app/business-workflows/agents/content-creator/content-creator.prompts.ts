/**
 * Content Creator Agent - LLM Prompt Builders
 *
 * This file contains all prompt templates and builders for the
 * Content Creator agent to keep the main agent file clean.
 */

import type {
  Achievement,
  BrandVoice,
  BrandStrategy,
} from '../shared/agent.types';

/**
 * Build sophisticated LinkedIn prompt with brand context
 */
export function buildLinkedInPrompt(
  username: string,
  achievements: Achievement[],
  brandVoice: BrandVoice,
  brandStrategy: BrandStrategy
): string {
  return `Create a compelling LinkedIn post for ${username} that showcases their professional achievements.

CONTEXT:
- Developer: ${username}
- Brand Voice: ${brandVoice.tone || 'professional'} tone, ${
    brandVoice.style || 'technical'
  } style
- Brand Strategy: ${brandStrategy.positioning || 'Technical Excellence'}
- Achievements: ${achievements.length} technical accomplishments

KEY ACHIEVEMENTS TO HIGHLIGHT:
${achievements
  .slice(0, 3)
  .map(
    (a, i) =>
      `${i + 1}. ${a.description || a.title || 'Technical achievement'} (${
        a.impact || 'high'
      } impact)`
  )
  .join('\n')}

REQUIREMENTS:
- Professional tone matching brand voice
- Include relevant hashtags (3-5)
- Call-to-action for engagement
- 150-300 words
- Focus on business value and impact
- Use first person perspective

Create an engaging LinkedIn post that positions ${username} as a skilled developer and thought leader.`;
}

/**
 * Build sophisticated Dev.to prompt with brand context
 */
export function buildDevToPrompt(
  username: string,
  achievements: Achievement[],
  brandVoice: BrandVoice,
  brandStrategy: BrandStrategy
): string {
  return `Create an engaging Dev.to article introduction for ${username} based on their recent technical achievements.

CONTEXT:
- Developer: ${username}
- Brand Voice: ${brandVoice.tone || 'professional'} tone, ${
    brandVoice.style || 'technical'
  } style
- Brand Strategy: ${brandStrategy.positioning || 'Technical Excellence'}
- Recent Achievements: ${achievements.length} technical accomplishments

TOP TECHNICAL ACHIEVEMENTS:
${achievements
  .slice(0, 3)
  .map(
    (a, i) =>
      `${i + 1}. ${a.description || a.title || 'Technical achievement'} - ${
        a.technologies?.join(', ') || 'Modern tech stack'
      }`
  )
  .join('\n')}

REQUIREMENTS:
- Technical but accessible writing style
- Hook readers in first paragraph
- Promise valuable insights
- 200-400 words for introduction
- Include what readers will learn
- Developer-focused audience

Create an article introduction that establishes ${username} as a knowledgeable developer sharing valuable insights.`;
}
