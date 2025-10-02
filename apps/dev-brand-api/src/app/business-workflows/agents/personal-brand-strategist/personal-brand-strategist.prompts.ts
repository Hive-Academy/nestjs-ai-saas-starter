/**
 * Personal Brand Strategist Agent - LLM Prompt Builders
 *
 * This file contains all prompt templates and builders for the
 * Personal Brand Strategist agent to keep the main agent file clean.
 */

import type { BrandData, BrandAnalysis } from '../shared/agent.types';

/**
 * Build prompt for analyzing brand positioning
 */
export function buildBrandAnalysisPrompt(
  githubUsername: string,
  brandData: BrandData
): string {
  return `
Analyze the brand positioning for developer: ${githubUsername}

Data:
- Technical Stack: ${brandData.techStack?.primary || 'Not specified'}
- Repositories: ${brandData.techStack?.repositories || 0}
- Achievements: ${brandData.achievements?.length || 0}
- Context: ${JSON.stringify(brandData.devContext || {})}

Provide:
1. Current brand strength (score 0-1)
2. Key strengths
3. Areas for improvement
4. Market positioning

Format as JSON with: { score, strengths, improvements, positioning }
`;
}

/**
 * Build prompt for brand optimization strategy (strong brands)
 */
export function buildOptimizationPrompt(
  githubUsername: string,
  brandAnalysis: BrandAnalysis
): string {
  return `
Optimize brand strategy for ${githubUsername} (strong brand detected).

Current strengths: ${JSON.stringify(brandAnalysis.strengths || [])}
Positioning: ${brandAnalysis.positioning || 'Professional developer'}

Generate optimization strategy focusing on:
1. Amplifying existing strengths
2. Thought leadership opportunities
3. Community engagement
4. Content creation

Provide concrete, actionable recommendations.
`;
}

/**
 * Build prompt for brand rebuild strategy (weak brands)
 */
export function buildRebuildPrompt(
  githubUsername: string,
  brandScore: number,
  brandData: BrandData,
  brandAnalysis: BrandAnalysis
): string {
  return `
Rebuild brand strategy for ${githubUsername} (needs strengthening).

Current situation:
- Brand score: ${brandScore}
- Tech stack: ${brandData.techStack?.primary || 'Various'}
- Repositories: ${brandData.techStack?.repositories || 0}
- Improvements needed: ${JSON.stringify(brandAnalysis.improvements || [])}

Generate comprehensive rebuilding strategy:
1. Foundation elements (portfolio, presence)
2. Content strategy
3. Networking and community
4. Skill development priorities
5. Timeline and milestones

Provide structured, actionable plan.
`;
}
