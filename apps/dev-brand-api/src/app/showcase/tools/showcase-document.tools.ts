import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '@hive-academy/langgraph-multi-agent';

// Type definitions for zero-config tool results
interface EntityExtractionResult {
  entities: Array<{ text: string; type: string; confidence: number }>;
  entitiesByType: Record<string, any[]>;
  totalEntities: number;
  entityTypes: string[];
  confidenceThreshold: number;
  averageConfidence: number;
  extractedAt: string;
  relationships?: Array<{
    source: string;
    relation: string;
    target: string;
    confidence: number;
  }>;
  totalRelationships?: number;
}

/**
 * 📄 SHOWCASE DOCUMENT TOOLS - DOCUMENT PROCESSING & ANALYSIS
 *
 * Demonstrates zero-config @Tool decorator pattern:
 * ✅ No complex configuration - inherits from MultiAgentModule.forRoot()
 * ✅ Method names become tool names automatically
 * ✅ TypeScript types auto-inferred for schemas
 * ✅ Rate limiting, examples, and versioning managed globally
 * ✅ Agent access controlled by central configuration
 * ✅ Massive simplification while maintaining full functionality
 *
 * Features:
 * - URL content extraction and analysis
 * - Document summarization with different styles
 * - Entity extraction and relationship mapping
 * - Content quality assessment
 * - Multi-format document support
 */
@Injectable()
export class ShowcaseDocumentTools {
  private readonly logger = new Logger(ShowcaseDocumentTools.name);

  @Tool() // ✅ Zero-config! Inherits ALL settings from MultiAgentModule.forRoot()
  async extractUrlContent({
    url,
    includeMetadata,
    maxContentLength,
    contentType,
  }: {
    url: string;
    includeMetadata: boolean;
    maxContentLength: number;
    contentType: 'text' | 'markdown' | 'structured';
  }) {
    this.logger.log(`📄 Extracting content from: ${url}`);

    try {
      // In production, use a robust web scraping library like Puppeteer or Playwright
      // For demonstration, we'll simulate content extraction
      const mockContent = await this.simulateContentExtraction(
        url,
        maxContentLength
      );

      const result = {
        url,
        title: mockContent.title,
        content: this.formatContent(mockContent.content, contentType),
        wordCount: mockContent.content.split(' ').length,
        extractedAt: new Date().toISOString(),
        contentType,
      };

      if (includeMetadata) {
        result['metadata'] = {
          description: mockContent.description,
          publishDate: mockContent.publishDate,
          author: mockContent.author,
          domain: new URL(url).hostname,
          language: 'en', // Could be detected
          readingTime: Math.ceil(result.wordCount / 200), // Words per minute
        };
      }

      this.logger.log(`✅ Extracted ${result.wordCount} words from ${url}`);
      return result;
    } catch (error: any) {
      this.logger.error(
        `❌ Content extraction failed for ${url}:`,
        error.message
      );

      return {
        url,
        error: error.message,
        extractedAt: new Date().toISOString(),
        success: false,
      };
    }
  }

  @Tool() // ✅ Zero-config! Inherits name from method, schema auto-inferred, agent access controlled by MultiAgentModule.forRoot()
  async summarizeDocument({
    content,
    summaryStyle,
    length,
    focusAreas,
    includeKeyQuotes,
  }: {
    content: string;
    summaryStyle: 'executive' | 'technical' | 'bullet-points' | 'narrative';
    length: 'short' | 'medium' | 'long';
    focusAreas?: string[];
    includeKeyQuotes: boolean;
  }) {
    this.logger.log(
      `📝 Summarizing document (${summaryStyle} style, ${length} length)`
    );

    try {
      // Analyze content structure
      const analysis = this.analyzeDocumentStructure(content);

      // Generate summary based on style and length
      const summary = this.generateSummary(
        content,
        summaryStyle,
        length,
        focusAreas
      );

      // Extract key points
      const keyPoints = this.extractKeyPoints(
        content,
        Math.min(analysis.paragraphs, 8)
      );

      // Extract quotes if requested
      const quotes = includeKeyQuotes ? this.extractKeyQuotes(content) : [];

      const result = {
        summary,
        keyPoints,
        summaryStyle,
        length,
        confidence: this.calculateSummaryConfidence(content, summary),
        readingTime: this.estimateReadingTime(summary),
        originalWordCount: content.split(' ').length,
        summaryWordCount: summary.split(' ').length,
        compressionRatio: Math.round(
          (summary.split(' ').length / content.split(' ').length) * 100
        ),
        focusAreas: focusAreas || [],
        generatedAt: new Date().toISOString(),
      };

      if (includeKeyQuotes && quotes.length > 0) {
        result['keyQuotes'] = quotes;
      }

      this.logger.log(
        `✅ Summary generated (${result.compressionRatio}% compression)`
      );
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Summarization failed:`, error.message);

      return {
        error: error.message,
        summaryStyle,
        length,
        generatedAt: new Date().toISOString(),
        success: false,
      };
    }
  }

  @Tool() // ✅ Zero-config! Rate limits, examples, and versioning managed centrally
  async extractEntities({
    content,
    entityTypes,
    includeRelationships,
    confidenceThreshold,
  }: {
    content: string;
    entityTypes: string[];
    includeRelationships: boolean;
    confidenceThreshold: number;
  }) {
    this.logger.log(
      `🏷️ Extracting entities from content (${entityTypes.join(', ')})`
    );

    try {
      const entities = this.performEntityExtraction(
        content,
        entityTypes,
        confidenceThreshold
      );
      const relationships = includeRelationships
        ? this.extractRelationships(content, entities)
        : [];

      // Group entities by type
      const entitiesByType = entityTypes.reduce((acc, type) => {
        acc[type] = entities.filter((e) => e.type === type);
        return acc;
      }, {} as Record<string, any[]>);

      const result: EntityExtractionResult = {
        entities,
        entitiesByType,
        totalEntities: entities.length,
        entityTypes: entityTypes,
        confidenceThreshold,
        averageConfidence:
          entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length,
        extractedAt: new Date().toISOString(),
      };

      if (includeRelationships) {
        result.relationships = relationships;
        result.totalRelationships = relationships.length;
      }

      this.logger.log(
        `✅ Extracted ${entities.length} entities, ${relationships.length} relationships`
      );
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Entity extraction failed:`, error.message);

      return {
        error: error.message,
        entities: [],
        totalEntities: 0,
        extractedAt: new Date().toISOString(),
        success: false,
      };
    }
  }

  @Tool() // ✅ Zero-config! Quality assessment parameters inherited from global MultiAgent configuration
  async assessContentQuality({
    content,
    qualityDimensions,
    targetAudience,
    includeRecommendations,
  }: {
    content: string;
    qualityDimensions: string[];
    targetAudience: 'general' | 'technical' | 'academic' | 'business';
    includeRecommendations: boolean;
  }) {
    this.logger.log(
      `📊 Assessing content quality (${qualityDimensions.join(
        ', '
      )}) for ${targetAudience} audience`
    );

    try {
      const dimensionScores: Record<string, number> = {};
      const recommendations: string[] = [];

      // Assess each quality dimension
      for (const dimension of qualityDimensions) {
        const { score, recs } = this.assessQualityDimension(
          content,
          dimension,
          targetAudience
        );
        dimensionScores[dimension] = score;
        if (includeRecommendations) {
          recommendations.push(...recs);
        }
      }

      const overallScore =
        Object.values(dimensionScores).reduce((sum, score) => sum + score, 0) /
        qualityDimensions.length;

      const result = {
        overallScore: Math.round(overallScore * 10) / 10,
        grade: this.calculateGrade(overallScore),
        dimensionScores,
        qualityDimensions,
        targetAudience,
        contentStats: {
          wordCount: content.split(' ').length,
          sentenceCount: (content.match(/[.!?]+/g) || []).length,
          paragraphCount: content.split('\n\n').length,
          avgWordsPerSentence: Math.round(
            content.split(' ').length /
              ((content.match(/[.!?]+/g) || []).length || 1)
          ),
        },
        assessedAt: new Date().toISOString(),
      };

      if (includeRecommendations) {
        result['recommendations'] = [...new Set(recommendations)].slice(0, 10); // Remove duplicates, limit to 10
        result['improvementPotential'] =
          this.calculateImprovementPotential(dimensionScores);
      }

      this.logger.log(
        `✅ Quality assessment complete: ${result.grade} (${result.overallScore}/10)`
      );
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Quality assessment failed:`, error.message);

      return {
        error: error.message,
        overallScore: 0,
        assessedAt: new Date().toISOString(),
        success: false,
      };
    }
  }

  // Helper methods for document processing

  private async simulateContentExtraction(url: string, maxLength: number) {
    // Simulate realistic web content extraction
    const domain = new URL(url).hostname;

    return {
      title: `Sample Article from ${domain}`,
      content: `This is extracted content from ${url}. `
        .repeat(Math.floor(maxLength / 50))
        .substring(0, maxLength),
      description: `A comprehensive article about various topics from ${domain}`,
      publishDate: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0],
      author: 'Content Author',
    };
  }

  private formatContent(
    content: string,
    contentType: 'text' | 'markdown' | 'structured'
  ): string {
    switch (contentType) {
      case 'markdown':
        return content.replace(/\n\n/g, '\n\n## Section\n\n');
      case 'structured':
        return JSON.stringify(
          {
            introduction: content.substring(0, 200),
            body: content.substring(200, -200),
            conclusion: content.substring(-200),
          },
          null,
          2
        );
      default:
        return content;
    }
  }

  private analyzeDocumentStructure(content: string) {
    return {
      wordCount: content.split(' ').length,
      sentences: (content.match(/[.!?]+/g) || []).length,
      paragraphs: content.split('\n\n').length,
      avgWordsPerSentence:
        content.split(' ').length /
        ((content.match(/[.!?]+/g) || []).length || 1),
    };
  }

  private generateSummary(
    content: string,
    style: string,
    length: string,
    focusAreas?: string[]
  ): string {
    const words = content.split(' ');
    const targetLength =
      length === 'short' ? 100 : length === 'medium' ? 200 : 400;

    const baseContent = words.slice(0, targetLength).join(' ');

    switch (style) {
      case 'executive':
        return `EXECUTIVE SUMMARY: ${baseContent}... This analysis demonstrates key strategic insights and business implications.`;
      case 'technical':
        return `TECHNICAL OVERVIEW: ${baseContent}... The implementation details and architectural considerations are outlined above.`;
      case 'bullet-points':
        return baseContent
          .split('. ')
          .filter((s) => s.length > 10)
          .slice(0, 5)
          .map((s) => `• ${s.trim()}`)
          .join('\n');
      case 'narrative':
        return `This document presents ${baseContent}... The comprehensive analysis reveals important insights for stakeholders.`;
      default:
        return baseContent;
    }
  }

  private extractKeyPoints(content: string, maxPoints: number): string[] {
    return content
      .split('. ')
      .filter((sentence) => sentence.length > 20 && sentence.length < 200)
      .slice(0, maxPoints)
      .map((point) => point.trim());
  }

  private extractKeyQuotes(content: string): string[] {
    // Simple quote extraction - look for quoted text or important statements
    const quotes = content.match(/"[^"]{20,200}"/g) || [];
    return quotes.slice(0, 3).map((q) => q.replace(/"/g, ''));
  }

  private calculateSummaryConfidence(
    original: string,
    summary: string
  ): number {
    const originalLength = original.split(' ').length;
    const summaryLength = summary.split(' ').length;
    const compressionRatio = summaryLength / originalLength;

    // Higher confidence for appropriate compression ratios
    if (compressionRatio > 0.1 && compressionRatio < 0.3) return 0.9;
    if (compressionRatio > 0.05 && compressionRatio < 0.5) return 0.8;
    return 0.7;
  }

  private estimateReadingTime(text: string): string {
    const words = text.split(' ').length;
    const minutes = Math.ceil(words / 200); // 200 words per minute
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  private performEntityExtraction(
    content: string,
    entityTypes: string[],
    threshold: number
  ) {
    // Simplified entity extraction for demonstration
    const entities: Array<{ text: string; type: string; confidence: number }> =
      [];

    if (entityTypes.includes('organization')) {
      const orgs =
        content.match(
          /\b(OpenAI|Google|Microsoft|Apple|Amazon|Meta|Tesla|Netflix)\b/gi
        ) || [];
      orgs.forEach((org) =>
        entities.push({
          text: org,
          type: 'organization',
          confidence: 0.9 + Math.random() * 0.1,
        })
      );
    }

    if (entityTypes.includes('technology')) {
      const techs =
        content.match(
          /\b(AI|GPT|API|JavaScript|TypeScript|React|Angular|Node\.js|Python|Docker|Kubernetes)\b/gi
        ) || [];
      techs.forEach((tech) =>
        entities.push({
          text: tech,
          type: 'technology',
          confidence: 0.85 + Math.random() * 0.1,
        })
      );
    }

    if (entityTypes.includes('date')) {
      const dates =
        content.match(
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
        ) || [];
      dates.forEach((date) =>
        entities.push({
          text: date,
          type: 'date',
          confidence: 0.95 + Math.random() * 0.05,
        })
      );
    }

    return entities.filter((e) => e.confidence >= threshold);
  }

  private extractRelationships(content: string, entities: any[]) {
    // Simple relationship extraction based on proximity
    const relationships: Array<{
      source: string;
      relation: string;
      target: string;
      confidence: number;
    }> = [];

    entities.forEach((entity1, i) => {
      entities.slice(i + 1).forEach((entity2) => {
        const entity1Index = content.indexOf(entity1.text);
        const entity2Index = content.indexOf(entity2.text);

        if (Math.abs(entity1Index - entity2Index) < 200) {
          // Close proximity
          relationships.push({
            source: entity1.text,
            relation: 'related_to',
            target: entity2.text,
            confidence: 0.7 + Math.random() * 0.2,
          });
        }
      });
    });

    return relationships.slice(0, 10); // Limit relationships
  }

  private assessQualityDimension(
    content: string,
    dimension: string,
    audience: string
  ): { score: number; recs: string[] } {
    const recommendations: string[] = [];
    let score = 5; // Base score

    switch (dimension) {
      case 'readability': {
        const avgWordLength =
          content.replace(/\s+/g, '').length / content.split(' ').length;
        score =
          audience === 'technical'
            ? Math.max(1, 10 - avgWordLength)
            : Math.max(1, 12 - avgWordLength * 1.5);

        if (score < 7)
          recommendations.push('Simplify vocabulary for better readability');
        break;
      }
      case 'structure': {
        const hasHeadings =
          /#{1,6}\s/.test(content) || /\n[A-Z][^.]*:/.test(content);
        const hasParagraphs = content.split('\n\n').length > 2;
        score = (hasHeadings ? 5 : 0) + (hasParagraphs ? 5 : 0);

        if (!hasHeadings)
          recommendations.push('Add clear headings and sections');
        if (!hasParagraphs)
          recommendations.push('Break content into logical paragraphs');
        break;
      }
      case 'coherence': {
        const sentences = content
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0);
        const coherenceScore =
          sentences.length > 5 ? 8 : sentences.length * 1.5;
        score = Math.min(10, coherenceScore);

        if (score < 7)
          recommendations.push('Improve logical flow between ideas');
        break;
      }
      default:
        score = 7 + Math.random() * 2; // Default scoring
    }

    return { score: Math.round(score * 10) / 10, recs: recommendations };
  }

  private calculateGrade(score: number): string {
    if (score >= 9) return 'A+';
    if (score >= 8.5) return 'A';
    if (score >= 8) return 'A-';
    if (score >= 7.5) return 'B+';
    if (score >= 7) return 'B';
    if (score >= 6.5) return 'B-';
    if (score >= 6) return 'C+';
    if (score >= 5.5) return 'C';
    if (score >= 5) return 'C-';
    return 'D';
  }

  private calculateImprovementPotential(
    scores: Record<string, number>
  ): string {
    const avgScore =
      Object.values(scores).reduce((sum, score) => sum + score, 0) /
      Object.values(scores).length;
    const potential = (10 - avgScore) / 10;

    if (potential > 0.4) return 'High';
    if (potential > 0.2) return 'Medium';
    return 'Low';
  }
}
