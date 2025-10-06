import { Injectable, Logger } from '@nestjs/common';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';

/**
 * Workflow Canonical ID Service
 * Generates canonical IDs following NODE_ID_STANDARD for workflow instances
 */
@Injectable()
export class WorkflowCanonicalIdService {
  private readonly logger = new Logger(WorkflowCanonicalIdService.name);

  /**
   * Generate canonical instance ID following NODE_ID_STANDARD.md
   * Pattern: <domain>|<phase>:<activity>[:<detail>]
   */
  generateInstanceId(workflowId: string, input: any): string {
    try {
      // Determine domain from workflow ID or input context
      const domain = this.extractDomain(workflowId, input);

      // Determine phase based on workflow type and input
      const phase = this.inferPhase(workflowId, input);

      // Activity is the primary workflow action
      const activity = this.extractActivity(workflowId);

      // Detail includes timestamp for uniqueness and optionally priority/tier
      const detail = this.generateDetail(input);

      return NodeIdBuilder.create()
        .domain(domain)
        .phase(phase)
        .activity(activity)
        .detail(detail)
        .build();
    } catch (error) {
      this.logger.warn(
        `Failed to generate canonical ID, falling back to simple format: ${
          (error as Error).message
        }`
      );
      // Fallback to simpler canonical pattern
      return `workflow|execute:${workflowId
        .replace(/[^a-z0-9-]/gi, '-')
        .toLowerCase()}:${Date.now()}`;
    }
  }

  /**
   * Generate checkpoint namespace for workflow
   */
  generateCheckpointNamespace(workflowId: string): string {
    // Use workflow domain as namespace for logical grouping
    const domain = this.extractDomain(workflowId, {});
    return `${domain}-checkpoints`;
  }

  /**
   * Extract domain from workflow context
   */
  private extractDomain(workflowId: string, input: any): string {
    // Check input metadata for domain hints
    if (input?.metadata?.domain) {
      return String(input.metadata.domain).toLowerCase();
    }

    // Extract domain from workflow ID patterns
    if (workflowId.includes('customer-support')) return 'support';
    if (workflowId.includes('content-creation')) return 'content';
    if (workflowId.includes('enhanced-support')) return 'support';
    if (workflowId.includes('research')) return 'research';
    if (workflowId.includes('analysis')) return 'analysis';
    if (workflowId.includes('processing')) return 'processing';

    // Default domain
    return 'workflow';
  }

  /**
   * Infer execution phase
   */
  private inferPhase(workflowId: string, input: any): string {
    // Check for explicit phase in input
    if (input?.metadata?.phase) {
      return String(input.metadata.phase).toLowerCase();
    }

    // Infer from workflow characteristics
    if (workflowId.includes('orchestration')) return 'orchestrate';
    if (workflowId.includes('pipeline')) return 'pipeline';
    if (workflowId.includes('enhanced')) return 'coordinate';

    // Default to execution phase
    return 'execute';
  }

  /**
   * Extract primary activity from workflow ID
   */
  private extractActivity(workflowId: string): string {
    // Clean and normalize workflow ID to activity
    return workflowId
      .replace(/-workflow$/, '') // Remove common suffix
      .replace(/enhanced-/, '') // Remove prefixes
      .replace(/[^a-z0-9-]/gi, '-') // Normalize chars
      .toLowerCase()
      .substring(0, 20); // Reasonable length limit
  }

  /**
   * Generate detail segment with uniqueness and context
   */
  private generateDetail(input: any): string {
    const timestamp = Date.now();
    const parts = [timestamp.toString()];

    // Add priority if available
    if (input?.priority) {
      parts.unshift(String(input.priority).toLowerCase());
    }

    // Add customer tier if available (for support workflows)
    if (input?.customerTier) {
      parts.unshift(String(input.customerTier).toLowerCase());
    }

    // Add ticket priority if available
    if (input?.ticket?.priority) {
      parts.unshift(String(input.ticket.priority).toLowerCase());
    }

    return parts.join('-');
  }

  /**
   * Parse canonical ID back into components
   */
  parseCanonicalId(canonicalId: string): {
    domain: string;
    phase: string;
    activity: string;
    detail: string;
  } | null {
    try {
      const parts = canonicalId.split('|');
      if (parts.length !== 2) return null;

      const [domain, rest] = parts;
      const [phaseActivity, ...detailParts] = rest.split(':');

      if (!phaseActivity) return null;

      // Phase is the first part before the activity
      const phase = phaseActivity;
      const activity = detailParts[0] || '';
      const detail = detailParts.slice(1).join(':');

      return {
        domain,
        phase,
        activity,
        detail,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse canonical ID: ${canonicalId}`);
      return null;
    }
  }

  /**
   * Validate if an ID follows canonical format
   */
  isCanonicalId(id: string): boolean {
    // Basic pattern: domain|phase:activity[:detail]
    const pattern = /^[a-z]+\|[a-z]+:[a-z0-9-]+(:[a-z0-9-]+)*$/;
    return pattern.test(id);
  }
}
