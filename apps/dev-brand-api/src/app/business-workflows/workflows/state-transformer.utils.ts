/**
 * State Transformer Utilities
 *
 * Pure functions for extracting structured data from workflow state metadata.
 * These utilities provide safe navigation and default values for missing fields.
 *
 * @module state-transformer.utils
 */

import type { TypedAgentState } from '../types';
import type {
  Achievement,
  BrandStrategy,
  PlatformContent,
} from '../agents/shared/agent.types';

/**
 * Extract achievements from GitHub analyzer metadata
 *
 * @param finalState - Workflow state containing GitHub analysis results
 * @returns Array of achievements (empty if none found)
 */
export function extractAchievements(
  finalState: TypedAgentState<Record<string, unknown>>
): Achievement[] {
  return (finalState.metadata as any)?.githubData?.achievements || ([] as Achievement[]);
}

/**
 * Extract brand strategy from strategist metadata
 *
 * @param finalState - Workflow state containing brand strategy results
 * @returns Brand strategy object with default values for missing fields
 */
export function extractStrategy(
  finalState: TypedAgentState<Record<string, unknown>>
): BrandStrategy {
  const strategy = finalState.metadata?.brandStrategy as
    | BrandStrategy
    | undefined;

  if (!strategy) {
    return {
      positioning: '',
      strategyType: undefined,
      score: undefined,
      strengths: [],
      improvements: [],
    };
  }

  return {
    positioning: strategy.positioning || '',
    strategyType: strategy.strategyType,
    score: strategy.score,
    strengths: strategy.strengths || [],
    improvements: strategy.improvements || [],
    createdAt: strategy.createdAt,
    userId: strategy.userId,
    strategy: strategy.strategy,
    analysis: strategy.analysis,
  };
}

/**
 * Extract generated content from content creator metadata
 *
 * @param finalState - Workflow state containing generated platform content
 * @returns Platform content object with default values for missing fields
 */
export function extractContent(
  finalState: TypedAgentState<Record<string, unknown>>
): PlatformContent {
  const content = finalState.metadata?.generatedContent as
    | PlatformContent
    | undefined;

  if (!content) {
    return {
      linkedin: '',
      devto: '',
      linkedinEngagement: undefined,
      devtoEngagement: undefined,
    };
  }

  return {
    linkedin: content.linkedin || '',
    devto: content.devto || '',
    linkedinEngagement: content.linkedinEngagement,
    devtoEngagement: content.devtoEngagement,
  };
}

/**
 * Extract confidence score from metadata
 *
 * @param finalState - Workflow state containing confidence score
 * @returns Confidence score (0.0-1.0), defaults to 0.8 if not present
 */
export function extractConfidence(
  finalState: TypedAgentState<Record<string, unknown>>
): number {
  return (finalState.metadata?.confidence as number | undefined) || 0.8;
}
