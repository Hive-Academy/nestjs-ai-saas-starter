/**
 * Entity Barrel Export for dev-brand-api Application
 *
 * All Neo4j entities for the Personal Brand API application.
 * These entities are built using decorators from @hive-academy/nestjs-neo4j library.
 *
 * Usage:
 * import { ApprovalRequest, Developer, Achievement } from './entities';
 */

// HITL Core Entities (Phase 2A) - imported from shared adapters package
export {
  ApprovalRequest,
  ApprovalResponse,
  Memory,
  ConfidencePattern,
  FeedbackEntry,
  InterruptionPoint,
} from '@hive-academy/langgraph-adapters';

// Personal Brand Core Entities (Phase 2B) - local entities
export { Developer } from './developer.entity';
export { Achievement } from './achievement.entity';
export { Technology } from './technology.entity';
export { BrandStrategy } from './brand-strategy.entity';

// Supporting Entities (Phase 2C) - local entities
export { Strength } from './strength.entity';

/**
 * Entity Summary:
 *
 * Total: 11 entities
 *
 * HITL Workflow:
 * - ApprovalRequest: HITL approval requests with workflow context
 * - ApprovalResponse: Responses to approval requests with audit trail
 *
 * Personal Brand System:
 * - Developer: Developer profiles with skills and brand context
 * - Achievement: Code achievements with innovation metrics
 * - Technology: Technology nodes with proficiency tracking
 * - BrandStrategy: Personal brand positioning strategies
 * - Strength: Developer strengths and competencies tracking
 *
 * Supporting Systems:
 * - Memory: Graph-based contextual memory management
 * - ConfidencePattern: ML confidence patterns for approval prediction
 * - FeedbackEntry: User feedback for AI learning and improvement
 * - InterruptionPoint: Workflow interruption points with timeout handling
 */
