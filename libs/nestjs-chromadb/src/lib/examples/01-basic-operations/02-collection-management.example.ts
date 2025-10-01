/**
 * @fileoverview Collection Management Example
 *
 * Demonstrates comprehensive collection management including creation,
 * configuration, metadata handling, and administrative operations.
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBFacadeService,
  ChromaAdminService,
} from '../../../index';
import { DemoLogger, PerformanceTimer, ExampleValidator } from '../shared';

interface CollectionStats {
  name: string;
  documentCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  lastModified: string;
}

@Injectable()
export class CollectionManagementService implements OnModuleInit {
  private readonly logger = new DemoLogger();
  private readonly timer = new PerformanceTimer();

  constructor(
    private readonly chromaDB: ChromaDBFacadeService,
    private readonly adminService: ChromaAdminService // Used for server info operations
  ) {}

  async onModuleInit() {
    await this.runCollectionManagementExample();
  }

  /**
   * Complete collection management demonstration
   */
  async runCollectionManagementExample(): Promise<void> {
    this.logger.logSeparator('Collection Management Example');

    try {
      await this.demonstrateCollectionCreation();
      await this.demonstrateCollectionConfiguration();
      await this.demonstrateCollectionMetadata();
      await this.demonstrateCollectionInspection();
      await this.demonstrateCollectionMaintenance();
      await this.cleanupCollections();
    } catch (error) {
      this.logger.logError('Collection Management Example', error as Error);
      throw error;
    }
  }

  /**
   * Demonstrate various collection creation patterns
   */
  private async demonstrateCollectionCreation(): Promise<void> {
    this.logger.logStep(1, 'Collection Creation Patterns');

    // Basic collection creation
    const basicCollectionName = 'basic-collection-example';
    const { duration: basicCreateTime } = await this.timer.measure(
      'create-basic',
      async () => {
        await this.chromaDB.createCollection(basicCollectionName, {
          purpose: 'basic-example',
          environment: 'test',
          createdBy: 'collection-management-example',
        });
      }
    );

    this.logger.logResults(
      'Basic collection created',
      { name: basicCollectionName },
      basicCreateTime
    );

    // Collection with detailed metadata
    const advancedCollectionName = 'advanced-collection-example';
    const advancedMetadata = {
      purpose: 'advanced-example',
      environment: 'test',
      version: '1.0.0',
      description: 'Advanced collection with comprehensive metadata',
      owner: 'collection-management-service',
      tags: ['example', 'advanced', 'metadata'],
      configuration: {
        maxDocuments: 10000,
        embeddingDimensions: 1536,
        indexingStrategy: 'hnsw',
      },
      createdAt: new Date().toISOString(),
      retention: {
        policy: 'test-cleanup',
        daysToKeep: 7,
      },
    };

    const { duration: advancedCreateTime } = await this.timer.measure(
      'create-advanced',
      async () => {
        await this.chromaDB.createCollection(
          advancedCollectionName,
          advancedMetadata
        );
      }
    );

    this.logger.logResults(
      'Advanced collection created',
      {
        name: advancedCollectionName,
        metadataKeys: Object.keys(advancedMetadata).length,
      },
      advancedCreateTime
    );

    // Specialized collections for different use cases
    const specializedCollections = [
      {
        name: 'documents-collection',
        metadata: {
          purpose: 'document-storage',
          contentType: 'text',
          language: 'en',
          indexing: 'semantic',
        },
      },
      {
        name: 'products-collection',
        metadata: {
          purpose: 'product-catalog',
          contentType: 'structured',
          domain: 'ecommerce',
          indexing: 'hybrid',
        },
      },
      {
        name: 'knowledge-base-collection',
        metadata: {
          purpose: 'knowledge-management',
          contentType: 'mixed',
          domain: 'enterprise',
          indexing: 'contextual',
        },
      },
    ];

    for (const collection of specializedCollections) {
      const { duration } = await this.timer.measure(
        `create-${collection.name}`,
        async () => {
          await this.chromaDB.createCollection(
            collection.name,
            collection.metadata
          );
        }
      );

      this.logger.logResults(
        'Specialized collection created',
        { name: collection.name, purpose: collection.metadata.purpose },
        duration
      );
    }
  }

  /**
   * Demonstrate collection configuration management
   */
  private async demonstrateCollectionConfiguration(): Promise<void> {
    this.logger.logStep(2, 'Collection Configuration');

    const configCollectionName = 'config-test-collection';

    // Create collection with initial configuration
    const initialConfig = {
      environment: 'development',
      version: '1.0.0',
      features: {
        caching: true,
        compression: false,
        monitoring: true,
      },
      limits: {
        maxDocuments: 1000,
        maxDocumentSize: 1048576, // 1MB
        batchSize: 100,
      },
    };

    await this.chromaDB.createCollection(configCollectionName, initialConfig);

    // Validate collection configuration
    const validationResult = ExampleValidator.validateCollectionConfiguration({
      name: configCollectionName,
      ...initialConfig,
    });

    this.logger.logResults('Configuration validation', {
      valid: validationResult.valid,
      errors: validationResult.errors,
    });

    // Demonstrate configuration updates (via recreation with new metadata)
    const updatedConfig = {
      ...initialConfig,
      version: '1.1.0',
      features: {
        ...initialConfig.features,
        compression: true,
        autoBackup: true,
      },
      limits: {
        ...initialConfig.limits,
        maxDocuments: 5000,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Note: ChromaDB doesn't support direct metadata updates,
    // so we demonstrate the pattern of recreating with new config
    this.logger.logInfo('Configuration updated (metadata pattern)');
    this.logger.logResults('Updated configuration', {
      version: updatedConfig.version,
      newFeatures: Object.keys(updatedConfig.features).filter(
        (key) =>
          !(key in initialConfig.features) ||
          updatedConfig.features[key as keyof typeof updatedConfig.features] !==
            initialConfig.features[key as keyof typeof initialConfig.features]
      ),
    });
  }

  /**
   * Demonstrate metadata management patterns
   */
  private async demonstrateCollectionMetadata(): Promise<void> {
    this.logger.logStep(3, 'Metadata Management');

    const metadataCollectionName = 'metadata-demo-collection';

    // Rich metadata example
    const richMetadata = {
      // Basic information
      name: metadataCollectionName,
      description: 'Demonstration of comprehensive metadata usage',
      version: '2.0.0',

      // Ownership and governance
      owner: 'data-team',
      maintainers: ['alice@company.com', 'bob@company.com'],
      department: 'engineering',
      project: 'vector-search-platform',

      // Technical specifications
      technical: {
        embeddingModel: 'text-embedding-ada-002',
        embeddingDimensions: 1536,
        similarityMetric: 'cosine',
        indexType: 'hnsw',
        indexParameters: {
          efConstruction: 200,
          m: 16,
        },
      },

      // Business context
      business: {
        useCase: 'semantic-search',
        domain: 'customer-support',
        priority: 'high',
        sla: {
          availability: '99.9%',
          responseTime: '100ms',
          throughput: '1000 queries/second',
        },
      },

      // Operational metadata
      operational: {
        environment: 'production',
        region: 'us-east-1',
        backupStrategy: 'daily',
        monitoring: {
          enabled: true,
          alerts: ['high-latency', 'low-accuracy', 'capacity-threshold'],
          dashboardUrl:
            'https://monitoring.company.com/collections/metadata-demo',
        },
      },

      // Data governance
      governance: {
        dataClassification: 'internal',
        retentionPeriod: '2-years',
        complianceRequirements: ['GDPR', 'CCPA'],
        lastAudit: new Date('2024-01-15').toISOString(),
        nextReview: new Date('2024-07-15').toISOString(),
      },

      // Timestamps
      timestamps: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      },
    };

    const { duration: metadataCreateTime } = await this.timer.measure(
      'create-with-metadata',
      async () => {
        await this.chromaDB.createCollection(
          metadataCollectionName,
          richMetadata
        );
      }
    );

    this.logger.logResults(
      'Collection with rich metadata created',
      {
        name: metadataCollectionName,
        metadataCategories: Object.keys(richMetadata).filter(
          (key) =>
            typeof richMetadata[key as keyof typeof richMetadata] === 'object'
        ).length,
        totalMetadataFields: this.countNestedFields(richMetadata),
      },
      metadataCreateTime
    );

    // Demonstrate metadata validation patterns
    const metadataValidation = {
      hasRequiredFields: !!(
        richMetadata.name &&
        richMetadata.description &&
        richMetadata.version
      ),
      hasOwnership: !!(richMetadata.owner && richMetadata.maintainers),
      hasTechnicalSpecs: !!(
        richMetadata.technical && richMetadata.technical.embeddingModel
      ),
      hasGovernance: !!(
        richMetadata.governance && richMetadata.governance.dataClassification
      ),
    };

    this.logger.logResults('Metadata validation', metadataValidation);

    // Use adminService to get server info
    try {
      const serverInfo = await this.adminService.getStatistics();
      this.logger.logResults('Server information', {
        totalCollections: serverInfo.totalCollections,
        totalDocuments: serverInfo.totalDocuments,
      });
    } catch (error) {
      this.logger.logWarning(
        'Could not retrieve server info from adminService'
      );
    }
  }

  /**
   * Demonstrate collection inspection and monitoring
   */
  private async demonstrateCollectionInspection(): Promise<void> {
    this.logger.logStep(4, 'Collection Inspection');

    try {
      // List all collections using the ChromaDBService instead of adminService
      const { result: collections, duration: listTime } =
        await this.timer.measure('list-collections', async () => {
          const collectionInfos = await this.chromaDB.listCollections();
          return collectionInfos.map((info: any) => info.name || info);
        });

      this.logger.logResults(
        'Collections listed',
        {
          total: collections.length,
          exampleCollections: collections.filter((name: string) =>
            name.includes('example')
          ).length,
        },
        listTime
      );

      // Inspect individual collections
      const exampleCollections = collections.filter((name: string) =>
        name.includes('example')
      );
      const collectionStats: CollectionStats[] = [];

      for (const collectionName of exampleCollections.slice(0, 3)) {
        // Limit to first 3 for demo
        try {
          const { result: documents, duration: inspectTime } =
            await this.timer.measure(`inspect-${collectionName}`, async () => {
              return await this.chromaDB.getDocuments(collectionName, {
                limit: 1,
              });
            });

          const stats: CollectionStats = {
            name: collectionName,
            documentCount: documents.ids?.[0]?.length || 0,
            metadata: {}, // Would need to store/retrieve collection metadata separately
            createdAt: new Date().toISOString(), // Placeholder
            lastModified: new Date().toISOString(), // Placeholder
          };

          collectionStats.push(stats);

          this.logger.logResults(
            `Collection inspected: ${collectionName}`,
            {
              documents: stats.documentCount,
              hasContent: stats.documentCount > 0,
            },
            inspectTime
          );
        } catch (error) {
          this.logger.logWarning(
            `Could not inspect collection ${collectionName}: ${
              (error as Error).message
            }`
          );
        }
      }

      // Summary report
      this.logger.logResults('Collection inspection summary', {
        totalInspected: collectionStats.length,
        totalDocuments: collectionStats.reduce(
          (sum, stats) => sum + stats.documentCount,
          0
        ),
        activeCollections: collectionStats.filter(
          (stats) => stats.documentCount > 0
        ).length,
      });
    } catch (error) {
      this.logger.logError('Collection inspection failed', error as Error);
    }
  }

  /**
   * Demonstrate collection maintenance operations
   */
  private async demonstrateCollectionMaintenance(): Promise<void> {
    this.logger.logStep(5, 'Collection Maintenance');

    const maintenanceCollectionName = 'maintenance-test-collection';

    // Create a collection for maintenance operations
    await this.chromaDB.createCollection(maintenanceCollectionName, {
      purpose: 'maintenance-demo',
      created: new Date().toISOString(),
    });

    // Add some test documents
    const testDocuments = Array.from({ length: 10 }, (_, i) => ({
      id: `maintenance-doc-${i}`,
      content: `Test document ${i} for maintenance operations`,
      metadata: { index: i, category: 'maintenance-test' },
    }));

    await this.chromaDB.addDocuments(maintenanceCollectionName, testDocuments);

    // Health check
    const { result: healthCheck, duration: healthTime } =
      await this.timer.measure('health-check', async () => {
        const docs = await this.chromaDB.getDocuments(
          maintenanceCollectionName
        );
        return {
          totalDocuments: docs.ids?.[0]?.length || 0,
          sampleDocument: docs.documents?.[0]?.[0],
          healthy: (docs.ids?.[0]?.length || 0) === testDocuments.length,
        };
      });

    this.logger.logResults('Collection health check', healthCheck, healthTime);

    // Performance check - sample search operation
    const { result: perfCheck, duration: perfTime } = await this.timer.measure(
      'performance-check',
      async () => {
        return await this.chromaDB.searchDocuments(
          maintenanceCollectionName,
          ['test document maintenance'],
          undefined,
          { nResults: 3 }
        );
      }
    );

    this.logger.logResults(
      'Performance check',
      {
        searchLatency: perfTime,
        resultsFound: perfCheck.ids?.[0]?.length || 0,
        performanceGrade:
          perfTime < 100
            ? 'excellent'
            : perfTime < 300
            ? 'good'
            : 'needs-attention',
      },
      perfTime
    );

    // Cleanup operations
    this.logger.logInfo('Performing maintenance cleanup...');
    await this.chromaDB.deleteDocuments(
      maintenanceCollectionName,
      testDocuments.slice(5).map((doc) => doc.id) // Delete half the documents
    );

    const finalCount = await this.chromaDB.getDocuments(
      maintenanceCollectionName
    );
    this.logger.logResults('Maintenance cleanup completed', {
      documentsRemaining: finalCount.ids?.[0]?.length || 0,
      documentsRemoved:
        testDocuments.length - (finalCount.ids?.[0]?.length || 0),
    });
  }

  /**
   * Cleanup all example collections
   */
  private async cleanupCollections(): Promise<void> {
    this.logger.logStep(6, 'Example Cleanup');

    try {
      const collectionInfos = await this.chromaDB.listCollections();
      const collections = collectionInfos.map((info: any) => info.name || info);
      const exampleCollections = collections.filter(
        (name: string) =>
          name.includes('example') ||
          name.includes('test') ||
          name.includes('demo')
      );

      let cleanedCount = 0;
      for (const collectionName of exampleCollections) {
        try {
          // Clear documents instead of deleting collection (ChromaDB doesn't have delete collection in basic API)
          const documents = await this.chromaDB.getDocuments(collectionName);
          if (documents.ids?.[0] && documents.ids[0].length > 0) {
            const ids = documents.ids[0];
            if (Array.isArray(ids)) {
              await this.chromaDB.deleteDocuments(collectionName, ids);
            }
          }
          cleanedCount++;
        } catch (error) {
          this.logger.logWarning(
            `Could not clean collection ${collectionName}: ${
              (error as Error).message
            }`
          );
        }
      }

      this.logger.logResults('Cleanup completed', {
        collectionsProcessed: exampleCollections.length,
        successfullyCleaned: cleanedCount,
      });
    } catch (error) {
      this.logger.logError('Cleanup operation failed', error as Error);
    }
  }

  /**
   * Helper method to count nested metadata fields
   */
  private countNestedFields(obj: any, depth = 0): number {
    let count = 0;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        count++;
        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key]) &&
          depth < 3
        ) {
          count += this.countNestedFields(obj[key], depth + 1);
        }
      }
    }
    return count;
  }

  /**
   * Public method for manual execution
   */
  async executeCollectionManagement(): Promise<void> {
    await this.runCollectionManagementExample();
  }

  /**
   * Get summary of all collections
   */
  async getCollectionsSummary(): Promise<any> {
    try {
      const collectionInfos = await this.chromaDB.listCollections();
      const collections = collectionInfos.map((info: any) => info.name || info);
      const summary = {
        totalCollections: collections.length,
        exampleCollections: collections.filter((name: string) =>
          name.includes('example')
        ).length,
        testCollections: collections.filter((name: string) =>
          name.includes('test')
        ).length,
        collections: collections.slice(0, 10), // First 10 collections
      };
      return summary;
    } catch (error) {
      return { error: (error as Error).message };
    }
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
      enableHealthCheck: false,
    }),
  ],
  providers: [CollectionManagementService],
  exports: [CollectionManagementService],
})
export class CollectionManagementExampleModule {}
