import { Injectable, Logger } from '@nestjs/common';

/**
 * Approval History Search Service - SOLID Compliance
 *
 * Provides helper utilities for analyzing historical approval patterns.
 *
 * **Responsibility**: Approval pattern analysis utilities
 * **Pattern**: Utility service for approval data analysis
 * **Storage**: Historical data retrieved from Neo4j via storage adapters
 *
 * Note: Historical approval data is stored in Neo4j graph database.
 * Query capabilities are provided through Neo4j storage adapters.
 *
 * Verification:
 * - Pattern source: Phase 1a success pattern
 * - Storage: Neo4j primary operational storage
 */
@Injectable()
export class ApprovalHistorySearchService {
  private readonly logger = new Logger(ApprovalHistorySearchService.name);

  constructor() {
    this.logger.log('ApprovalHistorySearchService initialized');
  }

  /**
   * Build semantic query string from approval request context
   *
   * Utility method for building search queries from approval context.
   * Can be used by storage adapters for Neo4j Cypher query construction.
   *
   * @param context - Approval request context
   * @returns Semantic query components for database search
   */
  buildSearchQuery(context: ApprovalRequestContext): {
    action: string;
    resourceType: string;
    riskLevel: string;
    keywords: string[];
  } {
    const keywords: string[] = [];

    // Extract metadata keywords if available
    if (context.metadata) {
      keywords.push(...this.extractMetadataKeywords(context.metadata));
    }

    return {
      action: context.action,
      resourceType: context.resourceType,
      riskLevel: context.riskLevel,
      keywords,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Extract searchable keywords from metadata
   *
   * @param metadata - Approval request metadata
   * @returns Array of keyword strings
   */
  private extractMetadataKeywords(metadata: Record<string, any>): string[] {
    const keywords: string[] = [];

    // Extract common metadata fields that provide context
    const relevantFields = [
      'category',
      'department',
      'priority',
      'environment',
      'severity',
    ];

    for (const field of relevantFields) {
      if (metadata[field]) {
        keywords.push(String(metadata[field]));
      }
    }

    return keywords;
  }
}

// ============================================================================
// TYPE DEFINITIONS - Approval History Search Types
// ============================================================================

/**
 * Context for approval request used in search query building
 */
export interface ApprovalRequestContext {
  action: string;
  resourceType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  metadata?: Record<string, any>;
}
