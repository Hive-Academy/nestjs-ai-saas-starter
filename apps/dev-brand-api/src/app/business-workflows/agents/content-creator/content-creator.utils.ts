/**
 * Content Creator Agent - Utility Functions
 *
 * This file contains helper functions for content optimization,
 * engagement prediction, and quality scoring.
 */

import type { Achievement, ContentQualityScore } from '../shared/agent.types';

/**
 * Optimize LinkedIn content for engagement
 */
export function optimizeLinkedInContent(
  content: string,
  achievements: Achievement[]
): string {
  let optimized = content;

  // Ensure proper spacing for readability
  if (!optimized.includes('\n\n')) {
    optimized = optimized.replace(/\. /g, '.\n\n');
  }

  // Add engagement elements if missing
  if (
    !optimized.includes('💡') &&
    !optimized.includes('🚀') &&
    !optimized.includes('✨')
  ) {
    optimized = '🚀 ' + optimized;
  }

  // Ensure call-to-action
  if (
    !optimized.toLowerCase().includes('what') &&
    !optimized.toLowerCase().includes('share') &&
    !optimized.toLowerCase().includes('thoughts')
  ) {
    optimized +=
      "\n\nWhat's your experience with similar challenges? Share your thoughts in the comments!";
  }

  return optimized;
}

/**
 * Optimize Dev.to content for technical audience
 */
export function optimizeDevToContent(
  content: string,
  achievements: Achievement[]
): string {
  let optimized = content;

  // Ensure technical focus
  if (
    !optimized.toLowerCase().includes('code') &&
    !optimized.toLowerCase().includes('technical') &&
    !optimized.toLowerCase().includes('development')
  ) {
    optimized +=
      "\n\nIn this article, we'll dive deep into the technical implementation and lessons learned.";
  }

  // Add learning promise
  if (
    !optimized.toLowerCase().includes('learn') &&
    !optimized.toLowerCase().includes('discover')
  ) {
    optimized +=
      "\n\nYou'll learn practical techniques you can apply to your own projects.";
  }

  return optimized;
}

/**
 * Predict engagement score for platform
 */
export function predictEngagement(
  platform: 'linkedin' | 'devto',
  content: string
): number {
  let score = 0.5; // Base score

  // Content length optimization
  if (platform === 'linkedin') {
    if (content.length >= 150 && content.length <= 300) score += 0.2;
  } else {
    if (content.length >= 200 && content.length <= 400) score += 0.2;
  }

  // Engagement elements
  if (content.includes('?')) score += 0.1; // Questions increase engagement
  if (content.match(/[🚀💡✨🎯]/u)) score += 0.1; // Emojis (but not too many)
  if (
    content.toLowerCase().includes('share') ||
    content.toLowerCase().includes('comment')
  )
    score += 0.1;

  // Technical relevance for dev.to
  if (
    platform === 'devto' &&
    (content.toLowerCase().includes('technical') ||
      content.toLowerCase().includes('code'))
  ) {
    score += 0.1;
  }

  return Math.min(1.0, score);
}

/**
 * Calculate overall content quality score
 */
export function calculateQualityScore(criteria: {
  hasSubstantialContent: boolean;
  hasAchievements: boolean;
  linkedinEngagement: number;
  devtoEngagement: number;
  contentLength: number;
}): number {
  let score = 0;

  if (criteria.hasSubstantialContent) score += 0.3;
  if (criteria.hasAchievements) score += 0.2;
  if (criteria.linkedinEngagement > 0.6) score += 0.2;
  if (criteria.devtoEngagement > 0.6) score += 0.2;
  if (criteria.contentLength > 500) score += 0.1;

  return score;
}

/**
 * Build final content delivery message
 */
export function buildFinalContentMessage(
  username: string,
  linkedinContent: string,
  devtoContent: string,
  linkedinEngagement: number,
  devtoEngagement: number,
  mode: string
): string {
  return `🎨 **CONTENT CREATION COMPLETE**

**Created for:** ${username}
**Mode:** ${mode === 'fallback' ? 'Fallback Template' : 'AI-Optimized'}

---

📱 **LINKEDIN POST:**
${linkedinContent}

*Engagement Prediction: ${Math.round(
    linkedinEngagement * 100
  )}% • Optimized for professional network*

---

📝 **DEV.TO ARTICLE INTRO:**
${devtoContent}

*Engagement Prediction: ${Math.round(
    devtoEngagement * 100
  )}% • Optimized for developer community*

---

**📊 CONTENT METRICS:**
• **LinkedIn Length:** ${linkedinContent.length} characters (optimal: 150-300)
• **Dev.to Length:** ${devtoContent.length} characters (optimal: 200-400)
• **Total Processing:** AI-powered generation with brand voice integration

*Ready to publish! Content optimized for maximum engagement and brand consistency.*`;
}
