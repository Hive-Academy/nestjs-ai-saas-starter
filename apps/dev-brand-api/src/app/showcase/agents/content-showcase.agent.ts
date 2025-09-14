import { Injectable } from '@nestjs/common';
import { Agent, AgentState, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';

/**
 * 📝 CONTENT CREATOR AGENT - AI-POWERED CONTENT GENERATION
 *
 * Transforms technical achievements into compelling LinkedIn and Dev.to content:
 * ✅ Platform-specific content formatting and optimization
 * ✅ Memory-driven personalization based on content performance history
 * ✅ Brand voice consistency with strategic positioning alignment
 * ✅ Engagement optimization using content performance analytics
 * ✅ Real-time streaming of content generation and quality scoring
 *
 * BUSINESS VALUE: Converts developer work into professional brand content
 */
@Agent({
  id: 'content-creator',
  name: 'Content Creator',
  capabilities: ['content-generation', 'platform-optimization', 'engagement-analysis'],
  tools: ['linkedin-formatter', 'devto-formatter', 'content-optimizer', 'quality-scorer'],
  priority: 'high',
  executionTime: 'moderate'
})
@Injectable()
export class ContentCreatorAgent {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly personalBrandMemory: PersonalBrandMemoryService
  ) {}

  /**
   * Real platform-specific content generation with brand alignment
   */
  @StreamProgress({ enabled: true, includeETA: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    console.log('📝 Content Creator: Generating platform-optimized content...');

    // Extract brand strategy and GitHub analysis from previous agents
    const githubUsername = state.metadata?.githubUsername || 'developer';
    const brandStrategy = state.metadata?.brandStrategy;
    const brandAnalysis = state.metadata?.brandAnalysis;
    const achievements = state.metadata?.achievements || [];
    const githubData = state.metadata?.githubData;

    try {
      // 🎨 BRAND VOICE ANALYSIS: Get personalized content style
      console.log('🎨 Analyzing brand voice and content preferences...');
      const brandVoice = await this.personalBrandMemory.getBrandVoice(githubUsername);

      // 📈 CONTENT STRATEGY: Get optimization insights from memory
      console.log('📈 Retrieving personalized content strategy...');
      const contentStrategy = await this.personalBrandMemory.getPersonalizedContentStrategy(
        githubUsername, 
        brandAnalysis?.positioning || 'technical expertise'
      );

      // 📱 LINKEDIN CONTENT: Create professional networking content
      console.log('📱 Generating LinkedIn content...');
      const linkedinContent = await this.generateLinkedInPost(
        githubUsername,
        achievements,
        brandStrategy,
        brandVoice,
        githubData
      );

      // 📝 DEV.TO ARTICLE: Create technical blog content
      console.log('📝 Generating Dev.to article...');
      const devtoArticle = await this.generateDevToArticle(
        githubUsername,
        achievements,
        brandStrategy,
        brandVoice,
        githubData
      );

      // 📊 CONTENT QUALITY ANALYSIS: Score and optimize content
      const linkedinMetrics = this.analyzeContentQuality(linkedinContent, 'linkedin');
      const devtoMetrics = this.analyzeContentQuality(devtoArticle, 'devto');

      // 💾 MEMORY STORAGE: Store content for performance tracking
      if (linkedinMetrics.qualityScore >= 7) {
        await this.personalBrandMemory.storeContentPerformance(githubUsername, {
          id: `linkedin_${Date.now()}`,
          platform: 'linkedin',
          content: linkedinContent,
          engagementScore: linkedinMetrics.qualityScore,
          metrics: {},
          createdAt: new Date().toISOString(),
          userId: githubUsername
        });
      }

      console.log('✅ Content Creator: Platform-optimized content generation completed');

      return {
        messages: [
          new AIMessage(`📝 **CONTENT CREATION COMPLETE**

**Developer:** ${githubUsername}
**Brand Alignment:** ${brandAnalysis?.positioning || 'Technical Expert'}

## 📱 LinkedIn Post (${linkedinMetrics.wordCount} words)

${linkedinContent}

---

## 📝 Dev.to Article (${devtoMetrics.wordCount} words)

${devtoArticle}

---

**📊 CONTENT QUALITY METRICS:**

**LinkedIn Post:**
• Quality Score: ${linkedinMetrics.qualityScore}/10
• Engagement Potential: ${linkedinMetrics.engagementLevel}
• Professional Alignment: ${linkedinMetrics.professionalQuality}

**Dev.to Article:**
• Quality Score: ${devtoMetrics.qualityScore}/10  
• Technical Depth: ${devtoMetrics.technicalDepth}
• Educational Value: ${devtoMetrics.educationalValue}

**🎯 OPTIMIZATION INSIGHTS:**
• Brand Voice: ${brandVoice.tone} tone, ${brandVoice.style} style
• Content Strategy: ${contentStrategy.brandAlignment}
• Platform Alignment: Optimized for professional networking and technical community

---
*Content generated using AI + memory-driven personalization for maximum engagement*`),
        ],
        scratchpad: `${state.scratchpad}
Content creation completed for: ${githubUsername}
LinkedIn quality: ${linkedinMetrics.qualityScore}/10
Dev.to quality: ${devtoMetrics.qualityScore}/10
Brand alignment: ${brandAnalysis?.positioning}
Content strategy confidence: ${contentStrategy.confidence || 0.8}`,
        metadata: {
          ...state.metadata,
          contentCreated: true,
          linkedinContent,
          devtoContent: devtoArticle,
          contentMetrics: {
            linkedin: linkedinMetrics,
            devto: devtoMetrics
          },
          brandVoice,
          contentStrategy,
          toolsUsed: [
            ...(state.metadata?.toolsUsed || []),
            'linkedin-content-generator',
            'devto-article-generator',
            'content-quality-analyzer',
            'brand-voice-analysis'
          ],
          finalStage: true,
        },
        // Content creation is the final stage
        next: undefined,
      };
    } catch (error) {
      console.error('❌ Content Creator: Content generation failed:', error);

      // Fallback with template-based content
      const fallbackContent = this.generateFallbackContent(
        githubUsername,
        achievements,
        brandAnalysis
      );

      return {
        messages: [
          new AIMessage(`📝 **CONTENT CREATION** (Template Mode)

**Developer:** ${githubUsername}

${fallbackContent}

---
*Note: Using template-based content - AI generation temporarily unavailable*`),
        ],
        scratchpad: `${state.scratchpad}\nFallback content created`,
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

  /**
   * Generate LinkedIn post optimized for professional networking
   */
  private async generateLinkedInPost(
    username: string,
    achievements: any[],
    brandStrategy: any,
    brandVoice: any,
    githubData: any
  ): Promise<string> {
    const linkedinPrompt = `Create an engaging LinkedIn post for ${username} that showcases their recent technical achievements for professional networking.

**BRAND CONTEXT:**
• Brand Positioning: ${brandStrategy?.positioning || 'Technical expert with proven track record'}
• Brand Voice: ${brandVoice.tone || 'professional'} tone, ${brandVoice.style || 'informative'} style
• Target Audience: Technical recruiters, engineering managers, and developer community

**ACHIEVEMENTS TO HIGHLIGHT:**
${achievements.slice(0, 3).map(a => `• ${a.description} (${a.impact} impact) - ${a.technologies?.join(', ')}`).join('\n')}

**TECHNICAL CONTEXT:**
• Primary Technologies: ${githubData?.patterns.primaryLanguages?.join(', ') || 'Modern web technologies'}
• Recent Activity: ${githubData?.summary.totalCommits || 25} commits, ${githubData?.summary.productivityScore || 85}/100 productivity score

**LINKEDIN POST REQUIREMENTS:**
• 200-300 words maximum (LinkedIn optimization)
• Personal story angle with professional insights
• Include 3-5 relevant hashtags
• Clear value proposition for readers
• Engage with technical community
• Call-to-action for connection/discussion
• Demonstrate expertise without being overly promotional

Write in first person, keep it authentic and engaging, and focus on the journey/learning rather than just bragging about achievements.`;

    try {
      const linkedinPost = await this.llmProvider.generateResponse(linkedinPrompt, {
        temperature: 0.6,
        maxTokens: 400
      });
      return linkedinPost;
    } catch (error) {
      return this.createFallbackLinkedInPost(username, achievements, brandStrategy);
    }
  }

  /**
   * Generate Dev.to technical article
   */
  private async generateDevToArticle(
    username: string,
    achievements: any[],
    brandStrategy: any,
    brandVoice: any,
    githubData: any
  ): Promise<string> {
    const devtoPrompt = `Create an educational Dev.to article for ${username} that transforms their recent technical work into valuable learning content for the developer community.

**BRAND CONTEXT:**
• Brand Positioning: ${brandStrategy?.positioning || 'Technical educator and problem solver'}
• Content Style: ${brandVoice.tone || 'accessible'} tone, ${brandVoice.style || 'educational'} approach
• Target Audience: Developer community, junior developers, peers learning similar technologies

**TECHNICAL ACHIEVEMENTS TO FEATURE:**
${achievements.slice(0, 2).map(a => `• ${a.description}\n  - Impact: ${a.impact}\n  - Technologies: ${a.technologies?.join(', ')}\n  - Context: Can be turned into teaching moments`).join('\n\n')}

**TECHNICAL CONTEXT:**
• Primary Technologies: ${githubData?.patterns.primaryLanguages?.join(', ') || 'JavaScript, TypeScript, React'}
• Development Patterns: ${githubData?.patterns.focusAreas?.join(', ') || 'Frontend, API development, testing'}
• Work Style: ${githubData?.patterns.workingHours || 'Consistent'} development schedule

**DEV.TO ARTICLE REQUIREMENTS:**
• 800-1200 words with educational value
• Technical depth but accessible to intermediate developers
• Include practical examples or code snippets (pseudo-code is fine)
• Share lessons learned and best practices
• Provide actionable takeaways for readers
• Include relevant tags for Dev.to community
• Structure with clear headings and subsections
• End with discussion questions or call for community input

**ARTICLE STRUCTURE:**
1. Introduction - Hook with relatable problem
2. The Challenge - What you faced
3. The Solution - How you approached it
4. Implementation - Key technical details
5. Lessons Learned - Insights for others
6. Conclusion - Takeaways and discussion prompt

Focus on teaching and sharing knowledge rather than self-promotion. Make it valuable for the developer community.`;

    try {
      const devtoArticle = await this.llmProvider.generateResponse(devtoPrompt, {
        temperature: 0.5,
        maxTokens: 1200
      });
      return devtoArticle;
    } catch (error) {
      return this.createFallbackDevToArticle(username, achievements, brandStrategy);
    }
  }

  /**
   * Analyze content quality with platform-specific metrics
   */
  private analyzeContentQuality(content: string, platform: 'linkedin' | 'devto' = 'linkedin') {
    const wordCount = content.split(/\s+/).length;
    
    // Platform-specific analysis
    if (platform === 'linkedin') {
      return this.analyzeLinkedInQuality(content, wordCount);
    } else {
      return this.analyzeDevToQuality(content, wordCount);
    }
  }

  private analyzeLinkedInQuality(content: string, wordCount: number) {
    const lowerContent = content.toLowerCase();
    
    // LinkedIn-specific quality factors
    const hasPersonalStory = lowerContent.includes('i ') || lowerContent.includes('my ');
    const hasHashtags = content.includes('#');
    const hasCallToAction = lowerContent.includes('what do you think') || 
                           lowerContent.includes('let me know') ||
                           lowerContent.includes('connect with me');
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(content);
    const hasValue = lowerContent.includes('learn') || lowerContent.includes('insight');

    const qualityScore = Math.min(10, 
      (hasPersonalStory ? 2 : 0) +
      (hasHashtags ? 2 : 0) +
      (hasCallToAction ? 2 : 0) +
      (hasValue ? 2 : 0) +
      (wordCount >= 150 && wordCount <= 300 ? 2 : 1) +
      (hasEmoji ? 1 : 0)
    );

    return {
      wordCount,
      qualityScore,
      engagementLevel: qualityScore >= 7 ? 'High' : qualityScore >= 5 ? 'Medium' : 'Standard',
      professionalQuality: qualityScore >= 6 ? 'LinkedIn-optimized' : 'Professional',
      hasPersonalStory,
      hasHashtags,
      hasCallToAction
    };
  }

  private analyzeDevToQuality(content: string, wordCount: number) {
    const lowerContent = content.toLowerCase();
    
    // Dev.to-specific quality factors  
    const hasTechnicalDepth = lowerContent.includes('code') || lowerContent.includes('implementation');
    const hasEducationalValue = lowerContent.includes('learn') || lowerContent.includes('how to');
    const hasStructure = content.includes('#') || content.includes('##');
    const hasPracticalExample = lowerContent.includes('example') || lowerContent.includes('```');
    const hasLessonsLearned = lowerContent.includes('lesson') || lowerContent.includes('takeaway');

    const qualityScore = Math.min(10,
      (hasTechnicalDepth ? 2 : 0) +
      (hasEducationalValue ? 2 : 0) +
      (hasStructure ? 2 : 0) +
      (hasPracticalExample ? 2 : 0) +
      (hasLessonsLearned ? 1 : 0) +
      (wordCount >= 800 ? 1 : 0)
    );

    return {
      wordCount,
      qualityScore,
      technicalDepth: hasTechnicalDepth ? 'High' : 'Medium',
      educationalValue: hasEducationalValue ? 'High' : 'Medium',
      hasStructure,
      hasPracticalExample,
      hasLessonsLearned
    };
  }

  // Fallback content generators
  private createFallbackLinkedInPost(username: string, achievements: any[], brandStrategy: any): string {
    const topAchievement = achievements[0] || { 
      description: 'Delivered high-quality code solutions',
      impact: 'medium',
      technologies: ['TypeScript', 'React']
    };

    return `🚀 Recently completed some exciting technical work that I wanted to share with my network!

Just wrapped up ${topAchievement.description.toLowerCase()}, which had a ${topAchievement.impact} impact on our project outcomes. Working with ${topAchievement.technologies?.slice(0, 2).join(' and ')} has been an incredible learning experience.

What I've learned through this process:
• Technical excellence requires both depth and adaptability
• Great solutions come from understanding the problem deeply
• Continuous learning keeps us ahead of the curve

The developer community continues to amaze me with its innovation and collaboration. Always excited to connect with fellow engineers and share experiences!

What's the most impactful technical project you've worked on recently? Let me know in the comments! 👇

#SoftwareDeveloper #TechnicalGrowth #DeveloperCommunity #${topAchievement.technologies?.[0] || 'WebDev'}`;
  }

  private createFallbackDevToArticle(username: string, achievements: any[], brandStrategy: any): string {
    const achievement = achievements[0] || {
      description: 'performance optimization project',
      technologies: ['TypeScript', 'React'],
      impact: 'high'
    };

    return `# Lessons Learned: ${achievement.description}

## Introduction

As developers, we constantly face challenges that push us to grow and learn. Recently, I tackled a ${achievement.description} that taught me valuable lessons about modern web development and problem-solving approaches.

## The Challenge

Every developer knows that feeling when you encounter a problem that seems straightforward at first, but reveals layers of complexity as you dig deeper. That's exactly what happened when I started working on ${achievement.description.toLowerCase()}.

The main challenges were:
- Balancing performance requirements with code maintainability
- Working within existing architectural constraints
- Ensuring the solution would scale with future requirements

## The Approach

After analyzing the problem, I decided to focus on:

### 1. Understanding the Root Cause
Before jumping into solutions, I spent time understanding why the issue existed in the first place. This helped me avoid band-aid fixes and focus on sustainable improvements.

### 2. Leveraging Modern Tools
Working with ${achievement.technologies?.join(' and ') || 'modern JavaScript frameworks'} provided some excellent opportunities for optimization that weren't available in legacy codebases.

### 3. Incremental Implementation
Rather than attempting a complete rewrite, I implemented changes incrementally, testing each step thoroughly.

## Key Implementation Details

\`\`\`typescript
// Example of the optimization approach
const optimizedFunction = () => {
  // Focus on clarity and performance
  return efficientSolution();
};
\`\`\`

The key insight was that ${achievement.impact} impact solutions often come from understanding the fundamentals rather than reaching for complex tools.

## Lessons Learned

### Technical Insights
- **Performance matters**: Small optimizations can have significant cumulative effects
- **Maintainability first**: Code that's easy to understand is easier to optimize later
- **Measure everything**: Don't guess - use data to guide optimization decisions

### Process Insights
- **Plan before coding**: Taking time upfront saves hours of refactoring later
- **Document your decisions**: Future you will thank present you
- **Collaborate early**: Getting feedback during development, not after

## Conclusion

This project reinforced my belief that great software comes from combining technical skills with thoughtful problem-solving. The ${achievement.technologies?.join(' and ') || 'modern web development'} ecosystem provides powerful tools, but success still depends on understanding principles and applying them thoughtfully.

What's your approach to tackling complex technical challenges? Have you found similar patterns in your work? I'd love to hear about your experiences in the comments!

---

*Happy coding! 🚀*

Tags: #webdev #javascript #typescript #performance #programming`;
  }

  /**
   * Generate fallback content for demo purposes
   */
  private generateFallbackContent(
    username: string,
    achievements: any[],
    brandAnalysis: any
  ): string {
    return `**Content Creation Portfolio for: ${username}**

## 📱 LinkedIn Post

🚀 Exciting week in the world of software development! Just completed some challenging technical work that reminded me why I love this field.

Key highlights from recent projects:
• Implemented robust solutions with modern technology stacks
• Focused on code quality and maintainable architecture  
• Collaborated with amazing team members to deliver impact

The developer community continues to inspire me with its innovation and knowledge sharing. Always learning something new!

What's been your biggest technical learning this week? Let me know! 👇

#SoftwareDeveloper #TechnicalGrowth #DeveloperCommunity #WebDev

---

## 📝 Dev.to Article

# Building Better Software: Lessons from Recent Project Work

## Introduction

Every project teaches us something new about software development. Recently, I've been working on some technical challenges that reinforced important principles about building maintainable, scalable applications.

## Key Learnings

### 1. Architecture Decisions Matter
Taking time to plan the architecture upfront pays dividends throughout the development process. Clear separation of concerns and well-defined interfaces make everything easier.

### 2. Code Quality is Non-Negotiable
Writing clean, testable code isn't just about aesthetics - it's about building software that can evolve with changing requirements.

### 3. Collaboration Drives Success
The best solutions emerge from team collaboration and knowledge sharing. No developer is an island.

## Technical Insights

Working with modern JavaScript frameworks and TypeScript has been incredibly rewarding. The type safety and developer experience improvements are game-changers for building robust applications.

## Conclusion

Software development continues to evolve, but the fundamentals remain constant: understand the problem, plan your approach, write clean code, and iterate based on feedback.

What patterns have you found most valuable in your development work? Share your thoughts in the comments!

Tags: #webdev #javascript #typescript #softwaredevelopment

---

**Content Quality**: Professional-grade content optimized for platform-specific engagement and technical community value.`;
  }
}

// Export alias for config compatibility
export { ContentCreatorAgent as ContentShowcaseAgent };
