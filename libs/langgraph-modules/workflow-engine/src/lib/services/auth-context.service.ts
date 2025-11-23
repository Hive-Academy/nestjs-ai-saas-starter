import { Injectable } from '@nestjs/common';
import { RunnableConfig } from '@langchain/core/runnables';
import { IdGenerator } from '../utils/id-generator';

/**
 * User context interface matching the JWT payload
 */
export interface UserContext {
  userId: string;
  tenantId: string;
  roles: string[];
  tier: 'free' | 'pro' | 'enterprise';
  permissions?: string[];
  email?: string;
  organizationId?: string;
}

/**
 * Service to manage authentication context in LangGraph workflows
 *
 * Handles:
 * 1. Injecting user context into RunnableConfig
 * 2. Extracting user context from RunnableConfig
 * 3. Generating user-scoped thread IDs
 */
@Injectable()
export class WorkflowAuthContextService {
  /**
   * Enriches a RunnableConfig with user context
   * This is the authoritative way to pass user info to workflows
   */
  enrichConfig(config: RunnableConfig, user: UserContext): RunnableConfig {
    return {
      ...config,
      configurable: {
        ...config.configurable,
        user: {
          userId: user.userId,
          tenantId: user.tenantId,
          roles: user.roles,
          tier: user.tier,
          permissions: user.permissions,
          email: user.email,
          organizationId: user.organizationId,
        },
      },
    };
  }

  /**
   * Creates a new RunnableConfig with user context
   */
  createUserConfig(
    user: UserContext,
    metadata: Record<string, any> = {}
  ): RunnableConfig {
    return {
      configurable: {
        user: {
          userId: user.userId,
          tenantId: user.tenantId,
          roles: user.roles,
          tier: user.tier,
          permissions: user.permissions,
          email: user.email,
          organizationId: user.organizationId,
        },
        ...metadata,
      },
    };
  }

  /**
   * Extracts user context from a RunnableConfig
   * Used by Nodes and Tasks to verify identity and permissions
   */
  static extractUserContext(config?: RunnableConfig): UserContext | undefined {
    return config?.configurable?.user;
  }

  /**
   * Generates a secure, scoped thread ID for a user workflow
   */
  createThreadId(
    tenantId: string,
    userId: string,
    workflowType: string
  ): string {
    return IdGenerator.generateThreadId(tenantId, userId, workflowType);
  }

  /**
   * Parses a thread ID to verify ownership
   * @returns Metadata if valid, null if invalid format
   */
  parseThreadId(
    threadId: string
  ): { tenantId: string; userId: string; type: string } | null {
    const parts = threadId.split('::');
    if (parts.length < 4) return null;

    // Format: {tenantId}::{userId}::{type}::{randomId}
    // Using '::' separator to safely handle underscores in tenant/user IDs
    return {
      tenantId: parts[0],
      userId: parts[1],
      type: parts[2],
    };
  }
}
