import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ContentCategory = 'code' | 'documentation' | 'configuration' | 'workflow' | 'task' | 'test' | 'data' | 'general';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

export interface ExtractedMetadata {
  category?: ContentCategory;
  complexity?: ComplexityLevel;
  topics?: string[];
  keywords?: string[];
  headings?: Array<{ level: number; text: string }>;
  codeLanguage?: string;
  readingTimeMinutes?: number;
  crossReferences?: string[];
  hasCodeBlocks?: boolean;
  codeBlockCount?: number;
  hasTables?: boolean;
  hasLists?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
  // Workflow specific
  workflowType?: string;
  agentType?: string;
  stepName?: string;
  // Task specific
  taskType?: string;
  priority?: string;
  // Code specific
  imports?: string[];
  exports?: string[];
  functions?: string[];
  classes?: string[];
}

/**
 * Service for extracting rich metadata from text content
 * Generalized from researcher agent's metadata extraction
 */
@Injectable()
export class MetadataExtractorService {
  private readonly logger = new Logger(MetadataExtractorService.name);
  private readonly WORDS_PER_MINUTE = 200;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Extract all metadata from content
   */
  async extractMetadata(
    content: string,
    options: {
      contentType?: string;
      extractTopics?: boolean;
      extractKeywords?: boolean;
      analyzeComplexity?: boolean;
      calculateReadingTime?: boolean;
      detectCrossReferences?: boolean;
      extractCodeMetadata?: boolean;
    } = {}
  ): Promise<ExtractedMetadata> {
    const metadata: ExtractedMetadata = {};

    // Auto-categorize content
    metadata.category = this.categorizeContent(content, options.contentType);

    // Extract headings
    metadata.headings = this.extractHeadings(content);

    // Analyze complexity
    if (options.analyzeComplexity) {
      metadata.complexity = this.analyzeComplexity(content, metadata.category);
    }

    // Extract topics
    if (options.extractTopics) {
      metadata.topics = this.extractTopics(content);
    }

    // Extract keywords
    if (options.extractKeywords) {
      metadata.keywords = this.extractKeywords(content);
    }

    // Calculate reading time
    if (options.calculateReadingTime) {
      metadata.readingTimeMinutes = this.calculateReadingTime(content);
    }

    // Detect cross-references
    if (options.detectCrossReferences) {
      metadata.crossReferences = this.detectCrossReferences(content);
    }

    // Extract code-specific metadata
    if (options.extractCodeMetadata && metadata.category === 'code') {
      const codeMetadata = this.extractCodeMetadata(content);
      Object.assign(metadata, codeMetadata);
    }

    // Detect content features
    metadata.hasCodeBlocks = this.hasCodeBlocks(content);
    metadata.codeBlockCount = this.countCodeBlocks(content);
    metadata.hasTables = this.hasTables(content);
    metadata.hasLists = this.hasLists(content);

    // Set confidence score
    metadata.confidence = this.calculateConfidence(metadata);

    return metadata;
  }

  /**
   * Categorize content based on patterns and keywords
   */
  categorizeContent(content: string, hint?: string): ContentCategory {
    // Use hint if provided
    if (hint) {
      if (hint.includes('workflow')) return 'workflow';
      if (hint.includes('task')) return 'task';
      if (hint.includes('test')) return 'test';
      if (hint.includes('config')) return 'configuration';
    }

    // Pattern-based detection
    const patterns = {
      code: [
        /^import\s+/m,
        /^export\s+/m,
        /^class\s+\w+/m,
        /^function\s+\w+/m,
        /^const\s+\w+\s*=/m,
        /^interface\s+\w+/m,
      ],
      documentation: [
        /^#{1,6}\s+/m,
        /^\*\s+/m,
        /^>\s+/m,
        /\[.*\]\(.*\)/,
        /^```/m,
      ],
      configuration: [
        /^{\s*".*":/m,
        /^---\n/m,
        /^\w+:\s*$/m,
        /\.env/i,
        /config/i,
      ],
      workflow: [
        /workflow/i,
        /execution/i,
        /checkpoint/i,
        /state machine/i,
        /langgraph/i,
      ],
      task: [
        /task/i,
        /todo/i,
        /requirement/i,
        /user story/i,
        /acceptance criteria/i,
      ],
      test: [
        /describe\(/,
        /it\(/,
        /test\(/,
        /expect\(/,
        /assert/i,
      ],
    };

    // Count matches for each category
    const scores: Record<string, number> = {};
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      scores[category] = categoryPatterns.filter(pattern =>
        pattern.test(content)
      ).length;
    }

    // Return category with highest score
    const topCategory = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];

    return (topCategory && topCategory[1] > 0
      ? topCategory[0]
      : 'general') as ContentCategory;
  }

  /**
   * Analyze content complexity
   */
  analyzeComplexity(content: string, category: ContentCategory): ComplexityLevel {
    let score = 0;

    // Length-based scoring
    const lines = content.split('\n').length;
    if (lines > 100) score += 2;
    else if (lines > 50) score += 1;

    // Category-specific analysis
    switch (category) {
      case 'code':
        // Check for complex patterns
        if (/async\s+function|Promise|Observable/i.test(content)) score += 1;
        if (/class.*extends|implements/i.test(content)) score += 1;
        if (/generic|<.*>/i.test(content)) score += 1;
        break;

      case 'workflow':
        // Check for state complexity
        if (/parallel|concurrent/i.test(content)) score += 2;
        if (/condition|branch/i.test(content)) score += 1;
        break;

      case 'documentation': {
        // Check for structure complexity
        const headingLevels = (content.match(/^#{1,6}\s+/gm) || []).length;
        if (headingLevels > 10) score += 2;
        else if (headingLevels > 5) score += 1;
        break;
      }
    }

    // Check for technical terms
    const technicalTerms = /algorithm|architecture|implementation|optimization|concurrency/gi;
    const techMatches = (content.match(technicalTerms) || []).length;
    if (techMatches > 5) score += 1;

    // Determine complexity level
    if (score >= 4) return 'complex';
    if (score >= 2) return 'moderate';
    return 'simple';
  }

  /**
   * Extract topics using NLP patterns
   */
  extractTopics(content: string): string[] {
    const topics = new Set<string>();

    // Extract from headings
    const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
    headings.forEach(h => {
      const topic = h.replace(/^#{1,6}\s+/, '').trim();
      if (topic.length > 3 && topic.length < 50) {
        topics.add(topic.toLowerCase());
      }
    });

    // Extract from emphasized text
    const emphasized = content.match(/\*\*(.+?)\*\*/g) || [];
    emphasized.forEach(e => {
      const topic = e.replace(/\*\*/g, '').trim();
      if (topic.length > 3 && topic.length < 30) {
        topics.add(topic.toLowerCase());
      }
    });

    // Extract technical terms
    const patterns = [
      /\b(api|service|component|module|function|class|interface)\s+\w+/gi,
      /\b\w+(?:Service|Controller|Component|Module|Factory|Provider)\b/g,
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        if (match.length < 30) {
          topics.add(match.toLowerCase());
        }
      });
    });

    return Array.from(topics).slice(0, 10); // Limit to top 10 topics
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content: string): string[] {
    const keywords = new Set<string>();

    // Common technical keywords
    const technicalKeywords = [
      'async', 'await', 'promise', 'observable', 'stream',
      'api', 'rest', 'graphql', 'websocket',
      'database', 'query', 'index', 'cache',
      'authentication', 'authorization', 'security',
      'performance', 'optimization', 'scale',
    ];

    technicalKeywords.forEach(keyword => {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(content)) {
        keywords.add(keyword);
      }
    });

    // Extract from code patterns
    const codePatterns = [
      /import\s+.*?from\s+['"](.+?)['"]/g,
      /class\s+(\w+)/g,
      /interface\s+(\w+)/g,
      /function\s+(\w+)/g,
      /const\s+(\w+)/g,
    ];

    codePatterns.forEach(pattern => {
      const matches = Array.from(content.matchAll(pattern));
      matches.forEach(match => {
        if (match[1] && match[1].length > 2 && match[1].length < 30) {
          keywords.add(match[1].toLowerCase());
        }
      });
    });

    return Array.from(keywords).slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Calculate reading time in minutes
   */
  calculateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / this.WORDS_PER_MINUTE);
  }

  /**
   * Detect cross-references to other documents or sections
   */
  detectCrossReferences(content: string): string[] {
    const references = new Set<string>();

    // Markdown links
    const links = content.match(/\[.*?\]\((.*?)\)/g) || [];
    links.forEach(link => {
      const url = link.match(/\((.*?)\)/)?.[1];
      if (url) references.add(url);
    });

    // File references
    const fileRefs = content.match(/(?:from|import|require)\s+['"](.+?)['"]/g) || [];
    fileRefs.forEach(ref => {
      const file = ref.match(/['"](.+?)['"]/)?.[1];
      if (file) references.add(file);
    });

    // Document IDs or task references
    const idRefs = content.match(/\b(?:TASK|DOC|WF|REQ)[-_]\w+/g) || [];
    idRefs.forEach(ref => references.add(ref));

    return Array.from(references);
  }

  /**
   * Extract code-specific metadata
   */
  extractCodeMetadata(content: string): Partial<ExtractedMetadata> {
    const metadata: Partial<ExtractedMetadata> = {};

    // Detect language
    metadata.codeLanguage = this.detectCodeLanguage(content);

    // Extract imports
    const imports = content.match(/(?:import|require)\s+.*?(?:from\s+)?['"](.+?)['"]/g) || [];
    metadata.imports = imports.map(i => i.match(/['"](.+?)['"]/)?.[1] || '').filter(Boolean);

    // Extract exports
    const exports = content.match(/export\s+(?:default\s+)?(?:class|function|const|interface)\s+(\w+)/g) || [];
    metadata.exports = exports.map(e => e.match(/\s+(\w+)$/)?.[1] || '').filter(Boolean);

    // Extract functions
    const functions = content.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|async)/g) || [];
    metadata.functions = functions.map(f => f.match(/\s+(\w+)/)?.[1] || '').filter(Boolean);

    // Extract classes
    const classes = content.match(/class\s+(\w+)/g) || [];
    metadata.classes = classes.map(c => c.match(/class\s+(\w+)/)?.[1] || '').filter(Boolean);

    return metadata;
  }

  /**
   * Detect programming language from content
   */
  private detectCodeLanguage(content: string): string {
    const patterns: Record<string, RegExp[]> = {
      typescript: [/:\s*\w+(?:<.*?>)?(?:\[\])?/g, /interface\s+\w+/g, /type\s+\w+\s*=/g],
      javascript: [/function\s+\w+/g, /const\s+\w+\s*=/g, /=>/g],
      python: [/def\s+\w+/g, /import\s+\w+/g, /if\s+__name__/g],
      java: [/public\s+class/g, /private\s+\w+/g, /package\s+\w+/g],
      csharp: [/namespace\s+\w+/g, /public\s+class/g, /using\s+\w+/g],
    };

    const scores: Record<string, number> = {};
    for (const [lang, langPatterns] of Object.entries(patterns)) {
      scores[lang] = langPatterns.filter(p => p.test(content)).length;
    }

    const topLang = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
    return topLang && topLang[1] > 0 ? topLang[0] : 'plaintext';
  }

  /**
   * Extract headings from content
   */
  private extractHeadings(content: string): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];

    // Markdown headings
    const mdHeadings = content.match(/^(#{1,6})\s+(.+)$/gm) || [];
    mdHeadings.forEach(h => {
      const match = h.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim()
        });
      }
    });

    return headings;
  }

  /**
   * Check if content has code blocks
   */
  private hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/g.test(content) || /^ {4}\S/m.test(content);
  }

  /**
   * Count code blocks in content
   */
  private countCodeBlocks(content: string): number {
    const fenced = (content.match(/```[\s\S]*?```/g) || []).length;
    const indented = (content.match(/^( {4}|\t).+$/gm) || []).length / 4; // Rough estimate
    return fenced + Math.floor(indented);
  }

  /**
   * Check if content has tables
   */
  private hasTables(content: string): boolean {
    return /\|.*\|.*\|/g.test(content) || /<table/i.test(content);
  }

  /**
   * Check if content has lists
   */
  private hasLists(content: string): boolean {
    return /^[\s]*[-*+]\s+/m.test(content) || /^[\s]*\d+\.\s+/m.test(content);
  }

  /**
   * Calculate confidence score for extracted metadata
   */
  private calculateConfidence(metadata: ExtractedMetadata): number {
    let score = 0.5; // Base confidence

    // Increase confidence based on extracted features
    if (metadata.category && metadata.category !== 'general') score += 0.1;
    if (metadata.topics && metadata.topics.length > 0) score += 0.1;
    if (metadata.keywords && metadata.keywords.length > 3) score += 0.1;
    if (metadata.headings && metadata.headings.length > 0) score += 0.1;
    if (metadata.complexity) score += 0.05;
    if (metadata.codeLanguage && metadata.codeLanguage !== 'plaintext') score += 0.05;

    return Math.min(score, 1.0);
  }
}
