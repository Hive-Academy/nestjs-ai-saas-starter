import {
  ChromaDBModule,
  getRepositoryToken as getChromaRepositoryToken,
} from '@hive-academy/nestjs-chromadb';
import {
  getRepositoryToken,
  Neo4jModule,
  NeogmaService,
  NeogmaQueryBuilderService,
  NeogmaQueryRunnerService,
  RelationshipBulkOperationsService,
  RelationshipCoreRepository,
} from '@hive-academy/nestjs-neo4j';
import { Module } from '@nestjs/common';

// Memory Repositories
import { VectorMemoryRepository } from './chromadb/vector-memory.repository';
import { MemoryGraphRepository } from './neo4j/memory-graph.repository';

// ChromaDB Entities (for forFeature registration)
import { BrandStrategyEntity } from '../entities/chromadb/brand-strategy.entity';
import { CodeAchievementEntity } from '../entities/chromadb/code-achievement.entity';
import { ContentPerformanceEntity } from '../entities/chromadb/content-performance.entity';
import { VectorMemoryEntity } from '../entities/chromadb/vector-memory.entity';

// Custom ChromaDB Repositories (analytics only)
import { BrandStrategyRepository } from './chromadb/brand-strategy.repository';
import { CodeAchievementRepository } from './chromadb/code-achievement.repository';
import { ContentPerformanceRepository } from './chromadb/content-performance.repository';

// HITL Repositories (needed by AdaptersModule)
import { ApprovalRequestRepository } from './neo4j/approval-request.repository';
import { ConfidencePatternRepository } from './neo4j/confidence-pattern.repository';
import { FeedbackRepository } from './neo4j/feedback.repository';
import { InterruptionRepository } from './neo4j/interruption.repository';

// Business Domain Repositories
import { AchievementRepository } from './neo4j/achievement.repository';
import { DeveloperRepository } from './neo4j/developer.repository';

// Neo4j Entities (for forFeature registration)
import { Achievement } from '../entities/neo4j/achievement.entity';
import { ApprovalRequest } from '../entities/neo4j/approval-request.entity';
import { ConfidencePattern } from '../entities/neo4j/confidence-pattern.entity';
import { Developer } from '../entities/neo4j/developer.entity';
import { FeedbackEntry } from '../entities/neo4j/feedback-entry.entity';
import { InterruptionPoint } from '../entities/neo4j/interruption-point.entity';
import { Memory } from '../entities/neo4j/memory.entity';

// Graph Services (local implementations)
import { GraphAgentService } from './services/graph-agent.service';
import { GraphCrudService } from './services/graph-crud.service';
import { GraphHelpersService } from './services/graph-helpers.service';
import { GraphTraversalService as LocalGraphTraversalService } from './services/graph-traversal.service';

/**
 * Repository Module - TypeORM-Style Pattern (UPDATED)
 *
 * ARCHITECTURE:
 * - Uses Neo4jModule.forFeature() to auto-generate Neo4j repositories
 * - Uses ChromaDBModule.forFeature() to auto-generate ChromaDB repositories
 * - Custom repositories override defaults via provider pattern
 * - Exports via getRepositoryToken() for type-safe injection
 * - Both Neo4j and ChromaDB now follow the same TypeORM-style pattern
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
    // ✅ Auto-generate ChromaDB repositories for all entities
    ChromaDBModule.forFeature([
      VectorMemoryEntity,
      CodeAchievementEntity,
      BrandStrategyEntity,
      ContentPerformanceEntity,
    ]),
  ],
  providers: [
    // ❌ REMOVED: Neo4jCrudService is now provided by Neo4jModule (global service)
    // ❌ REMOVED: GraphMetricsService, GraphPatternService, GraphTraversalService
    //     These are now exported from Neo4jModule - no need to re-register

    // Graph services (local implementations - dependencies of MemoryGraphRepository)
    LocalGraphTraversalService,
    GraphAgentService,
    GraphCrudService,
    GraphHelpersService,

    // ✅ Custom ChromaDB Repositories (override auto-generated for analytics)
    {
      provide: getChromaRepositoryToken(VectorMemoryEntity),
      useClass: VectorMemoryRepository,
    },
    {
      provide: getChromaRepositoryToken(CodeAchievementEntity),
      useClass: CodeAchievementRepository,
    },
    {
      provide: getChromaRepositoryToken(BrandStrategyEntity),
      useClass: BrandStrategyRepository,
    },
    {
      provide: getChromaRepositoryToken(ContentPerformanceEntity),
      useClass: ContentPerformanceRepository,
    },

    // ✅ Custom Neo4j Repositories (override auto-generated defaults)
    {
      provide: getRepositoryToken(Memory),
      useClass: MemoryGraphRepository,
    },
    {
      provide: getRepositoryToken(ApprovalRequest),
      useClass: ApprovalRequestRepository,
    },
    // REMOVED DUPLICATE - ApprovalChainRepository needs its own entity
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

    // ✅ Relationship Core Repositories (factory providers - type-safe, no 'as any')
    {
      provide: 'USES_TECHNOLOGY_REPOSITORY',
      useFactory: (
        neogma: NeogmaService,
        queryBuilder: NeogmaQueryBuilderService,
        queryRunner: NeogmaQueryRunnerService
      ) => {
        return new RelationshipCoreRepository(
          neogma,
          queryBuilder,
          queryRunner,
          'USES_TECHNOLOGY',
          'Achievement',
          'Technology'
        );
      },
      inject: [
        NeogmaService,
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
      ],
    },
    {
      provide: 'EXPERIENCED_WITH_REPOSITORY',
      useFactory: (
        neogma: NeogmaService,
        queryBuilder: NeogmaQueryBuilderService,
        queryRunner: NeogmaQueryRunnerService
      ) => {
        return new RelationshipCoreRepository(
          neogma,
          queryBuilder,
          queryRunner,
          'EXPERIENCED_WITH',
          'Developer',
          'Technology'
        );
      },
      inject: [
        NeogmaService,
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
      ],
    },
    {
      provide: 'ACHIEVED_RELATIONSHIP_REPOSITORY',
      useFactory: (
        neogma: NeogmaService,
        queryBuilder: NeogmaQueryBuilderService,
        queryRunner: NeogmaQueryRunnerService
      ) => {
        return new RelationshipCoreRepository(
          neogma,
          queryBuilder,
          queryRunner,
          'ACHIEVED',
          'Developer',
          'Achievement'
        );
      },
      inject: [
        NeogmaService,
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
      ],
    },

    // ✅ Relationship Bulk Operations Services (factory providers - type-safe, no 'as any')
    {
      provide: 'USES_TECHNOLOGY_BULK_SERVICE',
      useFactory: (
        neogma: NeogmaService,
        queryBuilder: NeogmaQueryBuilderService,
        queryRunner: NeogmaQueryRunnerService
      ) => {
        return new RelationshipBulkOperationsService(
          neogma,
          queryBuilder,
          queryRunner,
          'USES_TECHNOLOGY',
          'Achievement',
          'Technology'
        );
      },
      inject: [
        NeogmaService,
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
      ],
    },
    {
      provide: 'EXPERIENCED_WITH_BULK_SERVICE',
      useFactory: (
        neogma: NeogmaService,
        queryBuilder: NeogmaQueryBuilderService,
        queryRunner: NeogmaQueryRunnerService
      ) => {
        return new RelationshipBulkOperationsService(
          neogma,
          queryBuilder,
          queryRunner,
          'EXPERIENCED_WITH',
          'Developer',
          'Technology'
        );
      },
      inject: [
        NeogmaService,
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
      ],
    },
    {
      provide: 'ACHIEVED_BULK_SERVICE',
      useFactory: (
        neogma: NeogmaService,
        queryBuilder: NeogmaQueryBuilderService,
        queryRunner: NeogmaQueryRunnerService
      ) => {
        return new RelationshipBulkOperationsService(
          neogma,
          queryBuilder,
          queryRunner,
          'ACHIEVED',
          'Developer',
          'Achievement'
        );
      },
      inject: [
        NeogmaService,
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
      ],
    },
  ],
  exports: [
    // ✅ ChromaDB Repositories (exported via injection tokens)
    getChromaRepositoryToken(VectorMemoryEntity),
    getChromaRepositoryToken(CodeAchievementEntity),
    getChromaRepositoryToken(BrandStrategyEntity),
    getChromaRepositoryToken(ContentPerformanceEntity),

    // ✅ Neo4j Repositories (exported via injection tokens)
    getRepositoryToken(Memory),
    getRepositoryToken(ApprovalRequest),
    getRepositoryToken(InterruptionPoint),
    getRepositoryToken(ConfidencePattern),
    getRepositoryToken(FeedbackEntry),
    getRepositoryToken(Developer),
    getRepositoryToken(Achievement),

    // ❌ REMOVED: Graph services are now exported from Neo4jModule directly
    // No need to re-export them here

    // ✅ Relationship Core Repositories (exported via injection tokens)
    'USES_TECHNOLOGY_REPOSITORY',
    'EXPERIENCED_WITH_REPOSITORY',
    'ACHIEVED_RELATIONSHIP_REPOSITORY',

    // ✅ Relationship Bulk Operations Services (exported via injection tokens)
    'USES_TECHNOLOGY_BULK_SERVICE',
    'EXPERIENCED_WITH_BULK_SERVICE',
    'ACHIEVED_BULK_SERVICE',
  ],
})
export class RepositoryModule {}
