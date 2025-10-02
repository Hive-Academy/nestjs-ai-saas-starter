import { randomUUID } from 'crypto';
import { NodeIdBuilder } from './node-id';

/**
 * Centralized ID generation utilities for the langgraph ecosystem
 * Provides type-safe, collision-resistant ID generation with optional Node ID Standard compliance
 */

/**
 * Generate a secure, collision-resistant execution ID using UUID v4
 * This replaces the problematic Date.now() approach with proper UUID generation
 */
export function generateExecutionId(): string {
  return `exec_${randomUUID()}`;
}

/**
 * Generate a secure ID with a given prefix
 * @param prefix - The prefix for the ID (e.g., 'interrupt', 'approval', 'feedback')
 * @returns A collision-resistant ID with the specified prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/**
 * Generate a workflow-specific execution ID using the Node ID Standard
 * Useful for structured identification in complex workflow scenarios
 */
export function generateStructuredExecutionId(options: {
  domain: string;
  phase?: string;
  activity?: string;
  detail?: string;
}): string {
  const { domain, phase = 'execute', activity = 'workflow', detail } = options;

  try {
    const builder = NodeIdBuilder.create()
      .domain(domain)
      .phase(phase)
      .activity(activity);

    if (detail) {
      builder.detail(detail);
    }

    const canonicalId = builder.build();
    const uuid = randomUUID().slice(0, 8); // Short UUID suffix for uniqueness

    return `exec_${canonicalId}_${uuid}`;
  } catch (error) {
    // Fallback to simple UUID if Node ID construction fails
    console.warn(
      'Failed to generate structured execution ID, falling back to UUID:',
      error
    );
    return generateExecutionId();
  }
}

/**
 * Generate a checkpoint ID with optional structured naming
 */
export function generateCheckpointId(
  executionId?: string,
  nodeId?: string
): string {
  const uuid = randomUUID();

  if (executionId && nodeId) {
    return `checkpoint_${executionId}_${nodeId}_${uuid.slice(0, 8)}`;
  }

  return `checkpoint_${uuid}`;
}

/**
 * Generate a thread ID for LangGraph workflows
 */
export function generateThreadId(domain?: string): string {
  const uuid = randomUUID();

  if (domain) {
    return `thread_${domain}_${uuid.slice(0, 12)}`;
  }

  return `thread_${uuid}`;
}

/**
 * Generate a branch ID for time-travel operations
 */
export function generateBranchId(parentThreadId?: string): string {
  const uuid = randomUUID();

  if (parentThreadId) {
    const shortParent = parentThreadId.slice(-8);
    return `branch_${shortParent}_${uuid.slice(0, 8)}`;
  }

  return `branch_${uuid}`;
}

/**
 * Validate that an ID follows expected patterns
 */
export function validateId(id: string, expectedPrefix?: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  if (expectedPrefix && !id.startsWith(expectedPrefix)) {
    return false;
  }

  // Basic UUID pattern validation (loose check for various formats)
  const hasUuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{8,}/.test(
      id
    );

  return hasUuidPattern;
}

/**
 * Extract metadata from structured IDs
 */
export function parseStructuredId(id: string): {
  type?: string;
  domain?: string;
  uuid?: string;
  isStructured: boolean;
} {
  const parts = id.split('_');

  if (parts.length < 2) {
    return { isStructured: false };
  }

  const [type, ...rest] = parts;
  const uuid = rest[rest.length - 1];

  // Check if this follows the structured execution ID pattern
  if (type === 'exec' && rest.length >= 2) {
    const possibleNodeId = rest.slice(0, -1).join('_');

    // Try to parse as Node ID Standard format (domain|phase:activity)
    if (possibleNodeId.includes('|') && possibleNodeId.includes(':')) {
      const [domain] = possibleNodeId.split('|');
      return {
        type,
        domain,
        uuid,
        isStructured: true,
      };
    }
  }

  return {
    type,
    uuid,
    isStructured: false,
  };
}
