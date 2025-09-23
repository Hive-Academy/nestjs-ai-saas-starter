import { Injectable, Logger } from '@nestjs/common';
import { GetResult, Metadata } from 'chromadb';
import { BaseDocument } from '../../types/core.interface';
import {
  ChromaWireDocument,
  ChromaSearchResult,
  toChromaWireDocument,
  fromChromaWireDocument,
} from '../../types/core.interface';

/**
 * Type Conversion Utilities
 * 
 * Handles conversion between ChromaDB raw types and typed documents
 * Eliminates duplicate code across services following DRY principle
 */
@Injectable()
export class TypeConversionUtils {
  private readonly logger = new Logger(TypeConversionUtils.name);

  /**
   * Convert BaseDocument to ChromaWireDocument
   */
  toChromaWireDocument<T extends BaseDocument>(document: T): ChromaWireDocument {
    return toChromaWireDocument(document);
  }

  /**
   * Convert multiple BaseDocuments to ChromaWireDocuments
   */
  toChromaWireDocuments<T extends BaseDocument>(documents: T[]): ChromaWireDocument[] {
    return documents.map(doc => this.toChromaWireDocument(doc));
  }

  /**
   * Parse a single document from ChromaDB result with type safety
   */
  parseDocument<T extends BaseDocument>(result: GetResult, index: number): T {
    const id = result.ids[index];
    const document = result.documents?.[index];
    const metadata = result.metadatas?.[index];
    const embedding = result.embeddings?.[index];

    let parsedData: any = {};
    if (document && typeof document === 'string') {
      try {
        parsedData = JSON.parse(document);
      } catch (error) {
        this.logger.warn(`Failed to parse document ${id}: ${error}`);
        parsedData = { content: document };
      }
    }

    return {
      id,
      ...parsedData,
      metadata: (metadata || {}) as Metadata,
      embedding,
    } as T;
  }

  /**
   * Parse multiple documents from ChromaDB result with type safety
   */
  parseDocuments<T extends BaseDocument>(result: GetResult): T[] {
    const documents: T[] = [];
    
    for (let i = 0; i < result.ids.length; i++) {
      documents.push(this.parseDocument<T>(result, i));
    }
    
    return documents;
  }

  /**
   * Parse search results into typed documents
   */
  parseSearchResults<T extends BaseDocument>(searchResult: ChromaSearchResult): T[] {
    const documents: T[] = [];
    
    if (!searchResult.documents?.[0]) {
      return documents;
    }

    const resultArray = searchResult.documents[0];
    const ids = searchResult.ids[0] || [];
    const metadatas = searchResult.metadatas?.[0] || [];

    for (let i = 0; i < resultArray.length; i++) {
      const document = resultArray[i];
      const id = ids[i];
      const metadata = metadatas[i];

      let parsedData: any = {};
      if (document && typeof document === 'string') {
        try {
          parsedData = JSON.parse(document);
        } catch (error) {
          this.logger.warn(`Failed to parse search result ${id}: ${error}`);
          parsedData = { content: document };
        }
      }

      documents.push({
        id,
        ...parsedData,
        metadata: (metadata || {}) as Metadata,
      } as T);
    }
    
    return documents;
  }

  /**
   * Create update payload from document with partial updates
   */
  createUpdatePayload<T extends BaseDocument>(
    existing: T,
    updates: Partial<T>
  ): ChromaWireDocument {
    const updated = { ...existing, ...updates } as T;
    return this.toChromaWireDocument(updated);
  }

  /**
   * Convert bulk update operations to ChromaWireDocuments
   */
  createBulkUpdatePayloads<T extends BaseDocument>(
    existingDocs: T[],
    updates: Array<{ id: string; data: Partial<T> }>
  ): ChromaWireDocument[] {
    const updateMap = new Map(updates.map(u => [u.id, u.data]));
    
    return existingDocs
      .filter(doc => updateMap.has(doc.id))
      .map(doc => {
        const updateData = updateMap.get(doc.id)!;
        return this.createUpdatePayload(doc, updateData);
      });
  }

  /**
   * Safely extract text content from unknown document format
   */
  extractTextContent(document: unknown): string | null {
    if (typeof document === 'string') {
      return document;
    }

    if (typeof document === 'object' && document !== null) {
      // Try common text field names
      const textFields = ['content', 'text', 'body', 'description'];
      for (const field of textFields) {
        const value = (document as any)[field];
        if (typeof value === 'string') {
          return value;
        }
      }

      // Fallback to JSON stringify for structured data
      try {
        return JSON.stringify(document);
      } catch (error) {
        this.logger.warn('Failed to stringify document for text extraction');
        return null;
      }
    }

    return null;
  }

  /**
   * Validate and normalize metadata
   */
  normalizeMetadata(metadata: unknown): Metadata {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const normalized: Metadata = {};
    const obj = metadata as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      // ChromaDB only supports string, number, and boolean values
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        normalized[key] = value;
      } else if (value != null) {
        // Convert other types to strings
        try {
          normalized[key] = String(value);
        } catch (error) {
          this.logger.warn(`Failed to convert metadata value for key ${key}: ${error}`);
        }
      }
      // Skip null and undefined values
    }

    return normalized;
  }

  /**
   * Create search result with consistent structure
   */
  createSearchResult<T extends BaseDocument>(
    ids: string[][],
    documents: (string | null)[][] | null,
    metadatas: (Metadata | null)[][] | null,
    distances?: number[][] | null
  ): ChromaSearchResult {
    return {
      ids,
      documents,
      metadatas,
      distances,
    };
  }

  /**
   * Flatten search results for convenience methods
   */
  flattenSearchResults(searchResult: ChromaSearchResult): {
    ids: string[];
    documents: (string | null)[];
    metadatas: (Metadata | null)[];
    distances: number[];
  } {
    return {
      ids: searchResult.ids[0] || [],
      documents: searchResult.documents?.[0] || [],
      metadatas: searchResult.metadatas?.[0] || [],
      distances: searchResult.distances?.[0] || [],
    };
  }

  /**
   * Check if document needs embedding generation
   */
  needsEmbedding(document: ChromaWireDocument | BaseDocument): boolean {
    return Boolean(document.document && !document.embedding);
  }

  /**
   * Filter documents that need embeddings
   */
  filterDocumentsNeedingEmbeddings<T extends ChromaWireDocument | BaseDocument>(
    documents: T[]
  ): T[] {
    return documents.filter(doc => this.needsEmbedding(doc));
  }

  /**
   * Merge embeddings back into documents
   */
  mergeEmbeddings<T extends ChromaWireDocument | BaseDocument>(
    documents: T[],
    embeddings: number[][]
  ): T[] {
    let embeddingIndex = 0;
    
    return documents.map(doc => {
      if (this.needsEmbedding(doc)) {
        return { ...doc, embedding: embeddings[embeddingIndex++] };
      }
      return doc;
    });
  }
}