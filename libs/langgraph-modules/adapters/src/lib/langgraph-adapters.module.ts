import { Module } from '@nestjs/common';
import {
  ChromaDBModule,
  getRepositoryToken as getChromaRepositoryToken,
} from '@hive-academy/nestjs-chromadb';

import { getRepositoryToken, Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Entities
import {
  Memory,
  StoreItemEntity,
  ApprovalChain,
  ApprovalRequest,
  ApprovalResponse,
  ConfidencePattern,
  FeedbackEntry,
  InterruptionPoint,
} from './entities/neo4j';
import { VectorMemoryEntity, LangGraphStoreEntity } from './entities/chromadb';

// Repositories
import {
  MemoryGraphRepository,
  StoreGraphRepository,
  ApprovalRequestRepository,
  ApprovalChainRepository,
  ConfidencePatternRepository,
  FeedbackRepository,
  InterruptionRepository,
} from './repositories/neo4j';
import {
  VectorMemoryRepository,
  LangGraphStoreRepository,
} from './repositories/chromadb';

// Graph Helper Services
import {
  GraphCrudService,
  GraphAgentService,
  GraphTraversalService,
  GraphHelpersService,
} from './repositories/services';

// Adapters
// Memory adapters deleted in Task 7.6 - replaced by ChromaDBBaseStore
import {
  Neo4jHitlStorageAdapter,
  Neo4jApprovalChainStorageAdapter,
  Neo4jConfidenceStorageAdapter,
  Neo4jFeedbackStorageAdapter,
  Neo4jInterruptionStorageAdapter,
} from './adapters/hitl';

/**
 * LangGraph Adapters Module - Generic Database Adapters for Memory & HITL
 *
 * ARCHITECTURE:
 * - Provides production-ready Neo4j + ChromaDB adapters for Memory and HITL modules
 * - Includes entities, repositories, and adapter implementations
 * - Fully generic and reusable across any LangGraph application
 * - Eliminates ~2000+ lines of boilerplate for new projects
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
 * 4. Exports adapter tokens for consumption by MemoryModule and HitlModule
 *
 * USAGE:
 * ```typescript
 * @Module({
 *   imports: [
 *     Neo4jModule.forRoot({...}),
 *     ChromaDBModule.forRoot({...}),
 *     LangGraphAdaptersModule.forRoot(), // ✅ One line!
 *     MemoryModule.forRoot({...}),
 *     HitlModule.forRoot({...}),
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    ChromaDBModule,
    Neo4jModule,
    // Auto-generate Neo4j repositories for all generic entities
    Neo4jModule.forFeature([
      Memory,
      StoreItemEntity,
      ApprovalChain,
      ApprovalRequest,
      ApprovalResponse,
      InterruptionPoint,
      ConfidencePattern,
      FeedbackEntry,
    ]),
    // Auto-generate ChromaDB repositories for all generic entities
    ChromaDBModule.forFeature([VectorMemoryEntity, LangGraphStoreEntity]),
  ],
  providers: [
    // Graph Helper Services (dependencies of MemoryGraphRepository)
    GraphTraversalService,
    GraphAgentService,
    GraphCrudService,
    GraphHelpersService,

    // Custom Neo4j Repositories (override auto-generated defaults with advanced operations)
    {
      provide: getRepositoryToken(Memory),
      useClass: MemoryGraphRepository,
    },
    {
      provide: getRepositoryToken(StoreItemEntity),
      useClass: StoreGraphRepository,
    },
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

    // Custom ChromaDB Repositories (override auto-generated defaults)
    {
      provide: getChromaRepositoryToken(VectorMemoryEntity),
      useClass: VectorMemoryRepository,
    },
    {
      provide: getChromaRepositoryToken(LangGraphStoreEntity),
      useClass: LangGraphStoreRepository,
    },

    // Memory adapters deleted in Task 7.6 - replaced by ChromaDBBaseStore pattern
    // IVectorService and IGraphService no longer provided

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
  ],
  exports: [
    // Export Neo4j repositories for advanced usage
    getRepositoryToken(Memory),
    getRepositoryToken(StoreItemEntity),
    getRepositoryToken(ApprovalRequest),
    getRepositoryToken(ApprovalChain),
    getRepositoryToken(InterruptionPoint),
    getRepositoryToken(ConfidencePattern),
    getRepositoryToken(FeedbackEntry),

    // Export ChromaDB repositories for advanced usage
    getChromaRepositoryToken(VectorMemoryEntity),
    getChromaRepositoryToken(LangGraphStoreEntity),

    // Memory adapters no longer exported - MemoryModule uses BaseStore pattern

    // Export adapter tokens for HitlModule to inject
    'HITL_STORAGE',
    'HITL_INTERRUPTION_STORAGE',
    'HITL_CONFIDENCE_STORAGE',
    'HITL_FEEDBACK_STORAGE',
    'HITL_APPROVAL_CHAIN_STORAGE',
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
