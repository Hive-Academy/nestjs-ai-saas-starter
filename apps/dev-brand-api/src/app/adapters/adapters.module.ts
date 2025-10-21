import { Module } from '@nestjs/common';

// Repositories and their dependencies
import { RepositoryModule } from '../repositories/repository.module';

// Memory Adapters
import { ChromaVectorAdapter } from './memory/chroma-vector.adapter';
import { Neo4jGraphAdapter } from './memory/neo4j-graph.adapter';

// HITL Adapters
import { Neo4jHitlStorageAdapter } from './hitl/neo4j-hitl-storage.adapter';
import { Neo4jInterruptionStorageAdapter } from './hitl/neo4j-interruption-storage.adapter';
import { Neo4jConfidenceStorageAdapter } from './hitl/neo4j-confidence-storage.adapter';
import { Neo4jFeedbackStorageAdapter } from './hitl/neo4j-feedback-storage.adapter';
import { Neo4jApprovalChainStorageAdapter } from './hitl/neo4j-approval-chain-storage.adapter';

/**
 * Adapters Module - Centralized adapter configuration and token injection
 *
 * ARCHITECTURE:
 * - Imports RepositoryModule (provides ChromaDB, Neo4j, and repositories)
 * - Provides memory and HITL adapters with string tokens for dependency injection
 * - Exports adapter tokens for consumption by MemoryModule and HitlModule
 * - Keeps adapter logic separate from AppModule
 *
 * DESIGN PATTERN:
 * - Follows same pattern as Checkpoint module (interface in library, implementation in app)
 * - Adapters contain app-specific business logic (VectorMemoryMetadata, importance calculation, etc.)
 * - String token injection prevents circular dependencies
 *
 * DI FLOW:
 * 1. RepositoryModule provides: MemoryGraphRepository, VectorMemoryRepository, HITL repositories
 * 2. AdaptersModule provides: Memory and HITL adapters with interface tokens
 * 3. MemoryModule/HitlModule inject: Adapter tokens
 */
@Module({
  imports: [
    RepositoryModule, // Provides repositories and database modules
  ],
  providers: [
    // Memory Vector Adapter - ChromaDB integration
    {
      provide: 'IVectorService',
      useClass: ChromaVectorAdapter,
    },

    // Memory Graph Adapter - Neo4j integration
    {
      provide: 'IGraphService',
      useClass: Neo4jGraphAdapter,
    },

    // HITL Storage Adapters - Neo4j integration (using custom tokens to avoid circular dependency)
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
    // Export tokens for MemoryModule to inject
    'IVectorService',
    'IGraphService',

    // Export tokens for HitlModule to inject (custom tokens to prevent circular deps)
    'HITL_STORAGE',
    'HITL_INTERRUPTION_STORAGE',
    'HITL_CONFIDENCE_STORAGE',
    'HITL_FEEDBACK_STORAGE',
    'HITL_APPROVAL_CHAIN_STORAGE',
  ],
})
export class AdaptersModule {}
