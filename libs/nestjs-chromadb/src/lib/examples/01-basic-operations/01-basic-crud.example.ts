/**
 * @fileoverview Basic CRUD Operations Example
 * 
 * Demonstrates fundamental Create, Read, Update, Delete operations
 * using ChromaDB with proper error handling and type safety.
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule, ChromaDBService, ChromaWireDocument } from '../../../index';
import { 
  CollectionHelper,
  DemoLogger,
  DemoWorkflow,
  PerformanceTimer 
} from '../shared';

@Injectable()
export class BasicCrudService implements OnModuleInit {
  private readonly collectionName = 'basic-crud-example';
  private readonly logger = new DemoLogger();
  private readonly timer = new PerformanceTimer();
  private readonly collectionHelper: CollectionHelper;
  private readonly workflow: DemoWorkflow;

  constructor(private readonly chromaDB: ChromaDBService) {
    this.collectionHelper = new CollectionHelper(this.chromaDB, this.logger);
    this.workflow = new DemoWorkflow(this.chromaDB, this.collectionHelper, this.logger);
  }

  async onModuleInit() {
    await this.runBasicCrudExample();
  }

  /**
   * Ensure collection exists for the example
   */
  private async ensureCollection(): Promise<void> {
    try {
      await this.chromaDB.createCollection(this.collectionName, {
        name: this.collectionName,
        metadata: { description: 'Basic CRUD operations example collection' }
      });
      this.logger.logInfo(`Collection '${this.collectionName}' created`);
    } catch (error) {
      // Collection might already exist
      this.logger.logInfo(`Collection '${this.collectionName}' already exists`);
    }
  }

  /**
   * Complete CRUD operations demonstration
   */
  async runBasicCrudExample(): Promise<void> {
    this.logger.logSeparator('Basic CRUD Operations Example');
    
    try {
      // Setup collection
      await this.ensureCollection();

      // Demonstrate each CRUD operation
      await this.demonstrateCreate();
      await this.demonstrateRead();
      await this.demonstrateUpdate();
      await this.demonstrateDelete();
      
      // Cleanup
      await this.cleanup();
      
    } catch (error) {
      this.logger.logError('Basic CRUD Example', error as Error);
      throw error;
    }
  }

  /**
   * Demonstrate CREATE operations
   */
  private async demonstrateCreate(): Promise<void> {
    this.logger.logStep(1, 'CREATE Operations');

    // Single document creation
    const singleDoc: ChromaWireDocument = {
      id: 'create-001',
      document: 'How to Use Vector Databases: Vector databases store and search high-dimensional embeddings for semantic similarity. This is essential for modern AI applications requiring semantic search capabilities.',
      metadata: {
        title: 'How to Use Vector Databases',
        category: 'tutorial',
        tags: 'vector-db,tutorial,embeddings',
        author: 'Example Author',
        source: 'manual',
        confidence: 0.95,
        language: 'en',
        wordCount: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }
    };

    const { duration: singleCreateTime } = await this.timer.measure('create-single', async () => {
      await this.chromaDB.addDocuments(this.collectionName, [singleDoc]);
    });

    this.logger.logResults('Single document created', { id: singleDoc.id }, singleCreateTime);

    // Batch document creation with real content
    const batchDocs: ChromaWireDocument[] = Array.from({ length: 5 }, (_, i) => ({
      id: `batch-${i + 1}`,
      document: `Batch Document ${i + 1}: Exploring advanced database concepts including indexing strategies, query optimization, and distributed architectures. This document demonstrates bulk insert capabilities and performance testing scenarios for large-scale data operations.`,
      metadata: {
        title: `Batch Document ${i + 1}`,
        category: 'batch-test',
        tags: 'batch,bulk-insert,performance',
        author: 'Batch Creator',
        source: 'generated',
        confidence: 0.90,
        language: 'en',
        wordCount: 32,
        batchIndex: i + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }
    }));

    const { duration: batchCreateTime } = await this.timer.measure('create-batch', async () => {
      await this.chromaDB.addDocuments(this.collectionName, batchDocs);
    });

    this.logger.logResults(
      'Batch documents created',
      { count: batchDocs.length },
      batchCreateTime
    );
  }

  /**
   * Demonstrate READ operations
   */
  private async demonstrateRead(): Promise<void> {
    this.logger.logStep(2, 'READ Operations');

    // Get specific documents by ID
    const { result: specificDocs, duration: getTime } = await this.timer.measure('get-specific', async () => {
      return await this.chromaDB.getDocuments(this.collectionName, {
        ids: ['create-001', 'batch-1', 'batch-2']
      });
    });

    const foundDocsCount = specificDocs.ids?.[0]?.length || 0;
    this.logger.logResults(
      'Documents retrieved by ID',
      { 
        requested: 3, 
        found: foundDocsCount,
        documents: foundDocsCount > 0 ? specificDocs.ids![0].slice(0, 2) : []
      },
      getTime
    );

    // Log sample document content
    if (specificDocs.documents?.[0] && specificDocs.documents[0].length > 0) {
      this.logger.logInfo(`Sample document content: "${specificDocs.documents[0][0]?.substring(0, 100)}..."`);
    }

    // Get all documents (with limit)
    const { result: allDocs, duration: getAllTime } = await this.timer.measure('get-all', async () => {
      return await this.chromaDB.getDocuments(this.collectionName, { limit: 10 });
    });

    const allDocsCount = allDocs.ids?.[0]?.length || 0;
    this.logger.logResults(
      'All documents retrieved',
      { 
        count: allDocsCount,
        sampleIds: allDocsCount > 0 ? allDocs.ids![0].slice(0, 3) : []
      },
      getAllTime
    );

    // Search by content with semantic similarity
    const searchQuery = 'vector databases and embeddings for AI applications';
    const { result: searchResults, duration: searchTime } = await this.timer.measure('search', async () => {
      return await this.chromaDB.searchDocuments(
        this.collectionName,
        [searchQuery],
        undefined,
        { nResults: 3, includeDistances: true, includeMetadata: true, includeDocuments: true }
      );
    });

    const searchResultsCount = searchResults.ids?.[0]?.length || 0;
    let avgSimilarity = 'N/A';
    
    if (searchResults.distances?.[0] && searchResults.distances[0].length > 0) {
      const validDistances = searchResults.distances[0].filter(d => d !== null && typeof d === 'number') as number[];
      if (validDistances.length > 0) {
        const avgDistance = validDistances.reduce((sum, dist) => sum + dist, 0) / validDistances.length;
        avgSimilarity = (1 - avgDistance).toFixed(3);
      }
    }

    this.logger.logResults(
      'Semantic search completed',
      {
        query: searchQuery,
        results: searchResultsCount,
        avgSimilarity,
        topResult: searchResultsCount > 0 ? {
          id: searchResults.ids![0][0],
          similarity: searchResults.distances?.[0]?.[0] ? (1 - searchResults.distances[0][0]).toFixed(3) : 'N/A'
        } : null
      },
      searchTime
    );

    // Log search results content
    if (searchResults.documents?.[0] && searchResults.documents[0].length > 0) {
      this.logger.logInfo(`Top search result: "${searchResults.documents[0][0]?.substring(0, 120)}..."`);
    }
  }

  /**
   * Demonstrate UPDATE operations
   */
  private async demonstrateUpdate(): Promise<void> {
    this.logger.logStep(3, 'UPDATE Operations');

    // Update single document using upsert - demonstrating version control and content enhancement
    const updatedDoc: ChromaWireDocument = {
      id: 'create-001', // Same ID to update existing
      document: 'How to Use Vector Databases - Updated Edition: Vector databases store and search high-dimensional embeddings for semantic similarity. This updated version includes advanced concepts like vector indexing algorithms, similarity metrics, and production optimization strategies for large-scale AI applications.',
      metadata: {
        title: 'How to Use Vector Databases - Updated Edition',
        category: 'advanced-tutorial',
        tags: 'vector-db,advanced,embeddings,updated,optimization',
        author: 'Example Author',
        source: 'manual',
        confidence: 0.97,
        language: 'en',
        wordCount: 45,
        version: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        updateReason: 'Added advanced optimization concepts',
      }
    };

    const { duration: updateTime } = await this.timer.measure('update-single', async () => {
      await this.chromaDB.upsertDocuments(this.collectionName, [updatedDoc]);
    });

    this.logger.logResults(
      'Document updated',
      { 
        id: updatedDoc.id,
        version: updatedDoc.metadata?.version || 'N/A',
        wordCount: updatedDoc.metadata?.wordCount || 0,
        updateReason: updatedDoc.metadata?.updateReason || 'No reason specified'
      },
      updateTime
    );

    // Batch update multiple documents
    const { result: existingBatchDocs } = await this.timer.measure('get-batch-for-update', async () => {
      return await this.chromaDB.getDocuments(this.collectionName, {
        ids: ['batch-1', 'batch-2', 'batch-3']
      });
    });

    if (existingBatchDocs.ids?.[0] && Array.isArray(existingBatchDocs.ids[0]) && existingBatchDocs.ids[0].length > 0) {
      const batchUpdates: ChromaWireDocument[] = existingBatchDocs.ids[0].map((id: string, index: number) => ({
        id,
        document: `Updated Batch Document ${index + 1}: This batch document has been enhanced with advanced content management features, improved metadata structure, and optimized for semantic search performance. The update includes better categorization and tagging systems.`,
        metadata: {
          title: `Updated Batch Document ${index + 1}`,
          category: 'updated-batch',
          tags: 'batch,updated,enhanced,optimized',
          author: 'Batch Updater',
          source: 'generated',
          confidence: 0.95,
          language: 'en',
          wordCount: 38,
          version: 2,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
          updated: true,
          updateIndex: index + 1,
          batchUpdateReason: 'Enhanced content structure and metadata',
        }
      }));

      const { duration: batchUpdateTime } = await this.timer.measure('update-batch', async () => {
        await this.chromaDB.upsertDocuments(this.collectionName, batchUpdates);
      });

      this.logger.logResults(
        'Batch documents updated',
        { count: batchUpdates.length },
        batchUpdateTime
      );
    }
  }

  /**
   * Demonstrate DELETE operations
   */
  private async demonstrateDelete(): Promise<void> {
    this.logger.logStep(4, 'DELETE Operations');

    // Delete specific documents
    const idsToDelete = ['batch-4', 'batch-5'];
    
    const { duration: deleteTime } = await this.timer.measure('delete-specific', async () => {
      await this.chromaDB.deleteDocuments(this.collectionName, idsToDelete);
    });

    this.logger.logResults(
      'Specific documents deleted',
      { ids: idsToDelete },
      deleteTime
    );

    // Verify deletion by attempting to retrieve
    const { result: verifyDelete, duration: verifyTime } = await this.timer.measure('verify-delete', async () => {
      return await this.chromaDB.getDocuments(this.collectionName, { ids: idsToDelete });
    });

    this.logger.logResults(
      'Delete verification',
      { 
        requestedIds: idsToDelete.length,
        foundIds: verifyDelete.ids?.[0]?.length || 0,
        successfullyDeleted: idsToDelete.length - (verifyDelete.ids?.[0]?.length || 0)
      },
      verifyTime
    );

    // Get final count of remaining documents
    const { result: finalCount } = await this.timer.measure('final-count', async () => {
      return await this.chromaDB.getDocuments(this.collectionName);
    });

    this.logger.logInfo(`Final document count: ${finalCount.ids?.[0]?.length || 0}`);
  }

  /**
   * Public method for manual execution
   */
  async executeBasicCrud(): Promise<void> {
    await this.runBasicCrudExample();
  }

  /**
   * Cleanup collection after example
   */
  private async cleanup(): Promise<void> {
    try {
      // Get all documents and delete them
      const docs = await this.chromaDB.getDocuments(this.collectionName);
      if (docs.ids?.[0] && docs.ids[0].length > 0) {
        await this.chromaDB.deleteDocuments(this.collectionName, docs.ids[0]);
        this.logger.logInfo(`Cleaned up ${docs.ids[0].length} documents`);
      } else {
        this.logger.logInfo('No documents to cleanup');
      }
    } catch (error) {
      this.logger.logWarning(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to get current collection stats
   */
  async getCollectionStats(): Promise<any> {
    const documents = await this.chromaDB.getDocuments(this.collectionName);
    return {
      collectionName: this.collectionName,
      totalDocuments: documents.ids?.[0]?.length || 0,
      sampleIds: documents.ids?.[0]?.slice(0, 5) || []
    };
  }
}

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
        },
      },
      enableHealthCheck: false, // Disable for examples
    }),
  ],
  providers: [BasicCrudService],
  exports: [BasicCrudService],
})
export class BasicCrudExampleModule {}