import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChromaDBService,
  EmbeddingService,
  type ChromaMetadata,
} from '@hive-academy/nestjs-chromadb';
import type { GetResult } from 'chromadb';
import type {
  MemoryEntry,
  MemoryMetadata,
} from '../interfaces/memory.interface';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryStorageError,
  MemoryEmbeddingError,
  MemoryTimeoutError,
} from '../errors/memory-errors';

/**
 * Specialized service for ChromaDB storage operations and embeddings
 *
 * Responsibilities:
 * - Document CRUD operations with ChromaDB
 * - Embedding generation and management
 * - Semantic search functionality
 * - Document format conversion and validation
 * - Storage-specific error handling with retries
 *
 * This service is framework-agnostic and can be reused in any application
 * requiring vector-based memory storage with semantic search capabilities.
 */
@Injectable()
export class MemoryStorageService implements OnModuleInit {
  private readonly logger = new Logger(MemoryStorageService.name);
  private readonly collectionName = 'memory-entries';

  constructor(
    private readonly configService: ConfigService,
    private readonly chromaDBService: ChromaDBService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // Ensure ChromaDB collection exists
      await this.chromaDBService.createCollection(this.collectionName);
      this.logger.log(
        'Memory storage service initialized with ChromaDB collection'
      );
    } catch (error) {
      this.logger.error('Failed to initialize memory storage service', error);
      throw error;
    }
  }

  /**
   * Store a single memory entry with embedding generation
   */
  async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    try {
      const entry: MemoryEntry = {
        id: uuidv4(),
        threadId,
        content,
        metadata: {
          type: 'conversation',
          source: 'user',
          tags: [],
          importance: 0.5,
          persistent: false,
          ...metadata,
        },
        createdAt: new Date(),
        accessCount: 0,
      };

      // Generate embedding with retry logic
      if (this.isSemanticSearchEnabled()) {
        try {
          const embeddings = await this.executeEmbeddingOperation(
            async () => this.embeddingService.embed([content]),
            'generateEmbedding'
          );
          entry.embedding = embeddings[0];
        } catch (error) {
          this.logger.warn(
            'Failed to generate embedding, storing without semantic search capability',
            error
          );
          // Continue without embedding - the memory will still be stored
        }
      }

      // Store in ChromaDB with timeout protection
      await this.executeChromaDBOperation(
        async () =>
          this.chromaDBService.addDocuments(this.collectionName, [
            {
              id: entry.id,
              document: content,
              metadata: this.convertMemoryToChromaMetadata(entry),
              embedding: entry.embedding,
            },
          ]),
        'addDocument',
        threadId
      );

      this.logger.debug(
        `Stored memory entry ${entry.id} for thread ${threadId}`
      );
      return entry;
    } catch (error) {
      this.logger.error(
        `Failed to store memory entry for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentStorage(
        'store',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Store multiple memory entries in batch
   */
  async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>
  ): Promise<readonly MemoryEntry[]> {
    try {
      const memoryEntries: MemoryEntry[] = [];
      const documents: Array<{
        id: string;
        document: string;
        metadata: Record<string, string | number | boolean | null>;
        embedding?: readonly number[];
      }> = [];

      // Prepare all entries
      for (const entryData of entries) {
        const entry: MemoryEntry = {
          id: uuidv4(),
          threadId,
          content: entryData.content,
          metadata: {
            type: 'conversation',
            source: 'user',
            tags: [],
            importance: 0.5,
            persistent: false,
            ...entryData.metadata,
          },
          createdAt: new Date(),
          accessCount: 0,
        };

        memoryEntries.push(entry);
        documents.push({
          id: entry.id,
          document: entry.content,
          metadata: this.convertMemoryToChromaMetadata(entry),
        });
      }

      // Generate embeddings for all entries if semantic search is enabled
      if (this.isSemanticSearchEnabled()) {
        const contents = memoryEntries.map((entry) => entry.content);
        const embeddings = await this.embeddingService.embed(contents);

        for (let i = 0; i < memoryEntries.length; i++) {
          memoryEntries[i].embedding = embeddings[i];
          documents[i].embedding = embeddings[i];
        }
      }

      // Store all documents in ChromaDB
      await this.chromaDBService.addDocuments(this.collectionName, documents);

      this.logger.debug(
        `Stored ${memoryEntries.length} memory entries for thread ${threadId}`
      );
      return memoryEntries;
    } catch (error) {
      this.logger.error(
        `Failed to store batch memory entries for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentStorage(
        'storeBatch',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Retrieve memories by thread ID
   */
  async retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]> {
    try {
      const results = await this.executeChromaDBOperation(
        async () =>
          this.chromaDBService.getDocuments(this.collectionName, {
            where: { threadId },
            limit: limit ?? 1000,
            includeMetadata: true,
            includeDocuments: true,
            includeEmbeddings: true,
          }),
        'getDocuments',
        threadId
      );

      const memories = this.convertFromGetResults(results);

      // Sort by creation date (newest first)
      const sortedMemories = memories.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      // Update access count for retrieved memories
      const updatePromises = sortedMemories.map(async (memory) => {
        const updatedAccessCount = memory.accessCount + 1;
        const lastAccessedAt = new Date();

        await this.chromaDBService.updateDocuments(this.collectionName, [
          {
            id: memory.id,
            metadata: {
              ...this.convertMemoryToChromaMetadata(memory),
              accessCount: updatedAccessCount,
              lastAccessedAt: lastAccessedAt.toISOString(),
            },
          },
        ]);

        memory.accessCount = updatedAccessCount;
        memory.lastAccessedAt = lastAccessedAt;
      });

      await Promise.all(updatePromises);

      return sortedMemories;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve memories for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentRetrieval(
        'retrieve',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Search memories using semantic similarity
   */
  async searchSimilar(
    queryText: string,
    whereClause?: Record<string, unknown>,
    limit = 10
  ): Promise<readonly MemoryEntry[]> {
    try {
      if (!queryText.trim() || !this.isSemanticSearchEnabled()) {
        // Fallback to basic filtering if no query or semantic search disabled
        const results = await this.chromaDBService.getDocuments(
          this.collectionName,
          {
            where: whereClause as any,
            limit,
            includeMetadata: true,
            includeDocuments: true,
            includeEmbeddings: false,
          }
        );
        return this.convertFromGetResults(results);
      }

      // Generate query embedding
      const queryEmbeddings = await this.executeEmbeddingOperation(
        async () => this.embeddingService.embed([queryText]),
        'generateQueryEmbedding'
      );
      const queryEmbedding = queryEmbeddings[0];

      // Perform semantic search
      const searchResults = await this.executeChromaDBOperation(
        async () =>
          this.chromaDBService.searchDocuments(
            this.collectionName,
            undefined,
            [...queryEmbedding],
            {
              nResults: limit,
              where: whereClause as any,
              includeMetadata: true,
              includeDocuments: true,
              includeDistances: true,
              includeEmbeddings: false,
            }
          ),
        'searchDocuments'
      );

      return this.convertFromQueryResults(searchResults);
    } catch (error) {
      this.logger.error('Failed to search memories semantically', error);
      throw MemoryStorageError.searchOperation(
        'searchSimilar',
        queryText,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Convert ChromaDB GetResult to MemoryEntry array
   */
  private convertFromGetResults(
    results: GetResult<ChromaMetadata>
  ): MemoryEntry[] {
    const memories: MemoryEntry[] = [];
    const ids = (results.ids ?? []) as readonly string[];
    const documents = (results.documents ?? []) as ReadonlyArray<string | null>;
    const metadatas = (results.metadatas ??
      []) as ReadonlyArray<ChromaMetadata | null>;
    const embeddings = (results.embeddings ?? []) as ReadonlyArray<
      readonly number[] | null
    >;

    for (let i = 0; i < ids.length; i++) {
      const metadata = metadatas[i] ?? ({} as ChromaMetadata);
      const additionalMetadata = this.parseAdditionalMetadata(
        (metadata as Record<string, unknown>).additionalMetadata
      );

      const memory: MemoryEntry = {
        id: ids[i],
        threadId: String(metadata.threadId ?? ''),
        content: documents[i] ?? '',
        embedding: embeddings[i] ?? undefined,
        metadata: {
          type: (metadata.type as MemoryMetadata['type']) ?? 'conversation',
          source: (metadata.source as string | null) ?? undefined,
          tags:
            typeof metadata.tags === 'string'
              ? metadata.tags.split(',').filter(Boolean)
              : undefined,
          importance: (metadata.importance as number | null) ?? undefined,
          persistent: (metadata.persistent as boolean | null) ?? undefined,
          ...additionalMetadata,
        },
        createdAt: new Date(
          String(metadata.createdAt ?? new Date().toISOString())
        ),
        lastAccessedAt: metadata.lastAccessedAt
          ? new Date(String(metadata.lastAccessedAt))
          : undefined,
        accessCount: (metadata.accessCount as number | null) ?? 0,
      };

      memories.push(memory);
    }

    return memories;
  }

  /**
   * Convert ChromaDB QueryResult to MemoryEntry array
   */
  private convertFromQueryResults(results: any): MemoryEntry[] {
    const ids = results.ids?.[0] ?? [];
    const documents = results.documents?.[0] ?? [];
    const metadatas = (results.metadatas?.[0] ??
      []) as ReadonlyArray<ChromaMetadata | null>;
    const embeddings = results.embeddings?.[0] ?? [];
    const distances = results.distances?.[0] ?? [];

    return ids.map((_id: string, i: number): MemoryEntry => {
      const metadata = metadatas[i] ?? ({} as ChromaMetadata);
      const additionalMetadata = this.parseAdditionalMetadata(
        (metadata as Record<string, unknown>).additionalMetadata
      );

      return {
        id: ids[i] ?? '',
        threadId: String(metadata.threadId ?? ''),
        content: documents[i] ?? '',
        embedding: embeddings[i] ?? undefined,
        metadata: {
          type: (metadata.type as MemoryMetadata['type']) ?? 'conversation',
          source: (metadata.source as string | null) ?? undefined,
          tags:
            typeof metadata.tags === 'string'
              ? metadata.tags.split(',').filter(Boolean)
              : undefined,
          importance: (metadata.importance as number | null) ?? undefined,
          persistent: (metadata.persistent as boolean | null) ?? undefined,
          ...additionalMetadata,
        },
        createdAt: new Date(
          String(metadata.createdAt ?? new Date().toISOString())
        ),
        lastAccessedAt: metadata.lastAccessedAt
          ? new Date(String(metadata.lastAccessedAt))
          : undefined,
        accessCount: (metadata.accessCount as number | null) ?? 0,
        relevanceScore:
          distances[i] !== undefined ? 1 - Number(distances[i]) : undefined,
      };
    });
  }

  /**
   * Convert MemoryEntry to ChromaDB metadata format
   */
  private convertMemoryToChromaMetadata(
    memory: MemoryEntry
  ): Record<string, string | number | boolean | null> {
    return {
      threadId: memory.threadId,
      type: memory.metadata.type,
      source: memory.metadata.source ?? null,
      tags: memory.metadata.tags?.join(',') ?? '',
      importance: memory.metadata.importance ?? 0.5,
      persistent: memory.metadata.persistent ?? false,
      createdAt: memory.createdAt.toISOString(),
      accessCount: memory.accessCount,
      lastAccessedAt: memory.lastAccessedAt?.toISOString() ?? null,
      additionalMetadata: JSON.stringify(
        Object.fromEntries(
          Object.entries(memory.metadata).filter(
            ([key]) =>
              !['type', 'source', 'tags', 'importance', 'persistent'].includes(
                key
              )
          )
        )
      ),
    };
  }

  /**
   * Parse additional metadata from JSON string
   */
  private parseAdditionalMetadata(value: unknown): Record<string, unknown> {
    if (typeof value !== 'string') return {};

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  /**
   * Execute ChromaDB operation with timeout protection
   */
  private async executeChromaDBOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    threadId?: string
  ): Promise<T> {
    const timeout = this.configService.get<number>(
      'memory.timeout.chromadb',
      30000
    );

    try {
      return await this.withTimeout(
        operation,
        timeout,
        operationName,
        'chromadb',
        threadId
      );
    } catch (error) {
      this.logger.error(`ChromaDB operation ${operationName} failed`, error);
      throw error;
    }
  }

  /**
   * Execute embedding operation with retry logic
   */
  private async executeEmbeddingOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = 3
  ): Promise<T> {
    const timeout = this.configService.get<number>(
      'memory.timeout.embedding',
      20000
    );
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.withTimeout(
          operation,
          timeout,
          operationName,
          'embedding'
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.warn(
            `Embedding operation ${operationName} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms`,
            lastError
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw MemoryEmbeddingError.embeddingGeneration(
      operationName,
      1,
      lastError!
    );
  }

  /**
   * Execute operation with timeout protection
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    service: 'chromadb' | 'embedding',
    threadId?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          MemoryTimeoutError.operationTimeout(
            operationName,
            service,
            timeoutMs,
            threadId
          )
        );
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Check if semantic search is enabled
   */
  private isSemanticSearchEnabled(): boolean {
    return this.configService.get<boolean>(
      'memory.enableSemanticSearch',
      false
    );
  }
}
