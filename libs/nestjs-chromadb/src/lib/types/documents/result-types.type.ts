/**
 * Result-focused types following Interface Segregation Principle
 * Handles operation results, bulk operations and collection information
 */

import type { Metadata } from 'chromadb';

/**
 * Bulk operation options
 */
export interface ChromaBulkOptions {
  readonly batchSize?: number;
  readonly upsert?: boolean;
  readonly validateIds?: boolean;
  readonly autoChunk?: boolean;
  readonly chunkingStrategy?:
    | 'recursive'
    | 'token'
    | 'character'
    | 'markdown'
    | 'semantic'
    | 'smart';
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
  readonly preserveChunkRelationships?: boolean;
  readonly extractMetadata?: boolean;
  readonly extractTopics?: boolean;
  readonly extractKeywords?: boolean;
  readonly analyzeComplexity?: boolean;
  readonly calculateReadingTime?: boolean;
  readonly detectCrossReferences?: boolean;
  readonly extractCodeMetadata?: boolean;
}

/**
 * Collection information
 */
export interface ChromaCollectionInfo<TMetadata = Metadata> {
  readonly name: string;
  readonly id: string;
  readonly metadata?: TMetadata;
  readonly dimension?: number;
  readonly count?: number;
}

/**
 * Generic operation result for ChromaDB operations
 */
export interface ChromaOperationResult {
  readonly success: boolean;
  readonly message?: string;
  readonly data?: any;
  readonly errors?: string[];
  readonly warnings?: string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Bulk operation result with detailed information
 */
export interface ChromaBulkOperationResult extends ChromaOperationResult {
  readonly processedCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly batchResults: readonly ChromaOperationResult[];
}
