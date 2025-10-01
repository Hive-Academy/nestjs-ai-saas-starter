/**
 * @fileoverview ChromaDB Embedding Processing Service
 *
 * Handles embedding generation and processing for ChromaDB operations
 * Following Single Responsibility Principle - focused only on embedding concerns
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import type {
  ChromaWireDocument,
  ChromaBulkOptions,
} from '../../types/core.interface';
import { EmbeddingService } from '../embedding.service';

/**
 * Embedding processing options
 */
export interface EmbeddingProcessingOptions {
  skipEmbedding?: boolean;
  forceRegenerate?: boolean;
  batchSize?: number;
  parallel?: boolean;
}

/**
 * ChromaDB Embedding Processor Service
 *
 * Handles automatic embedding generation and processing for documents and queries
 */
@Injectable()
export class ChromaDBEmbeddingProcessorService {
  private readonly logger = new Logger(ChromaDBEmbeddingProcessorService.name);

  constructor(
    @Optional() private readonly embeddingService?: EmbeddingService
  ) {}

  /**
   * Check if embedding service is available
   */
  isEmbeddingServiceAvailable(): boolean {
    return !!this.embeddingService;
  }

  /**
   * Process embeddings for documents if embedding service is available
   */
  async processDocumentEmbeddings(
    documents: ChromaWireDocument[],
    options?: EmbeddingProcessingOptions & ChromaBulkOptions
  ): Promise<ChromaWireDocument[]> {
    if (!this.embeddingService || options?.skipEmbedding) {
      return documents;
    }

    const docsNeedingEmbeddings = documents.filter((doc) => {
      // Need embedding if: has text content AND (no embedding OR force regenerate)
      return doc.document && (!doc.embedding || options?.forceRegenerate);
    });

    if (docsNeedingEmbeddings.length === 0) {
      this.logger.debug('No documents need embedding processing');
      return documents;
    }

    try {
      this.logger.debug(
        `Processing embeddings for ${docsNeedingEmbeddings.length} documents`
      );

      const texts = docsNeedingEmbeddings.map((doc) => doc.document!);
      const embeddings = await this.generateEmbeddingsBatch(texts, options);

      // Map embeddings back to documents
      let embeddingIndex = 0;
      const processedDocuments = documents.map((doc) => {
        if (doc.document && (!doc.embedding || options?.forceRegenerate)) {
          return { ...doc, embedding: embeddings[embeddingIndex++] };
        }
        return doc;
      });

      this.logger.debug(
        `Successfully processed embeddings for ${docsNeedingEmbeddings.length} documents`
      );
      return processedDocuments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to generate embeddings: ${errorMessage}`);

      // Return original documents without embeddings rather than failing the entire operation
      return documents;
    }
  }

  /**
   * Process query embeddings for search operations
   */
  async processQueryEmbeddings(
    queryTexts: string[],
    existingEmbeddings?: number[][],
    options?: EmbeddingProcessingOptions
  ): Promise<number[][] | undefined> {
    if (!this.embeddingService || options?.skipEmbedding) {
      return existingEmbeddings;
    }

    // If embeddings already provided and not forcing regeneration, use them
    if (
      existingEmbeddings &&
      existingEmbeddings.length > 0 &&
      !options?.forceRegenerate
    ) {
      return existingEmbeddings;
    }

    // If no query texts, return existing embeddings
    if (queryTexts.length === 0) {
      return existingEmbeddings;
    }

    try {
      this.logger.debug(
        `Generating embeddings for ${queryTexts.length} query texts`
      );

      const embeddings = await this.generateEmbeddingsBatch(
        queryTexts,
        options
      );

      this.logger.debug(
        `Successfully generated embeddings for ${queryTexts.length} queries`
      );
      return embeddings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to generate query embeddings: ${errorMessage}`);

      // Return existing embeddings if available, otherwise undefined
      return existingEmbeddings;
    }
  }

  /**
   * Generate embeddings in batches with error handling
   */
  private async generateEmbeddingsBatch(
    texts: string[],
    options?: EmbeddingProcessingOptions & ChromaBulkOptions
  ): Promise<number[][]> {
    if (!this.embeddingService) {
      throw new Error('Embedding service not available');
    }

    const batchSize = options?.batchSize || 100;
    const useParallel = options?.parallel ?? false;

    if (texts.length <= batchSize && !useParallel) {
      // Single batch processing
      return this.embeddingService.embed(texts);
    }

    // Multi-batch processing
    const batches = this.createBatches(texts, batchSize);
    const allEmbeddings: number[][] = [];

    if (useParallel) {
      // Process batches in parallel
      const batchPromises = batches.map((batch) =>
        this.embeddingService!.embed(batch)
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((batchEmbeddings) => {
        allEmbeddings.push(
          ...batchEmbeddings.map((embedding) => [...embedding])
        );
      });
    } else {
      // Process batches sequentially
      for (let i = 0; i < batches.length; i++) {
        this.logger.debug(
          `Processing embedding batch ${i + 1}/${batches.length}`
        );

        const batchEmbeddings = await this.embeddingService.embed(batches[i]);
        allEmbeddings.push(
          ...batchEmbeddings.map((embedding) => [...embedding])
        );
      }
    }

    return allEmbeddings;
  }

  /**
   * Create batches from array of texts
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbedding(embedding: number[], expectedDimension?: number): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length === 0) {
      return false;
    }

    if (
      !embedding.every((value) => typeof value === 'number' && !isNaN(value))
    ) {
      return false;
    }

    if (expectedDimension && embedding.length !== expectedDimension) {
      return false;
    }

    return true;
  }

  /**
   * Validate batch of embeddings
   */
  validateEmbeddings(
    embeddings: number[][],
    expectedDimension?: number
  ): {
    isValid: boolean;
    errors: string[];
    validCount: number;
  } {
    const errors: string[] = [];
    let validCount = 0;

    embeddings.forEach((embedding, index) => {
      if (this.validateEmbedding(embedding, expectedDimension)) {
        validCount++;
      } else {
        errors.push(`Invalid embedding at index ${index}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      validCount,
    };
  }

  /**
   * Get embedding statistics
   */
  getEmbeddingStats(embeddings: number[][]): {
    count: number;
    dimensions?: number;
    avgMagnitude?: number;
    minMagnitude?: number;
    maxMagnitude?: number;
  } {
    if (embeddings.length === 0) {
      return { count: 0 };
    }

    const dimensions = embeddings[0]?.length;
    const magnitudes = embeddings.map((embedding) =>
      Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    );

    return {
      count: embeddings.length,
      dimensions,
      avgMagnitude:
        magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length,
      minMagnitude: Math.min(...magnitudes),
      maxMagnitude: Math.max(...magnitudes),
    };
  }

  /**
   * Similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Normalize embedding to unit vector
   */
  normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) {
      return embedding.slice(); // Return copy of zero vector
    }

    return embedding.map((val) => val / magnitude);
  }

  /**
   * Get embedding service information
   */
  getEmbeddingServiceInfo(): {
    available: boolean;
    provider?: string;
    dimensions?: number;
    model?: string;
  } {
    if (!this.embeddingService) {
      return { available: false };
    }

    // Try to get service info if available
    try {
      if ('getInfo' in this.embeddingService) {
        return {
          available: true,
          ...(this.embeddingService as any).getInfo(),
        };
      }
    } catch (error) {
      this.logger.debug('Could not get embedding service info', { error });
    }

    return { available: true };
  }
}
