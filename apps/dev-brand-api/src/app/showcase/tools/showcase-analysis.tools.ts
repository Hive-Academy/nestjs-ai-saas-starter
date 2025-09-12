import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '@hive-academy/langgraph-multi-agent';

/**
 * 🔧 SHOWCASE ANALYSIS TOOLS
 *
 * Demonstrates the @Tool decorator with comprehensive capabilities:
 * - Input validation with Zod schemas
 * - Rate limiting and error handling
 * - Agent targeting and examples
 * - Streaming capabilities
 */
@Injectable()
export class ShowcaseAnalysisTools {
  private readonly logger = new Logger(ShowcaseAnalysisTools.name);

  @Tool({
    name: 'analyze_text_content',
    description:
      'Analyze text content for sentiment, complexity, and key themes',
    schema: z.object({
      text: z.string().min(10).describe('Text content to analyze'),
      analysisType: z
        .enum(['sentiment', 'complexity', 'themes', 'all'])
        .default('all'),
      includeScores: z.boolean().default(true),
    }),
    agents: ['advanced-showcase', 'specialist-showcase'],
    rateLimit: { requests: 50, window: 60000 }, // 50 requests per minute
    examples: [
      {
        input: {
          text: 'This is an amazing demonstration of our AI capabilities!',
          analysisType: 'sentiment',
        },
        output: {
          sentiment: { score: 0.9, label: 'positive' },
          confidence: 0.95,
        },
        description: 'Analyze sentiment of promotional text',
      },
    ],
    tags: ['analysis', 'nlp', 'sentiment'],
    version: '1.0.0',
  })
  async analyzeTextContent({
    text,
    analysisType,
    includeScores,
  }: {
    text: string;
    analysisType: 'sentiment' | 'complexity' | 'themes' | 'all';
    includeScores: boolean;
  }) {
    this.logger.debug(`Analyzing text: ${text.substring(0, 50)}...`);

    const analysis: any = {};

    if (analysisType === 'sentiment' || analysisType === 'all') {
      // Simulate sentiment analysis
      const positiveWords = [
        'amazing',
        'great',
        'excellent',
        'wonderful',
        'fantastic',
      ];
      const negativeWords = [
        'terrible',
        'awful',
        'bad',
        'horrible',
        'disappointing',
      ];

      const positiveCount = positiveWords.filter((word) =>
        text.toLowerCase().includes(word)
      ).length;
      const negativeCount = negativeWords.filter((word) =>
        text.toLowerCase().includes(word)
      ).length;

      const sentiment =
        positiveCount > negativeCount
          ? 'positive'
          : negativeCount > positiveCount
          ? 'negative'
          : 'neutral';
      const score = Math.min(
        Math.max((positiveCount - negativeCount + 5) / 10, 0),
        1
      );

      analysis.sentiment = {
        label: sentiment,
        score: includeScores ? score : undefined,
        confidence: 0.85 + Math.random() * 0.1,
      };
    }

    if (analysisType === 'complexity' || analysisType === 'all') {
      const words = text.split(/\s+/).length;
      const avgWordLength = text.replace(/\s+/g, '').length / words;
      const sentences = text.split(/[.!?]+/).length - 1;

      analysis.complexity = {
        wordCount: words,
        sentenceCount: sentences,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        readabilityScore: includeScores
          ? Math.max(0, 100 - avgWordLength * 10)
          : undefined,
        level:
          avgWordLength > 6
            ? 'complex'
            : avgWordLength > 4
            ? 'moderate'
            : 'simple',
      };
    }

    if (analysisType === 'themes' || analysisType === 'all') {
      // Extract key themes (simplified)
      const technicalTerms =
        text.match(
          /\b(AI|API|streaming|workflow|decorator|enterprise|typescript|nestjs)\b/gi
        ) || [];
      const businessTerms =
        text.match(
          /\b(showcase|demonstration|platform|solution|integration|production)\b/gi
        ) || [];

      analysis.themes = {
        technical: [...new Set(technicalTerms.map((t) => t.toLowerCase()))],
        business: [...new Set(businessTerms.map((t) => t.toLowerCase()))],
        dominantCategory:
          technicalTerms.length > businessTerms.length
            ? 'technical'
            : 'business',
      };
    }

    return {
      ...analysis,
      metadata: {
        processingTime: Math.round(Math.random() * 100) + 50,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  @Tool({
    name: 'generate_improvement_suggestions',
    description:
      'Generate suggestions to improve text content based on analysis',
    schema: z.object({
      text: z.string().min(10),
      analysisResults: z.object({
        sentiment: z.any().optional(),
        complexity: z.any().optional(),
        themes: z.any().optional(),
      }),
      targetAudience: z
        .enum(['technical', 'business', 'general'])
        .default('general'),
      improvementAreas: z
        .array(
          z.enum(['clarity', 'engagement', 'technical-accuracy', 'brevity'])
        )
        .default(['clarity']),
    }),
    agents: ['advanced-showcase', 'specialist-showcase'],
    examples: [
      {
        input: {
          text: 'Our AI is good.',
          analysisResults: { sentiment: { label: 'neutral' } },
          improvementAreas: ['engagement'],
        },
        output: {
          suggestions: [
            'Add specific examples of AI capabilities',
            'Use more engaging adjectives like "innovative" or "cutting-edge"',
          ],
        },
      },
    ],
    tags: ['improvement', 'suggestions', 'content'],
    version: '1.0.0',
  })
  async generateImprovementSuggestions({
    text,
    analysisResults,
    targetAudience,
    improvementAreas,
  }: {
    text: string;
    analysisResults: any;
    targetAudience: 'technical' | 'business' | 'general';
    improvementAreas: string[];
  }) {
    this.logger.debug(`Generating improvements for ${targetAudience} audience`);

    const suggestions: string[] = [];

    // Sentiment-based suggestions
    if (analysisResults.sentiment?.label === 'negative') {
      suggestions.push(
        'Consider reframing negative statements in a more constructive way'
      );
      suggestions.push(
        'Add positive aspects or solutions alongside challenges mentioned'
      );
    } else if (analysisResults.sentiment?.label === 'neutral') {
      suggestions.push(
        'Add more engaging language to create emotional connection'
      );
      suggestions.push(
        'Include specific benefits or outcomes to increase appeal'
      );
    }

    // Complexity-based suggestions
    if (
      analysisResults.complexity?.level === 'complex' &&
      targetAudience === 'general'
    ) {
      suggestions.push(
        'Simplify technical jargon for broader audience understanding'
      );
      suggestions.push(
        'Break long sentences into shorter, more digestible parts'
      );
    } else if (
      analysisResults.complexity?.level === 'simple' &&
      targetAudience === 'technical'
    ) {
      suggestions.push(
        'Add more specific technical details for expert audience'
      );
      suggestions.push('Include relevant technical terminology and concepts');
    }

    // Improvement area specific suggestions
    if (improvementAreas.includes('clarity')) {
      suggestions.push(
        'Use more specific examples to illustrate abstract concepts'
      );
      suggestions.push(
        'Structure content with clear headings or bullet points'
      );
    }

    if (improvementAreas.includes('engagement')) {
      suggestions.push('Start with a compelling question or statement');
      suggestions.push('Include relevant statistics or success stories');
    }

    if (improvementAreas.includes('brevity')) {
      suggestions.push('Remove redundant phrases and unnecessary qualifiers');
      suggestions.push('Combine related sentences for better flow');
    }

    if (improvementAreas.includes('technical-accuracy')) {
      suggestions.push('Verify technical claims with current documentation');
      suggestions.push('Include version numbers for technology references');
    }

    return {
      suggestions: suggestions.slice(0, 5), // Limit to top 5
      targetAudience,
      improvementAreas,
      priority: suggestions.length > 3 ? 'high' : 'medium',
      estimatedImpact: Math.round((suggestions.length / 5) * 100),
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  @Tool({
    name: 'stream_analysis_progress',
    description: 'Stream real-time analysis progress updates',
    schema: z.object({
      text: z.string().min(1),
      steps: z
        .array(z.string())
        .default(['preprocessing', 'analysis', 'insights', 'finalization']),
    }),
    streaming: true,
    agents: '*', // Available to all agents
    tags: ['streaming', 'progress', 'analysis'],
    version: '1.0.0',
  })
  async *streamAnalysisProgress({
    text,
    steps,
  }: {
    text: string;
    steps: string[];
  }) {
    const totalSteps = steps.length;

    for (let i = 0; i < totalSteps; i++) {
      const step = steps[i];
      const progress = ((i + 1) / totalSteps) * 100;

      yield {
        step,
        progress,
        status: 'processing',
        message: `Executing ${step}...`,
        timestamp: new Date().toISOString(),
      };

      // Simulate processing time
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 1000)
      );

      yield {
        step,
        progress,
        status: 'completed',
        message: `${step} completed successfully`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'finished',
      progress: 100,
      message: 'Analysis completed',
      results: {
        textLength: text.length,
        stepsCompleted: totalSteps,
        duration: totalSteps * 750, // Approximate duration
      },
    };
  }
}
