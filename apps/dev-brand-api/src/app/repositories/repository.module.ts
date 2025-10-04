import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule, getRepositoryToken } from '@hive-academy/nestjs-neo4j';

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

// Neo4j Entities (for forFeature registration)
import { Memory } from '../entities/neo4j/memory.entity';
import { ApprovalRequest } from '../entities/neo4j/approval-request.entity';
import { InterruptionPoint } from '../entities/neo4j/interruption.entity';
import { ConfidencePattern } from '../entities/neo4j/confidence-pattern.entity';
import { FeedbackEntry } from '../entities/neo4j/feedback.entity';
import { Developer } from '../entities/neo4j/developer.entity';
import { Achievement } from '../entities/neo4j/achievement.entity';

// Graph Services
import { GraphTraversalService } from './services/graph-traversal.service';
import { GraphAgentService } from './services/graph-agent.service';
import { GraphCrudService } from './services/graph-crud.service';
import { GraphHelpersService } from './services/graph-helpers.service';

/**
 * Repository Module - TypeORM-Style Pattern
 *
 * ARCHITECTURE:
 * - Uses Neo4jModule.forFeature() to auto-generate repositories
 * - Custom repositories override defaults via provider pattern
 * - Exports via getRepositoryToken() for type-safe injection
 * - ChromaDB repositories remain unchanged
 */
@Module({
  imports: [
    ChromaDBModule,
    Neo4jModule,
    // ✅ Auto-generate Neo4j repositories for all entities
    Neo4jModule.forFeature([
      Memory,
      ApprovalRequest,
      InterruptionPoint,
      ConfidencePattern,
      FeedbackEntry,
      Developer,
      Achievement,
    ]),
  ],
  providers: [
    // Graph services (dependencies of MemoryGraphRepository)
    GraphTraversalService,
    GraphAgentService,
    GraphCrudService,
    GraphHelpersService,

    // ChromaDB Repository (unchanged)
    VectorMemoryRepository,

    // ✅ Custom Neo4j Repositories (override auto-generated defaults)
    {
      provide: getRepositoryToken(Memory),
      useClass: MemoryGraphRepository,
    },
    {
      provide: getRepositoryToken(ApprovalRequest),
      useClass: ApprovalRequestRepository,
    },
    {
      provide: getRepositoryToken(ApprovalRequest),
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
      provide: getRepositoryToken(Developer),
      useClass: DeveloperRepository,
    },
    {
      provide: getRepositoryToken(Achievement),
      useClass: AchievementRepository,
    },
  ],
  exports: [
    // ChromaDB Repository
    VectorMemoryRepository,

    // ✅ Neo4j Repositories (exported via injection tokens)
    getRepositoryToken(Memory),
    getRepositoryToken(ApprovalRequest),
    getRepositoryToken(InterruptionPoint),
    getRepositoryToken(ConfidencePattern),
    getRepositoryToken(FeedbackEntry),
    getRepositoryToken(Developer),
    getRepositoryToken(Achievement),
  ],
})
export class RepositoryModule {}
