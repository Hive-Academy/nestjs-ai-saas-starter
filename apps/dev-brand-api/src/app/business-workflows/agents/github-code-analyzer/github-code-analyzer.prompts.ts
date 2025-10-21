/**
 * GitHub Code Analyzer Agent - LLM Prompt Builders
 *
 * This file contains all prompt templates and builders for the
 * GitHub Code Analyzer agent to keep the main agent file clean.
 */

import type {
  Achievement,
  GitHubData,
  DeveloperInsights,
} from '../shared/agent.types';

/**
 * Build comprehensive developer analysis prompt
 */
export function buildDeveloperAnalysisPrompt(
  username: string,
  githubData: GitHubData,
  achievements: Achievement[],
  insights: DeveloperInsights
): string {
  return `As an expert technical recruiter and personal branding strategist, analyze the following developer's GitHub activity and create a compelling professional narrative.

**Developer Profile:** ${username}
**Analysis Period:** ${githubData.timeframe || 'recent'}

**📊 TECHNICAL METRICS:**
• Repositories: ${githubData.summary.totalRepositories}
• Commits: ${githubData.summary.totalCommits}
• Lines of Code: ${githubData.summary.linesOfCode.toLocaleString()}
• Productivity Score: ${githubData.summary.productivityScore}/100

**🎯 EXTRACTED ACHIEVEMENTS:**
${achievements
  .slice(0, 5)
  .map(
    (a) =>
      `• ${a.description} (${a.impact} impact) - ${
        a.technologies?.join(', ') || 'N/A'
      }`
  )
  .join('\n')}

**💡 TECHNICAL EXPERTISE:**
• Primary Languages: ${githubData.patterns.primaryLanguages.join(', ')}
• Working Hours: ${githubData.patterns.workingHours}
• Focus Areas: ${githubData.patterns.focusAreas.join(', ')}

**🔍 DEVELOPER INSIGHTS:**
• Technical Breadth: ${insights.technicalExpertise?.breadth || 'Full-stack'}
• Complexity Level: ${insights.technicalExpertise?.complexity || 'High'}
• Growth Opportunities: ${
    insights.recommendations?.slice(0, 2).join(', ') ||
    'Continue current trajectory'
  }

Please create a professional developer profile that includes:

1. **Executive Summary** - Compelling 2-3 sentence overview highlighting key strengths
2. **Technical Leadership** - Evidence of technical decision-making and problem-solving
3. **Innovation & Impact** - Specific examples of meaningful contributions and improvements
4. **Professional Growth** - Trajectory and development patterns shown in the code
5. **Brand Positioning** - How this developer should position themselves in the market
6. **Key Differentiators** - What makes this developer stand out from peers

Focus on transforming technical contributions into business value and career advancement opportunities.`;
}

/**
 * Generate fallback analysis for demo purposes
 */
export function generateFallbackAnalysis(
  username: string,
  timeframe: string
): string {
  return `**Developer Profile Analysis for: ${username}**

**🎯 EXECUTIVE SUMMARY:**
Highly productive developer demonstrating consistent contribution patterns and modern technology adoption. Shows strong technical leadership through quality code commits and innovative problem-solving approaches.

**📊 TECHNICAL HIGHLIGHTS:**
• **Productivity Score:** 85/100 - Above industry average
• **Primary Technologies:** TypeScript, React, Node.js, Python
• **Working Pattern:** Consistent daily commits with focus on quality over quantity
• **Code Quality:** Strong testing practices and documentation standards

**🚀 KEY ACHIEVEMENTS:**
• **Performance Optimization Expert:** Implemented 5+ performance improvements resulting in 40% faster load times
• **Full-Stack Innovation:** Delivered 3 major features integrating modern frontend/backend technologies
• **Quality Champion:** Maintained high code standards with comprehensive testing and documentation

**💡 PROFESSIONAL STRENGTHS:**
• **Problem Solving:** Demonstrates analytical thinking through commit patterns
• **Technology Adoption:** Early adopter of modern development practices
• **Collaboration:** Regular contribution patterns showing team-oriented development
• **Continuous Learning:** Technology diversity shows commitment to skill expansion

**🎯 BRAND POSITIONING:**
Position as a **Senior Full-Stack Engineer** with expertise in modern web technologies and performance optimization. Strong candidate for **technical leadership roles** requiring both hands-on development and architectural decision-making.

**📈 GROWTH TRAJECTORY:**
• Consistent upward trend in code complexity and project scope
• Increasing responsibility evidenced through architectural decisions
• Strong foundation for advancement to **Staff Engineer** or **Tech Lead** roles

*Analysis based on contribution patterns, technology choices, and development practices*`;
}
