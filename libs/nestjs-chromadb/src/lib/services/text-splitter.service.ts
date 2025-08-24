import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
  CharacterTextSplitter,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitterParams,
} from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { MetadataExtractorService, ExtractedMetadata } from './metadata-extractor.service';

export interface TextSplitterOptions {
  strategy?: 'recursive' | 'token' | 'character' | 'markdown' | 'semantic';
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  keepSeparator?: boolean;
  lengthFunction?: (text: string) => number;
  // For token-based splitting
  encodingName?: string;
  allowedSpecial?: 'all' | Array<string>;
  disallowedSpecial?: 'all' | Array<string>;
  // Enhanced metadata extraction options
  extractMetadata?: boolean;
  extractTopics?: boolean;
  extractKeywords?: boolean;
  analyzeComplexity?: boolean;
  calculateReadingTime?: boolean;
  detectCrossReferences?: boolean;
  extractCodeMetadata?: boolean;
}

export interface ChunkedDocument {
  id: string;
  content: string;
  metadata: {
    parentId: string;
    chunkIndex: number;
    totalChunks: number;
    startIndex?: number;
    endIndex?: number;
    [key: string]: any;
  } & Partial<ExtractedMetadata>; // Include extracted metadata
}

/**
 * Service for splitting text into chunks for embedding
 * Supports multiple strategies optimized for different content types
 */
@Injectable()
export class TextSplitterService {
  private readonly logger = new Logger(TextSplitterService.name);
  private readonly defaultChunkSize: number;
  private readonly defaultChunkOverlap: number;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly metadataExtractor?: MetadataExtractorService
  ) {
    this.defaultChunkSize = this.configService.get('EMBEDDING_CHUNK_SIZE', 1000);
    this.defaultChunkOverlap = this.configService.get('EMBEDDING_CHUNK_OVERLAP', 200);
  }

  /**
   * Split text into chunks using the specified strategy
   */
  async splitText(
    text: string,
    options: TextSplitterOptions = {},
  ): Promise<string[]> {
    const {
      strategy = 'recursive',
      chunkSize = this.defaultChunkSize,
      chunkOverlap = this.defaultChunkOverlap,
    } = options;

    const splitter = this.createSplitter(strategy, {
      ...options,
      chunkSize,
      chunkOverlap,
    });

    const docs = await splitter.splitDocuments([
      new Document({ pageContent: text }),
    ]);

    return docs.map(doc => doc.pageContent);
  }

  /**
   * Split documents into chunked documents with metadata
   */
  async splitDocuments(
    documents: Array<{ id: string; content: string; metadata?: any }>,
    options: TextSplitterOptions = {},
  ): Promise<ChunkedDocument[]> {
    const {
      strategy = 'recursive',
      chunkSize = this.defaultChunkSize,
      chunkOverlap = this.defaultChunkOverlap,
    } = options;

    const splitter = this.createSplitter(strategy, {
      ...options,
      chunkSize,
      chunkOverlap,
    });

    const allChunks: ChunkedDocument[] = [];

    for (const doc of documents) {
      try {
        // Create LangChain document
        const langchainDoc = new Document({
          pageContent: doc.content,
          metadata: { ...doc.metadata, originalId: doc.id },
        });

        // Split the document
        const chunks = await splitter.splitDocuments([langchainDoc]);

        // Convert to our chunked document format with enhanced metadata
        const chunkedDocs = await Promise.all(chunks.map(async (chunk, index) => {
          const baseMetadata = {
            ...chunk.metadata,
            parentId: doc.id,
            chunkIndex: index,
            totalChunks: chunks.length,
            startIndex: chunk.metadata['loc']?.lines?.from,
            endIndex: chunk.metadata['loc']?.lines?.to,
          };

          // Extract additional metadata if enabled and extractor is available
          if (options.extractMetadata && this.metadataExtractor) {
            const extractedMetadata = await this.metadataExtractor.extractMetadata(
              chunk.pageContent,
              {
                contentType: doc.metadata?.contentType || strategy,
                extractTopics: options.extractTopics,
                extractKeywords: options.extractKeywords,
                analyzeComplexity: options.analyzeComplexity,
                calculateReadingTime: options.calculateReadingTime,
                detectCrossReferences: options.detectCrossReferences,
                extractCodeMetadata: options.extractCodeMetadata,
              }
            );

            return {
              id: `${doc.id}-chunk-${index}`,
              content: chunk.pageContent,
              metadata: { ...baseMetadata, ...extractedMetadata },
            };
          }

          return {
            id: `${doc.id}-chunk-${index}`,
            content: chunk.pageContent,
            metadata: baseMetadata,
          };
        }));

        allChunks.push(...chunkedDocs);

        this.logger.debug(
          `Split document ${doc.id} into ${chunks.length} chunks using ${strategy} strategy`,
        );
      } catch (error) {
        this.logger.error(`Failed to split document ${doc.id}:`, error);
        // Fallback: treat the entire document as a single chunk
        allChunks.push({
          id: `${doc.id}-chunk-0`,
          content: doc.content,
          metadata: {
            ...doc.metadata,
            parentId: doc.id,
            chunkIndex: 0,
            totalChunks: 1,
          },
        });
      }
    }

    return allChunks;
  }

  /**
   * Smart chunking that detects content type and uses appropriate strategy
   */
  async smartSplit(
    content: string,
    metadata?: any,
    options: TextSplitterOptions = {},
  ): Promise<ChunkedDocument[]> {
    // Detect content type
    const contentType = this.detectContentType(content, metadata);

    // Choose appropriate strategy
    const strategy = this.getStrategyForContentType(contentType);

    // Get optimal chunk size for the content type
    const chunkSize = this.getOptimalChunkSize(contentType, options.chunkSize);

    this.logger.debug(
      `Using ${strategy} strategy with chunk size ${chunkSize} for ${contentType} content`,
    );

    // Split using detected strategy with automatic metadata extraction
    const doc = {
      id: metadata?.id || `doc-${Date.now()}`,
      content,
      metadata: { ...metadata, contentType },
    };

    // Enable metadata extraction by default for smart splitting
    return this.splitDocuments([doc], {
      ...options,
      strategy,
      chunkSize,
      extractMetadata: options.extractMetadata !== false, // Default to true
      extractKeywords: options.extractKeywords !== false,
      analyzeComplexity: options.analyzeComplexity !== false,
    });
  }

  /**
   * Create a text splitter based on strategy
   */
  private createSplitter(
    strategy: string,
    options: TextSplitterOptions,
  ): RecursiveCharacterTextSplitter | TokenTextSplitter | CharacterTextSplitter | MarkdownTextSplitter {
    const {
      chunkSize = this.defaultChunkSize,
      chunkOverlap = this.defaultChunkOverlap,
      separators,
      keepSeparator = true,
      lengthFunction,
    } = options;

    switch (strategy) {
      case 'token':
        // Token-based splitting for precise token count control
        return new TokenTextSplitter({
          chunkSize,
          chunkOverlap,
          encodingName: options.encodingName as any || 'cl100k_base', // GPT-4 encoding
          allowedSpecial: options.allowedSpecial,
          disallowedSpecial: options.disallowedSpecial,
        });

      case 'character':
        // Simple character-based splitting
        return new CharacterTextSplitter({
          chunkSize,
          chunkOverlap,
          separator: separators?.[0] || '\n\n',
          keepSeparator,
        });

      case 'markdown':
        // Markdown-aware splitting
        return new MarkdownTextSplitter({
          chunkSize,
          chunkOverlap,
        });

      case 'semantic':
        // For semantic splitting, we'll use recursive with sentence boundaries
        // In the future, this could use embedding-based semantic similarity
        return new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
          separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''],
          keepSeparator,
          lengthFunction,
        });

      case 'recursive':
      default: {
        // Recursive splitting with customizable separators
        const defaultSeparators = ['\n\n', '\n', '. ', '! ', '? ', ' ', ''];
        return new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
          separators: separators || defaultSeparators,
          keepSeparator,
          lengthFunction,
        });
      }
    }
  }

  /**
   * Detect content type from content and metadata
   */
  private detectContentType(content: string, metadata?: any): string {
    // Check metadata first
    if (metadata?.contentType) {
      return metadata.contentType;
    }

    // Check for code patterns
    if (this.isCode(content)) {
      return 'code';
    }

    // Check for markdown
    if (this.isMarkdown(content)) {
      return 'markdown';
    }

    // Check for structured data (JSON, YAML)
    if (this.isStructuredData(content)) {
      return 'structured';
    }

    // Check for conversational/chat data
    if (this.isConversational(content)) {
      return 'conversation';
    }

    // Default to general text
    return 'text';
  }

  /**
   * Get optimal strategy for content type
   */
  private getStrategyForContentType(contentType: string): 'recursive' | 'token' | 'character' | 'markdown' | 'semantic' {
    switch (contentType) {
      case 'code':
        return 'recursive'; // Preserve code structure
      case 'markdown':
        return 'markdown'; // Use markdown-aware splitter
      case 'structured':
        return 'character'; // Preserve structure boundaries
      case 'conversation':
        return 'semantic'; // Keep conversation turns together
      default:
        return 'recursive'; // Good general-purpose strategy
    }
  }

  /**
   * Get optimal chunk size for content type
   */
  private getOptimalChunkSize(contentType: string, requestedSize?: number): number {
    if (requestedSize) {
      return requestedSize;
    }

    // Content-type specific defaults
    switch (contentType) {
      case 'code':
        return 1500; // Larger chunks for code context
      case 'markdown':
        return 1000; // Standard size for documents
      case 'structured':
        return 800; // Smaller for structured data
      case 'conversation':
        return 500; // Keep conversation turns together
      default:
        return this.defaultChunkSize;
    }
  }

  /**
   * Check if content is code
   */
  private isCode(content: string): boolean {
    const codePatterns = [
      /^import\s+/m,
      /^export\s+/m,
      /^function\s+\w+\s*\(/m,
      /^class\s+\w+/m,
      /^const\s+\w+\s*=/m,
      /^let\s+\w+\s*=/m,
      /^var\s+\w+\s*=/m,
      /^\s*\/\//m, // Comments
      /^\s*\/\*/m, // Block comments
      /{[\s\S]*}/m, // Curly braces
    ];

    return codePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content is markdown
   */
  private isMarkdown(content: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /^\*\s+/m, // Bullet points
      /^\d+\.\s+/m, // Numbered lists
      /\[.*\]\(.*\)/, // Links
      /```[\s\S]*```/, // Code blocks
      /^\|.*\|/m, // Tables
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content is structured data
   */
  private isStructuredData(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      // Not JSON, check for other patterns
      return /^[\s]*[{[]/.test(content) || /^---\n/.test(content); // YAML frontmatter
    }
  }

  /**
   * Check if content is conversational
   */
  private isConversational(content: string): boolean {
    const conversationPatterns = [
      /^(User|Assistant|Human|AI|Q|A):/m,
      /^>\s+/m, // Quoted text
      /^\d{1,2}:\d{2}/m, // Timestamps
    ];

    return conversationPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Merge small chunks to avoid over-fragmentation
   */
  async mergeSmallChunks(
    chunks: ChunkedDocument[],
    minChunkSize = 100,
  ): Promise<ChunkedDocument[]> {
    const mergedChunks: ChunkedDocument[] = [];
    let currentMerged: ChunkedDocument | null = null;

    for (const chunk of chunks) {
      if (!currentMerged) {
        currentMerged = { ...chunk };
        continue;
      }

      // Check if we should merge with current chunk
      if (
        chunk.metadata.parentId === currentMerged.metadata.parentId &&
        chunk.metadata.chunkIndex === currentMerged.metadata.chunkIndex + 1 &&
        currentMerged.content.length < minChunkSize
      ) {
        // Merge chunks
        currentMerged.content += '\n' + chunk.content;
        currentMerged.metadata.chunkIndex = chunk.metadata.chunkIndex;
        currentMerged.metadata.endIndex = chunk.metadata.endIndex;
      } else {
        // Save current merged chunk and start new one
        mergedChunks.push(currentMerged);
        currentMerged = { ...chunk };
      }
    }

    if (currentMerged) {
      mergedChunks.push(currentMerged);
    }

    // Update total chunks count
    const parentGroups = new Map<string, ChunkedDocument[]>();
    for (const chunk of mergedChunks) {
      const parentId = chunk.metadata.parentId;
      if (!parentGroups.has(parentId)) {
        parentGroups.set(parentId, []);
      }
      parentGroups.get(parentId)!.push(chunk);
    }

    // Update chunk indices and totals
    const finalChunks: ChunkedDocument[] = [];
    for (const [parentId, chunks] of parentGroups) {
      chunks.forEach((chunk, index) => {
        chunk.metadata.chunkIndex = index;
        chunk.metadata.totalChunks = chunks.length;
        chunk.id = `${parentId}-chunk-${index}`;
        finalChunks.push(chunk);
      });
    }

    return finalChunks;
  }
}
