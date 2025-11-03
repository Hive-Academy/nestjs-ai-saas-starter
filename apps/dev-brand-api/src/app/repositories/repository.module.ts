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

// Application-specific Neo4j Repository (Store)
import { StoreGraphRepository } from './neo4j/store-graph.repository';

// Application-specific ChromaDB Entities (Analytics)
import { AudienceAnalysisEntity } from '../entities/chromadb/audience-analysis.entity';
import { BrandMentionEntity } from '../entities/chromadb/brand-mention.entity';
import { BrandStrategyEntity } from '../entities/chromadb/brand-strategy.entity';
import { CodeAchievementEntity } from '../entities/chromadb/code-achievement.entity';
import { CompetitorAnalysisEntity } from '../entities/chromadb/competitor-analysis.entity';
import { ContentPerformanceEntity } from '../entities/chromadb/content-performance.entity';
import { DeveloperProfileEntity } from '../entities/chromadb/developer-profile.entity';
import { TechTrendEntity } from '../entities/chromadb/tech-trend.entity';

// Application-specific ChromaDB Repositories (Analytics)
import { AudienceRepository } from './chromadb/audience-analysis.repository';
import { BrandMentionRepository } from './chromadb/brand-mention.repository';
import { BrandStrategyRepository } from './chromadb/brand-strategy.repository';
import { CodeAchievementRepository } from './chromadb/code-achievement.repository';
import { CompetitorAnalysisRepository } from './chromadb/competitor-analysis.repository';
import { ContentPerformanceRepository } from './chromadb/content-performance.repository';
import { DeveloperProfileRepository } from './chromadb/developer-profile.repository';
import { TechTrendsRepository } from './chromadb/tech-trends.repository';

// Application-specific Neo4j Repositories (Business Domain)
import { AchievementRepository } from './neo4j/achievement.repository';
import { DeveloperRepository } from './neo4j/developer.repository';

// Application-specific Neo4j Entities (Business Domain)
import { Achievement } from '../entities/neo4j/achievement.entity';
import { Developer } from '../entities/neo4j/developer.entity';
import { StoreItemEntity } from '../entities/neo4j/store-item.entity';

/**
 * Repository Module - Application-Specific Repositories
 *
 * ARCHITECTURE:
 * - Generic entities/repositories/adapters are now in @hive-academy/langgraph-adapters
 * - This module only handles application-specific entities (analytics and business domain)
 * - Uses Neo4jModule.forFeature() and ChromaDBModule.forFeature() for auto-generation
 * - Custom repositories override defaults via provider pattern
 * - Exports via getRepositoryToken() for type-safe injection
 */
@Module({
  imports: [
    ChromaDBModule,
    Neo4jModule,
    // Application-specific Neo4j entities
    Neo4jModule.forFeature([
      StoreItemEntity,
      Developer,
      Achievement,
    ]),
    // Application-specific ChromaDB entities (Analytics)
    ChromaDBModule.forFeature([
      CodeAchievementEntity,
      BrandStrategyEntity,
      ContentPerformanceEntity,
      DeveloperProfileEntity,
      BrandMentionEntity,
      TechTrendEntity,
      AudienceAnalysisEntity,
      CompetitorAnalysisEntity,
    ]),
  ],
  providers: [
    // Application-specific ChromaDB Repositories (Analytics)
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
    {
      provide: getChromaRepositoryToken(DeveloperProfileEntity),
      useClass: DeveloperProfileRepository,
    },
    {
      provide: getChromaRepositoryToken(BrandMentionEntity),
      useClass: BrandMentionRepository,
    },
    {
      provide: getChromaRepositoryToken(TechTrendEntity),
      useClass: TechTrendsRepository,
    },
    {
      provide: getChromaRepositoryToken(AudienceAnalysisEntity),
      useClass: AudienceRepository,
    },
    {
      provide: getChromaRepositoryToken(CompetitorAnalysisEntity),
      useClass: CompetitorAnalysisRepository,
    },

    // Application-specific Neo4j Repositories (Business Domain)
    {
      provide: getRepositoryToken(StoreItemEntity),
      useClass: StoreGraphRepository,
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
    // Application-specific ChromaDB Repositories (Analytics)
    getChromaRepositoryToken(CodeAchievementEntity),
    getChromaRepositoryToken(BrandStrategyEntity),
    getChromaRepositoryToken(ContentPerformanceEntity),
    getChromaRepositoryToken(DeveloperProfileEntity),
    getChromaRepositoryToken(BrandMentionEntity),
    getChromaRepositoryToken(TechTrendEntity),
    getChromaRepositoryToken(AudienceAnalysisEntity),
    getChromaRepositoryToken(CompetitorAnalysisEntity),

    // Application-specific Neo4j Repositories (Business Domain)
    getRepositoryToken(StoreItemEntity),
    getRepositoryToken(Developer),
    getRepositoryToken(Achievement),

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
