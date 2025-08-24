
import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import {
  ChromaClient,
  Collection,
  WhereDocument,
  Where,
  GetResult,
  EmbeddingFunction,
  Metadata,
} from 'chromadb';
import { CHROMADB_CLIENT, DEFAULT_BATCH_SIZE } from '../constants';
import {
  ChromaDBServiceInterface,
  ChromaDocument,
  ChromaSearchResult,
  ChromaCollectionInfo,
  ChromaSearchOptions,
  ChromaBulkOptions,
} from '../interfaces/chromadb-service.interface';
import { CollectionService } from './collection.service';
import { EmbeddingService } from './embedding.service';
import { ChromaAdminService } from './chroma-admin.service';
import { TextSplitterService } from './text-splitter.service';
import { sanitizeMetadata } from '../utils/metadata.utils';
import { ChromaDBEmbeddingNotConfiguredError } from '../errors/chromadb.errors';

/**
 * Main ChromaDB service that orchestrates collection, embedding, and admin services
 * Provides a unified interface for ChromaDB operations
 */
@Injectable()
export class ChromaDBService implements ChromaDBServiceInterface {
  private readonly logger = new Logger(ChromaDBService.name);

  constructor(
    @Inject(CHROMADB_CLIENT)
    private readonly client: ChromaClient,
    private readonly collectionService: CollectionService,
    private readonly embeddingService: EmbeddingService,
    private readonly adminService: ChromaAdminService,
    @Optional() private readonly textSplitterService?: TextSplitterService,
  ) {}

  /**
   * Get the ChromaDB client instance
   */
  public getClient(): ChromaClient {
    return this.client;
  }

  /**
   * Check if connection to ChromaDB is healthy
   */
  public async isHealthy(): Promise<boolean> {
    return this.adminService.isHealthy();
  }

  /**
   * Get heartbeat from ChromaDB server
   */
  public async heartbeat(): Promise<number> {
    return this.adminService.heartbeat();
  }

  /**
   * Get ChromaDB server version
   */
  public async version(): Promise<string> {
    return this.adminService.getVersion();
  }

  /**
   * Reset the entire ChromaDB instance (use with caution)
   */
  public async reset(): Promise<boolean> {
    return this.adminService.reset();
  }

  /**
   * List all collections
   */
  public async listCollections(): Promise<ChromaCollectionInfo[]> {
    return this.collectionService.listCollections();
  }

  /**
   * Create a new collection
   */
  public async createCollection(
    name: string,
    metadata?: Record<string, unknown>,
    embeddingFunction?: unknown,
    getOrCreate?: boolean
  ): Promise<Collection> {
    return this.collectionService.createCollection(name, {
      metadata: (metadata ? sanitizeMetadata(metadata) : undefined) as Metadata | undefined,
      embeddingFunction: (embeddingFunction as EmbeddingFunction | null | undefined) ?? undefined,
      getOrCreate,
    });
  }

  /**
   * Get an existing collection
   */
  public async getCollection(
    name: string,
    embeddingFunction?: unknown
  ): Promise<Collection> {
    return this.collectionService.getCollection(
      name,
      (embeddingFunction as EmbeddingFunction | undefined)
    );
  }

  /**
   * Delete a collection
   */
  public async deleteCollection(name: string): Promise<void> {
    return this.collectionService.deleteCollection(name);
  }

  /**
   * Check if a collection exists
   */
  public async collectionExists(name: string): Promise<boolean> {
    return this.collectionService.collectionExists(name);
  }

  /**
   * Add documents to a collection with automatic embedding generation and optional chunking
   */
  public async addDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    let documentsToProcess = documents;

    // Apply auto-chunking if enabled
    if (options?.autoChunk && this.textSplitterService) {
      documentsToProcess = await this.chunkDocuments(collectionName, documents, options);
    }

    const processedDocuments = await this.processDocumentsForEmbedding(documentsToProcess);
    const collection = await this.getCollection(collectionName);

    const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
    for (let i = 0; i < processedDocuments.length; i += batchSize) {
      const batch = processedDocuments.slice(i, i + batchSize);

      await collection.add({
        ids: batch.map(doc => doc.id),
        documents: batch.map(doc => doc.document).filter((doc): doc is string => !!doc),
        metadatas: batch.map(doc => doc.metadata ? sanitizeMetadata(doc.metadata) : undefined).filter(Boolean) as Metadata[],
        embeddings: batch.map(doc => doc.embedding).filter((emb): emb is number[] => !!emb),
      });
    }
  }

  /**
   * Chunk documents using the text splitter service
   */
  private async chunkDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options: ChromaBulkOptions,
  ): Promise<ChromaDocument[]> {
    if (!this.textSplitterService) {
      this.logger.warn('Text splitter service not available, skipping chunking');
      return documents;
    }

    const strategy = options.chunkingStrategy || 'smart';
    const chunkedDocuments: ChromaDocument[] = [];

    for (const doc of documents) {
      if (!doc.document) {
        // No text content to chunk, keep as is
        chunkedDocuments.push(doc);
        continue;
      }

      try {
        // Use smart split for automatic content type detection with metadata extraction
        const chunks = await (strategy === 'smart'
          ? this.textSplitterService.smartSplit(doc.document, doc.metadata, {
              chunkSize: options.chunkSize,
              chunkOverlap: options.chunkOverlap,
              extractMetadata: options.extractMetadata,
              extractTopics: options.extractTopics,
              extractKeywords: options.extractKeywords,
              analyzeComplexity: options.analyzeComplexity,
              calculateReadingTime: options.calculateReadingTime,
              detectCrossReferences: options.detectCrossReferences,
              extractCodeMetadata: options.extractCodeMetadata,
            })
          : this.textSplitterService.splitDocuments(
              [{ id: doc.id, content: doc.document, metadata: doc.metadata }],
              {
                strategy,
                chunkSize: options.chunkSize,
                chunkOverlap: options.chunkOverlap,
                extractMetadata: options.extractMetadata,
                extractTopics: options.extractTopics,
                extractKeywords: options.extractKeywords,
                analyzeComplexity: options.analyzeComplexity,
                calculateReadingTime: options.calculateReadingTime,
                detectCrossReferences: options.detectCrossReferences,
                extractCodeMetadata: options.extractCodeMetadata,
              }
            ));

        // Convert chunks to ChromaDocuments
        for (const chunk of chunks) {
          chunkedDocuments.push({
            id: chunk.id,
            document: chunk.content,
            metadata: sanitizeMetadata({
              ...doc.metadata,
              ...chunk.metadata,
              originalDocumentId: doc.id,
            }),
            embedding: doc.embedding, // Will be regenerated for chunk content
          });
        }

        this.logger.debug(
          `Chunked document ${doc.id} into ${chunks.length} pieces using ${strategy} strategy`,
        );
      } catch (error) {
        this.logger.error(`Failed to chunk document ${doc.id}:`, error);
        // On error, keep the original document
        chunkedDocuments.push(doc);
      }
    }

    // Store parent-child relationships if requested
    if (options.preserveChunkRelationships) {
      await this.storeChunkRelationships(collectionName, chunkedDocuments);
    }

    return chunkedDocuments;
  }

  /**
   * Store parent-child relationships for chunked documents
   */
  private async storeChunkRelationships(
    collectionName: string,
    documents: ChromaDocument[],
  ): Promise<void> {
    // Group chunks by parent document
    const parentGroups = new Map<string, ChromaDocument[]>();

    for (const doc of documents) {
      const parentId = (doc.metadata?.['originalDocumentId'] as string) || (doc.metadata?.['parentId'] as string);
      if (parentId && typeof parentId === 'string') {
        if (!parentGroups.has(parentId)) {
          parentGroups.set(parentId, []);
        }
        parentGroups.get(parentId)!.push(doc);
      }
    }

    // Store relationship metadata
    for (const [parentId, chunks] of parentGroups) {
      const relationshipDoc: ChromaDocument = {
        id: `${parentId}-relationships`,
        document: `Parent document ${parentId} has ${chunks.length} chunks`,
        metadata: sanitizeMetadata({
          documentType: 'chunk-relationship',
          parentId,
          chunkIds: chunks.map((c: ChromaDocument) => c.id),
          chunkCount: chunks.length,
          createdAt: new Date().toISOString(),
        }),
      };

      // Store without chunking (it's metadata only)
      await this.addDocuments(collectionName, [relationshipDoc], {
        ...{ autoChunk: false },
      });
    }
  }

  /**
   * Update documents in a collection
   */
  public async updateDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    const processedDocuments = await this.processDocumentsForEmbedding(
      documents
    );
    const collection = await this.getCollection(collectionName);

    const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
    for (let i = 0; i < processedDocuments.length; i += batchSize) {
      const batch = processedDocuments.slice(i, i + batchSize);

      await collection.update({
        ids: batch.map((doc) => doc.id),
        documents: batch
          .map((doc) => doc.document)
          .filter((doc): doc is string => Boolean(doc)),
        metadatas: batch
          .map((doc) =>
            doc.metadata ? (sanitizeMetadata(doc.metadata) as Metadata) : undefined
          )
          .filter(Boolean) as Metadata[],
        embeddings: batch
          .map((doc) => doc.embedding)
          .filter((emb): emb is number[] => Boolean(emb)),
      });
    }
  }

  /**
   * Upsert documents in a collection
   */
  public async upsertDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    const processedDocuments = await this.processDocumentsForEmbedding(
      documents
    );
    const collection = await this.getCollection(collectionName);

    const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
    for (let i = 0; i < processedDocuments.length; i += batchSize) {
      const batch = processedDocuments.slice(i, i + batchSize);

      await collection.upsert({
        ids: batch.map((doc) => doc.id),
        documents: batch
          .map((doc) => doc.document)
          .filter((doc): doc is string => Boolean(doc)),
        metadatas: batch
          .map((doc) =>
            doc.metadata ? (sanitizeMetadata(doc.metadata) as Metadata) : undefined
          )
          .filter(Boolean) as Metadata[],
        embeddings: batch
          .map((doc) => doc.embedding)
          .filter((emb): emb is number[] => Boolean(emb)),
      });
    }
  }

  /**
   * Get documents from a collection
   */
  public async getDocuments(
    collectionName: string,
    options?: {
      ids?: string[];
      where?: Where;
      limit?: number;
      offset?: number;
      whereDocument?: WhereDocument;
      includeMetadata?: boolean;
      includeDocuments?: boolean;
      includeEmbeddings?: boolean;
    }
  ): Promise<GetResult<Record<string, string | number | boolean | null>>> {
    const collection = await this.getCollection(collectionName);
    const include: Array<'documents' | 'embeddings' | 'metadatas' | 'distances'> = [];
    if (options?.includeDocuments) {
      include.push('documents');
    }
    if (options?.includeEmbeddings) {
      include.push('embeddings');
    }
    if (options?.includeMetadata) {
      include.push('metadatas');
    }

    return collection.get({
      ids: options?.ids,
      where: options?.where,
      limit: options?.limit,
      offset: options?.offset,
      whereDocument: options?.whereDocument,
      include: include.length ? include : undefined,
    });
  }

  /**
   * Delete documents from a collection
   */
  public async deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);

    await collection.delete({
      ids,
      where,
      whereDocument,
    });
  }

  /**
   * Search for similar documents
   */
  public async searchDocuments(
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions
  ): Promise<ChromaSearchResult> {
    const collection = await this.getCollection(collectionName);

    // Generate embeddings for query texts if needed and embedding service is available
    let processedQueryEmbeddings = queryEmbeddings;
    if (
      queryTexts &&
      !queryEmbeddings &&
      this.embeddingService.isConfigured()
    ) {
      processedQueryEmbeddings = (await this.embeddingService.embed(queryTexts)) as number[][];
    }

    return collection.query({
      queryTexts,
      queryEmbeddings: processedQueryEmbeddings,
      nResults: options?.nResults ?? 10,
      where: options?.where,
      whereDocument: options?.whereDocument,
      include: [
        ...(options?.includeMetadata ? ['metadatas'] : []),
        ...(options?.includeDocuments ? ['documents'] : []),
        ...(options?.includeDistances ? ['distances'] : []),
        ...(options?.includeEmbeddings ? ['embeddings'] : []),
      ] as Array<'documents' | 'embeddings' | 'metadatas' | 'distances'>,
    });
  }

  /**
   * Similarity search with automatic embedding generation
   */
  async similaritySearch(
    collectionName: string,
    query: string | number[],
    options?: Omit<ChromaSearchOptions, 'includeMetadata' | 'includeDocuments' | 'includeDistances' | 'includeEmbeddings'> & {
      limit?: number;
      filter?: Where;
      includeMetadata?: boolean;
      includeDocuments?: boolean;
      includeDistances?: boolean;
    }
  ): Promise<{
    ids: string[];
    documents: Array<string | null>;
    metadatas: Array<Record<string, unknown> | null>;
    distances: number[];
  }> {
    let queryEmbedding: number[];

    if (typeof query === 'string') {
      if (!this.embeddingService.isConfigured()) {
        throw new ChromaDBEmbeddingNotConfiguredError(
          'Embedding service not configured for text queries'
        );
      }
      queryEmbedding = await this.embeddingService.embedSingle(query);
    } else {
      queryEmbedding = query;
    }

    const result = await this.searchDocuments(
      collectionName,
      undefined,
      [queryEmbedding],
      {
        nResults: options?.limit ?? 10,
        where: options?.filter,
        whereDocument: options?.whereDocument,
        includeMetadata: options?.includeMetadata ?? true,
        includeDocuments: options?.includeDocuments ?? true,
        includeDistances: options?.includeDistances ?? true,
      }
    );

    return {
      ids: result.ids[0] ?? [],
      documents: result.documents?.[0] ?? [],
      metadatas: result.metadatas?.[0] ?? [],
      distances: (result.distances?.[0] ?? []).filter(
        (d): d is number => d !== null
      ),
    };
  }

  /**
   * Count documents in a collection
   */
  public async countDocuments(collectionName: string): Promise<number> {
    return this.collectionService.getCollectionCount(collectionName);
  }

  /**
   * Peek at documents in a collection
   */
  public async peekDocuments(
    collectionName: string,
    limit = 10
  ): Promise<GetResult<Record<string, string | number | boolean | null>>> {
    const collection = await this.getCollection(collectionName);
    return collection.peek({ limit });
  }

  /**
   * Get collection metadata
   */
  public async getCollectionMetadata(
    collectionName: string
  ): Promise<Record<string, string | number | boolean | null> | null> {
    try {
      const collection = await this.getCollection(collectionName);
      return (collection.metadata as Record<string, string | number | boolean | null> | undefined) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Update collection metadata
   */
  public async updateCollectionMetadata(
    collectionName: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    return this.collectionService.modifyCollection(
      collectionName,
      sanitizeMetadata(metadata)
    );
  }

  /**
   * Process documents to add embeddings if needed
   */
  private async processDocumentsForEmbedding(
    documents: ChromaDocument[]
  ): Promise<ChromaDocument[]> {
    if (!this.embeddingService.isConfigured()) {
      return documents;
    }

    const documentsNeedingEmbeddings = documents.filter(
      (doc) => !doc.embedding && doc.document
    );

    if (documentsNeedingEmbeddings.length === 0) {
      return documents;
    }

    const textsToEmbed = documentsNeedingEmbeddings.map((doc) => doc.document as string);
    const embeddings = await this.embeddingService.embed(textsToEmbed);

    let embeddingIndex = 0;
    return documents.map((doc) => {
      if (!doc.embedding && doc.document) {
        const embedding = embeddings[embeddingIndex];
        embeddingIndex += 1;
        return { ...doc, embedding };
      }
      return doc;
    });
  }
}
