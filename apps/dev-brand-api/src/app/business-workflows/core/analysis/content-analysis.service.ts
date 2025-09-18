import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '@hive-academy/langgraph-multi-agent';

/**
 * ContentAnalysisService
 * Consolidated from ShowcaseAnalysisTools with reduced surface and clearer domain naming.
 */
@Injectable()
export class ContentAnalysisService {
  private readonly logger = new Logger(ContentAnalysisService.name);

  @Tool({ description: 'Analyze text content for sentiment, complexity, and themes' })
  async analyzeTextContent(params: {
    text: string;
    analysisType: 'sentiment' | 'complexity' | 'themes' | 'all';
    includeScores: boolean;
  }) {
    const { text, analysisType, includeScores } = params;
    this.logger.debug(`Analyzing text length=${text.length}`);
    const analysis: Record<string, any> = {};

    if (analysisType === 'sentiment' || analysisType === 'all') {
      const positive = ['amazing', 'great', 'excellent', 'wonderful', 'fantastic'];
      const negative = ['terrible', 'awful', 'bad', 'horrible', 'disappointing'];
      const lower = text.toLowerCase();
      const posCount = positive.filter((w) => lower.includes(w)).length;
      const negCount = negative.filter((w) => lower.includes(w)).length;
      const label = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';
      const score = Math.min(Math.max((posCount - negCount + 5) / 10, 0), 1);
      analysis.sentiment = { label, score: includeScores ? score : undefined };
    }
    if (analysisType === 'complexity' || analysisType === 'all') {
      const words = text.split(/\s+/).filter(Boolean).length || 1;
      const avgLen = text.replace(/\s+/g, '').length / words;
      const sentences = (text.match(/[.!?]+/g) || []).length;
      analysis.complexity = {
        wordCount: words,
        sentenceCount: sentences,
        avgWordLength: Math.round(avgLen * 10) / 10,
        level: avgLen > 6 ? 'complex' : avgLen > 4 ? 'moderate' : 'simple',
      };
    }
    if (analysisType === 'themes' || analysisType === 'all') {
      const technical = (text.match(/\b(AI|API|streaming|workflow|typescript|nestjs)\b/gi) || []).map((t) => t.toLowerCase());
      analysis.themes = { technical: [...new Set(technical)] };
    }
    return { ...analysis, metadata: { ts: Date.now() } };
  }

  @Tool({ description: 'Generate improvement suggestions from prior analysis' })
  async generateImprovementSuggestions(args: {
    text: string;
    analysisResults: any;
    targetAudience: 'technical' | 'business' | 'general';
    improvementAreas: string[];
  }) {
    const { analysisResults, targetAudience, improvementAreas } = args;
    const suggestions: string[] = [];
    if (analysisResults.sentiment?.label === 'negative') suggestions.push('Reframe negative statements more constructively');
    if (analysisResults.complexity?.level === 'complex' && targetAudience === 'general') suggestions.push('Simplify terminology for general audience');
    if (improvementAreas.includes('clarity')) suggestions.push('Add concrete examples for abstract claims');
    return { suggestions: suggestions.slice(0, 5), targetAudience };
  }
}
