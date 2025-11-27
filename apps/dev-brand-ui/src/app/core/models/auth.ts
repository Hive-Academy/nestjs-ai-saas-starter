/**
 * User authentication model
 * Matches backend UserContext from WorkflowAuthContextService
 */
export interface User {
  /** User unique identifier */
  userId: string;

  /** Tenant/organization identifier */
  tenantId: string;

  /** User email address */
  email: string;

  /** User roles (e.g., 'admin', 'user', 'viewer') */
  roles: string[];

  /** Subscription tier */
  tier: UserTier;

  /** Fine-grained permissions */
  permissions?: string[];
}

/**
 * Subscription tier enum
 */
export type UserTier = 'free' | 'pro' | 'enterprise';

/**
 * Auth state configuration for routes
 */
export interface AuthConfig {
  /** Require authentication */
  required?: boolean;

  /** Required roles (OR logic) */
  roles?: string[];

  /** Required tier (minimum tier) */
  tier?: UserTier;

  /** Required permissions (AND logic) */
  permissions?: string[];
}

/**
 * SSE ticket response from backend
 */
export interface SseTicketResponse {
  /** Short-lived ticket (30s TTL) */
  ticket: string;
}

/**
 * Auth error types
 */
export type AuthErrorType =
  | 'UNAUTHENTICATED'
  | 'INSUFFICIENT_ROLE'
  | 'INSUFFICIENT_TIER'
  | 'INSUFFICIENT_PERMISSION';
