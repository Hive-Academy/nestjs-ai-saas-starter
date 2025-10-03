import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

// Memory Repositories
import { MemoryGraphRepository } from './neo4j/memory-graph.repository';
import { VectorMemoryRepository } from './chromadb/vector-memory.repository';

// HITL Repositories (needed by AdaptersModule)
import { ApprovalRequestRepository } from './neo4j/approval-request.repository';
import { ApprovalChainRepository } from './neo4j/approval-chain.repository';
import { InterruptionRepository } from './neo4j/interruption.repository';
import { ConfidencePatternRepository } from './neo4j/confidence-pattern.repository';
import { FeedbackRepository } from './neo4j/feedback.repository';

// Business Domain Repositories
import { DeveloperRepository } from './neo4j/developer.repository';
import { AchievementRepository } from './neo4j/achievement.repository';

// Graph Services
import { GraphTraversalService } from './services/graph-traversal.service';
import { GraphAgentService } from './services/graph-agent.service';
import { GraphCrudService } from './services/graph-crud.service';
import { GraphHelpersService } from './services/graph-helpers.service';

/**
 * Repository Module - Exports all repository services
 *
 * CRITICAL: Must import ChromaDBModule for @ChromaRepository decorator to work
 * ARCHITECTURE:
 * - Provides Memory repositories and their dependencies
 * - HITL repositories must be explicitly exported for AdaptersModule injection
 * - Exports repositories for use in adapters
 * - Imported by AdaptersModule
 */
@Module({
  imports: [ChromaDBModule, Neo4jModule],
  providers: [
    // Graph services (dependencies of MemoryGraphRepository)
    GraphTraversalService,
    GraphAgentService,
    GraphCrudService,
    GraphHelpersService,

    // Memory Repositories (manually registered)
    MemoryGraphRepository,
    VectorMemoryRepository,

    // HITL Repositories (explicitly provided for AdaptersModule injection)
    ApprovalRequestRepository,
    ApprovalChainRepository,
    InterruptionRepository,
    ConfidencePatternRepository,
    FeedbackRepository,

    // Business Domain Repositories
    DeveloperRepository,
    AchievementRepository,
  ],
  exports: [
    // Memory Repositories
    MemoryGraphRepository,
    VectorMemoryRepository,

    // HITL Repositories (explicitly exported for AdaptersModule injection)
    ApprovalRequestRepository,
    ApprovalChainRepository,
    InterruptionRepository,
    ConfidencePatternRepository,
    FeedbackRepository,

    // Business Domain Repositories
    DeveloperRepository,
    AchievementRepository,
  ],
})
export class RepositoryModule {}
