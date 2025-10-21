/**
 * GitHub Code Analyzer Agent - Utility Functions
 *
 * This file contains helper functions for GitHub username extraction
 * and message building.
 */

import type { Achievement, GitHubData } from '../shared/agent.types';

/**
 * Extract GitHub username from user message
 */
export function extractGitHubUsername(message: string): string | null {
  // Look for patterns like "analyze my GitHub: username", "GitHub username", or just a username
  const patterns = [
    /github[:\s]+([a-zA-Z0-9\-_]+)/i,
    /username[:\s]+([a-zA-Z0-9\-_]+)/i,
    /analyze[:\s]+([a-zA-Z0-9\-_]+)/i,
    /^([a-zA-Z0-9\-_]{2,39})$/, // Just a username
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Build success message for real analysis
 */
export function buildSuccessMessage(
  githubUsername: string,
  timeframe: string,
  aiAnalysis: string,
  githubData: GitHubData,
  achievements: Achievement[]
): string {
  return `💻 **GITHUB CODE ANALYSIS COMPLETE**

**Developer:** ${githubUsername}
**Analysis Period:** ${timeframe}

${aiAnalysis}

---
**📊 TECHNICAL METRICS:**
• **Repositories Analyzed:** ${githubData.summary.totalRepositories}
• **Commits Analyzed:** ${githubData.summary.totalCommits}
• **Lines of Code:** ${githubData.summary.linesOfCode.toLocaleString()}
• **Productivity Score:** ${githubData.summary.productivityScore}/100

**🎯 ACHIEVEMENTS EXTRACTED:** ${achievements.length}
${achievements
  .slice(0, 3)
  .map((a) => `• ${a.description} (${a.impact} impact)`)
  .join('\n')}

**💡 PRIMARY TECHNOLOGIES:** ${githubData.patterns.primaryLanguages.join(', ')}

**⚡ WORKING PATTERNS:** ${
    githubData.patterns.workingHours
  } | Focus: ${githubData.patterns.focusAreas.join(', ')}

---
*Analysis powered by GitHub API + AI insights for personal branding*`;
}

/**
 * Build fallback message for demo mode
 */
export function buildFallbackMessage(
  githubUsername: string,
  fallbackAnalysis: string
): string {
  return `💻 **GITHUB CODE ANALYSIS** (Demo Mode)

**Developer:** ${githubUsername}

${fallbackAnalysis}

---
*Note: Using demo analysis - GitHub API integration temporarily unavailable*`;
}
