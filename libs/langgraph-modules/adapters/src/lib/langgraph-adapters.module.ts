import { Module } from '@nestjs/common';
import { getRepositoryToken, Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Entities
import {
  ApprovalChain,
  ApprovalRequest,
  ApprovalResponse,
  ConfidencePattern,
  FeedbackEntry,
  InterruptionPoint,
  Thread,
} from './entities/neo4j';

// Repositories
import {
  ApprovalRequestRepository,
  ApprovalChainRepository,
  ConfidencePatternRepository,
  FeedbackRepository,
  InterruptionRepository,
  ThreadRegistryRepository,
} from './repositories/neo4j';

// Adapters
// Memory adapters deleted in Task 7.6 - replaced by ChromaDBBaseStore
import {
  Neo4jHitlStorageAdapter,
  Neo4jApprovalChainStorageAdapter,
  Neo4jConfidenceStorageAdapter,
  Neo4jFeedbackStorageAdapter,
  Neo4jInterruptionStorageAdapter,
} from './adapters/hitl';
import { Neo4jThreadRegistryAdapter } from './adapters/thread-registry';

/**
 * LangGraph Adapters Module - Generic Database Adapters for HITL & LangGraph Store
 *
 * ARCHITECTURE:
 * - Provides production-ready Neo4j + ChromaDB adapters for HITL and LangGraph Store
 * - Includes entities, repositories, and adapter implementations
 * - Fully generic and reusable across any LangGraph application
 * - Eliminates boilerplate for new projects
 *
 * DESIGN PATTERN:
 * - Follows TypeORM-style pattern with forFeature() registration
 * - Custom repositories override auto-generated defaults
 * - String token injection prevents circular dependencies
 * - Adapters implement library interfaces (IHitlStorageService, etc.)
 *
 * DI FLOW:
 * 1. Registers entities with Neo4jModule.forFeature() and ChromaDBModule.forFeature()
 * 2. Provides custom repositories for advanced operations
 * 3. Provides adapters that implement library interfaces
 * 4. Exports adapter tokens for consumption by HitlModule
 *
 * USAGE:
 * ```typescript
 * @Module({
 *   imports: [
 *     Neo4jModule.forRoot({...}),
 *     ChromaDBModule.forRoot({...}),
 *     LangGraphAdaptersModule.forRoot(), // ✅ One line!
 *     HitlModule.forRoot({...}),
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    // ChromaDBModule,
    Neo4jModule,
    // Auto-generate Neo4j repositories for all generic entities
    Neo4jModule.forFeature([
      ApprovalChain,
      ApprovalRequest,
      ApprovalResponse,
      InterruptionPoint,
      ConfidencePattern,
      FeedbackEntry,
      Thread, // Thread registry entity
    ]),
    // Auto-generate ChromaDB repositories for all generic entities
    // ChromaDBModule.forFeature([LangGraphStoreEntity]),
  ],
  providers: [
    // Custom Neo4j Repositories (override auto-generated defaults with advanced operations)
    {
      provide: getRepositoryToken(ApprovalRequest),
      useClass: ApprovalRequestRepository,
    },
    {
      provide: getRepositoryToken(ApprovalChain),
      useClass: ApprovalChainRepository,
    },
    {
      provide: getRepositoryToken(InterruptionPoint),
      useClass: InterruptionRepository,
    },
    {
      provide: getRepositoryToken(ConfidencePattern),
      useClass: ConfidencePatternRepository,
    },
    {
      provide: getRepositoryToken(FeedbackEntry),
      useClass: FeedbackRepository,
    },
    {
      provide: getRepositoryToken(Thread),
      useClass: ThreadRegistryRepository,
    },

    // Custom ChromaDB Repositories (override auto-generated defaults)
    // {
    //   provide: getChromaRepositoryToken(LangGraphStoreEntity),
    //   useClass: LangGraphStoreRepository,
    // },

    // HITL Storage Adapters (implement library interfaces with custom tokens to prevent circular dependencies)
    {
      provide: 'HITL_STORAGE',
      useClass: Neo4jHitlStorageAdapter,
    },
    {
      provide: 'HITL_INTERRUPTION_STORAGE',
      useClass: Neo4jInterruptionStorageAdapter,
    },
    {
      provide: 'HITL_CONFIDENCE_STORAGE',
      useClass: Neo4jConfidenceStorageAdapter,
    },
    {
      provide: 'HITL_FEEDBACK_STORAGE',
      useClass: Neo4jFeedbackStorageAdapter,
    },
    {
      provide: 'HITL_APPROVAL_CHAIN_STORAGE',
      useClass: Neo4jApprovalChainStorageAdapter,
    },

    // Thread Registry Adapter (for MemoryModule thread listing)
    {
      provide: 'THREAD_REGISTRY_ADAPTER',
      useClass: Neo4jThreadRegistryAdapter,
    },
  ],
  exports: [
    // Export Neo4j repositories for advanced usage
    getRepositoryToken(ApprovalRequest),
    getRepositoryToken(ApprovalChain),
    getRepositoryToken(InterruptionPoint),
    getRepositoryToken(ConfidencePattern),
    getRepositoryToken(FeedbackEntry),
    getRepositoryToken(Thread), // Thread registry repository

    // Export ChromaDB repositories for advanced usage
    // getChromaRepositoryToken(LangGraphStoreEntity),

    // Export adapter tokens for HitlModule to inject
    'HITL_STORAGE',
    'HITL_INTERRUPTION_STORAGE',
    'HITL_CONFIDENCE_STORAGE',
    'HITL_FEEDBACK_STORAGE',
    'HITL_APPROVAL_CHAIN_STORAGE',

    // Export thread registry adapter for MemoryModule
    'THREAD_REGISTRY_ADAPTER',
  ],
})
export class LangGraphAdaptersModule {
  /**
   * Register the adapters module
   */
  static forRoot() {
    return {
      module: LangGraphAdaptersModule,
      global: false, // Not global - users should import where needed
    };
  }
}
