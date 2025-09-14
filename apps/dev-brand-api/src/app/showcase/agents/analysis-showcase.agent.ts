import { Injectable } from '@nestjs/common';
import { Agent, AgentState, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';

/**
 * 🎯 PERSONAL BRAND STRATEGIST AGENT - AI-POWERED CAREER POSITIONING
 *
 * Creates sophisticated personal brand strategies from developer analysis:
 * ✅ ChromaDB semantic analysis of development patterns and career trajectory
 * ✅ Neo4j relationship mapping for technology expertise and growth paths
 * ✅ Memory-driven personalization based on historical brand evolution
 * ✅ AI-powered brand positioning and strategic recommendations
 * ✅ Real-time streaming of strategy development process
 *
 * BUSINESS VALUE: Transforms technical skills into compelling professional narratives
 */
@Agent({
  id: 'personal-brand-strategist',
  name: 'Personal Brand Strategist',
  capabilities: ['brand-analysis', 'strategic-positioning', 'career-guidance'],
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  priority: 'high',
  executionTime: 'moderate'
})
@Injectable()
export class PersonalBrandStrategistAgent {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly personalBrandMemory: PersonalBrandMemoryService
  ) {}

  /**
   * Real personal brand strategy development with memory-driven personalization
   */
  @StreamProgress({ enabled: true, includeETA: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
    console.log('🎯 Personal Brand Strategist: Developing brand strategy...');

    // Extract GitHub analysis from previous agent
    const githubUsername = state.metadata?.githubUsername || 'developer';
    const githubData = state.metadata?.githubData;
    const achievements = state.metadata?.achievements || [];
    const developerInsights = state.metadata?.developerInsights;

    try {
      // 🧠 MEMORY-DRIVEN CONTEXT: Get developer's brand history and preferences
      console.log('🧠 Retrieving developer context from memory...');
      const devContext = await this.personalBrandMemory.getDevContext(githubUsername);

      // 🎯 BRAND EVOLUTION: Analyze current brand trajectory
      console.log('📈 Analyzing brand evolution patterns...');
      const brandEvolution = await this.personalBrandMemory.getBrandEvolution(githubUsername);

      // 🎨 BRAND VOICE: Get personalized content style preferences
      console.log('🎨 Analyzing brand voice and content preferences...');
      const brandVoice = await this.personalBrandMemory.getBrandVoice(githubUsername);

      // 🚀 AI-POWERED STRATEGY: Generate sophisticated brand positioning
      const strategyPrompt = this.buildBrandStrategyPrompt(
        githubUsername,
        githubData,
        achievements,
        developerInsights,
        devContext,
        brandEvolution,
        brandVoice
      );

      const brandStrategy = await this.llmProvider.generateResponse(
        strategyPrompt,
        {
          temperature: 0.5, // Balanced creativity and consistency
          maxTokens: 3000,
        }
      );

      // 📊 STRATEGIC ANALYSIS: Extract actionable insights
      const strategyAnalysis = this.analyzeBrandStrategy(brandStrategy, achievements);

      // 💾 MEMORY STORAGE: Store new brand strategy for future evolution
      const newBrandStrategy = {
        id: `strategy_${Date.now()}`,
        positioning: strategyAnalysis.positioning,
        strengths: strategyAnalysis.strengths,
        opportunities: strategyAnalysis.opportunities,
        recommendations: strategyAnalysis.recommendations,
        targetAudience: strategyAnalysis.targetAudience,
        confidenceScore: strategyAnalysis.confidence,
        createdAt: new Date().toISOString()
      };

      await this.personalBrandMemory.storeBrandStrategy(githubUsername, newBrandStrategy);

      console.log('✅ Personal Brand Strategist: Strategy development completed');

      return {
        messages: [
          new AIMessage(`🎯 **PERSONAL BRAND STRATEGY COMPLETE**

**Developer:** ${githubUsername}
**Strategy Confidence:** ${Math.round(strategyAnalysis.confidence * 100)}%

${brandStrategy}

---
**🎯 STRATEGIC POSITIONING:**
• **Core Brand:** ${strategyAnalysis.positioning}
• **Target Audience:** ${strategyAnalysis.targetAudience}
• **Key Differentiators:** ${strategyAnalysis.strengths.slice(0, 3).join(', ')}

**📈 GROWTH OPPORTUNITIES:**
${strategyAnalysis.opportunities.slice(0, 3).map(o => `• ${o}`).join('\n')}

**💡 STRATEGIC RECOMMENDATIONS:**
${strategyAnalysis.recommendations.slice(0, 4).map(r => `• ${r}`).join('\n')}

**🧠 MEMORY-DRIVEN INSIGHTS:**
• Brand Evolution: ${brandEvolution.currentTrend}
• Content Style: ${brandVoice.tone} tone, ${brandVoice.style} approach
• Historical Achievements: ${devContext.recentAchievements.length} stored

---
*Strategy developed using AI reasoning + memory-driven personalization*`),
        ],
        scratchpad: `${state.scratchpad}
Brand strategy completed for: ${githubUsername}
Strategy positioning: ${strategyAnalysis.positioning}
Confidence score: ${strategyAnalysis.confidence}
Recommendations: ${strategyAnalysis.recommendations.length}
Memory context: ${devContext.recentAchievements.length} achievements
Brand evolution: ${brandEvolution.currentTrend}`,
        metadata: {
          ...state.metadata,
          brandStrategyCompleted: true,
          brandStrategy: newBrandStrategy,
          brandAnalysis: strategyAnalysis,
          memoryContext: devContext,
          brandEvolution,
          brandVoice,
          toolsUsed: [
            ...(state.metadata?.toolsUsed || []),
            'personal-brand-memory',
            'brand-evolution-analysis',
            'ai-strategy-generation'
          ],
          confidenceScore: strategyAnalysis.confidence,
        },
        next: 'content-creator', // Route to content creation
        task: 'Create compelling content based on brand strategy and developer insights',
      };
    } catch (error) {
      console.error('❌ Personal Brand Strategist: Strategy development failed:', error);

      // Fallback with structured brand analysis
      const fallbackStrategy = this.generateFallbackBrandStrategy(
        githubUsername,
        achievements,
        developerInsights
      );

      return {
        messages: [
          new AIMessage(`🎯 **PERSONAL BRAND STRATEGY** (Demo Mode)

**Developer:** ${githubUsername}

${fallbackStrategy}

---
*Note: Using demo strategy - Memory integration temporarily unavailable*`),
        ],
        scratchpad: `${state.scratchpad}\nFallback brand strategy completed`,
        metadata: {
          ...state.metadata,
          brandStrategyCompleted: true,
          mode: 'demo-fallback',
        },
        next: 'content-creator',
        task: 'Create content from demo strategy',
      };
    }
  }

  /**
   * Build comprehensive brand strategy prompt
   */
  private buildBrandStrategyPrompt(
    username: string,
    githubData: any,
    achievements: any[],
    insights: any,
    devContext: any,
    brandEvolution: any,
    brandVoice: any
  ): string {
    return `As an expert career strategist and personal branding consultant, develop a comprehensive personal brand strategy for this developer.

**DEVELOPER PROFILE:** ${username}

**📊 CURRENT TECHNICAL PROFILE:**
• Primary Technologies: ${githubData?.patterns.primaryLanguages?.join(', ') || 'Full-stack developer'}
• Productivity Score: ${githubData?.summary.productivityScore || 85}/100
• Working Style: ${githubData?.patterns.workingHours || 'Professional hours'}
• Focus Areas: ${githubData?.patterns.focusAreas?.join(', ') || 'General development'}

**🎯 KEY ACHIEVEMENTS:**
${achievements.slice(0, 5).map(a => `• ${a.description} (${a.impact} impact)`).join('\n') || '• Consistent code contributions and quality improvements'}

**🧠 HISTORICAL CONTEXT:**
• Brand Evolution Trend: ${brandEvolution.currentTrend || 'stable'}
• Content Style: ${brandVoice.tone || 'professional'} tone, ${brandVoice.style || 'technical'} approach
• Engagement Level: ${brandVoice.engagementLevel || 'active'}
• Previous Achievements: ${devContext.recentAchievements?.length || 0} stored

**📈 TECHNICAL EXPERTISE ASSESSMENT:**
• Breadth: ${insights?.technicalExpertise?.breadth || 'Full-stack'}
• Complexity Level: ${insights?.technicalExpertise?.complexity || 'High'}
• Career Trajectory: ${brandEvolution.currentTrend === 'improving' ? 'Ascending' : 'Stable'}

Please create a comprehensive personal brand strategy that includes:

1. **CORE BRAND POSITIONING** - A compelling 2-3 sentence positioning statement that differentiates this developer
2. **TARGET AUDIENCE DEFINITION** - Who should this developer be reaching (recruiters, peers, customers, etc.)
3. **KEY DIFFERENTIATORS** - What makes this developer unique in the market
4. **GROWTH OPPORTUNITIES** - Specific areas for brand and career advancement
5. **CONTENT STRATEGY** - How to leverage technical work for personal branding
6. **STRATEGIC RECOMMENDATIONS** - Actionable steps for brand development
7. **MARKET POSITIONING** - How to position against other developers in their space

**STRATEGIC GUIDELINES:**
- Focus on transforming technical accomplishments into business value
- Emphasize unique combinations of skills and experiences
- Consider both current strengths and growth trajectory
- Align with historical brand voice and engagement patterns
- Provide actionable, specific recommendations

Create a strategy that will help this developer advance their career and build market recognition.`;
  }

  /**
   * Analyze brand strategy response and extract structured insights
   */
  private analyzeBrandStrategy(strategy: string, achievements: any[]): any {
    const lowerStrategy = strategy.toLowerCase();

    // Extract positioning statement (usually in first paragraph)
    const lines = strategy.split('\n').filter(line => line.trim());
    const positioning = lines.find(line => 
      line.includes('position') || 
      line.includes('brand') ||
      line.length > 50
    ) || 'Senior developer with strong technical expertise';

    // Extract strengths
    const strengths = this.extractListItems(strategy, ['strength', 'differentiator', 'unique']);
    
    // Extract opportunities  
    const opportunities = this.extractListItems(strategy, ['opportunity', 'growth', 'advancement']);
    
    // Extract recommendations
    const recommendations = this.extractListItems(strategy, ['recommend', 'action', 'step', 'strategy']);

    // Determine target audience
    const targetAudience = lowerStrategy.includes('recruiter') ? 'Technical Recruiters' :
                          lowerStrategy.includes('founder') ? 'Startup Founders' :
                          lowerStrategy.includes('team') ? 'Engineering Teams' :
                          'Tech Professionals';

    // Calculate confidence based on achievements and strategy depth
    const confidence = Math.min(0.95, 0.7 + 
      (achievements.length * 0.05) + 
      (strategy.length / 4000 * 0.2)
    );

    return {
      positioning: this.cleanPositioning(positioning),
      strengths: strengths.slice(0, 5),
      opportunities: opportunities.slice(0, 4),
      recommendations: recommendations.slice(0, 6),
      targetAudience,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Generate fallback brand strategy for demo purposes
   */
  private generateFallbackBrandStrategy(
    username: string,
    achievements: any[],
    insights: any
  ): string {
    return `**Personal Brand Strategy for: ${username}**

**🎯 CORE BRAND POSITIONING:**
Position as a **Senior Full-Stack Engineer** with proven expertise in modern web technologies and systematic problem-solving. Demonstrated ability to deliver high-impact solutions while maintaining code quality and team collaboration standards.

**👥 TARGET AUDIENCE:**
• **Primary:** Technical Recruiters and Engineering Managers seeking senior-level talent
• **Secondary:** Startup Founders looking for technical co-founders or early engineers
• **Tertiary:** Developer Community for thought leadership and knowledge sharing

**🚀 KEY DIFFERENTIATORS:**
• **Technical Breadth:** ${insights?.technicalExpertise?.breadth || 'Full-stack'} expertise across modern technology stacks
• **Quality Focus:** Consistent emphasis on testing, documentation, and maintainable code
• **Problem Solver:** Demonstrated ability to tackle complex technical challenges
• **Growth Mindset:** Continuous learning and adaptation to emerging technologies

**📈 GROWTH OPPORTUNITIES:**
• **Technical Leadership:** Transition into Staff Engineer or Tech Lead roles
• **Open Source Contribution:** Build developer community presence and credibility
• **Content Creation:** Share technical insights through blogs, talks, or tutorials
• **Mentorship:** Establish thought leadership through helping other developers

**💡 STRATEGIC RECOMMENDATIONS:**

**Immediate Actions (0-3 months):**
1. **LinkedIn Optimization:** Update profile with achievements and technical expertise
2. **Portfolio Enhancement:** Showcase best projects with detailed technical explanations
3. **Network Activation:** Engage with relevant technical communities and discussions

**Short-term Goals (3-6 months):**
4. **Content Strategy:** Publish technical articles about recent projects and learnings
5. **Speaking Opportunities:** Apply for local meetups or conferences
6. **Skill Certification:** Pursue relevant certifications in key technology areas

**Long-term Vision (6-12 months):**
7. **Thought Leadership:** Establish expertise in specific technical domains
8. **Community Building:** Contribute to open source projects or start technical initiatives
9. **Career Advancement:** Target senior technical roles with increased responsibility

**🎯 MARKET POSITIONING:**
Position in the **top 20% of senior developers** by combining:
• Strong technical execution with business understanding
• Quality-focused development practices
• Collaborative leadership and mentoring capabilities
• Continuous learning and technology adoption

**📊 SUCCESS METRICS:**
• LinkedIn engagement and connection growth
• Technical article views and community feedback
• Interview opportunities and job offer quality
• Network expansion and industry recognition

*Strategy optimized for current market conditions and career trajectory*`;
  }

  // Helper methods
  private extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) {
        const cleaned = trimmed.replace(/^[•\-\d.]\s*/, '').trim();
        if (cleaned.length > 10 && keywords.some(keyword => 
          line.toLowerCase().includes(keyword) || 
          text.substring(Math.max(0, text.indexOf(line) - 100), text.indexOf(line)).toLowerCase().includes(keyword)
        )) {
          items.push(cleaned);
        }
      }
    }
    
    return items.length > 0 ? items : [
      'Strong technical expertise in modern technologies',
      'Proven track record of delivering quality solutions',
      'Collaborative approach to software development'
    ];
  }

  private cleanPositioning(positioning: string): string {
    return positioning
      .replace(/^\*+\s*/, '')
      .replace(/\*+$/, '')
      .replace(/^#+\s*/, '')
      .trim();
  }
}

// Export alias for config compatibility
export { PersonalBrandStrategistAgent as AnalysisShowcaseAgent };
