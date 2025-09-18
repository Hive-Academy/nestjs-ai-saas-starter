/** NodeId related shared types (migrated from streaming util) */
export type NodeIdErrorCode =
  | 'MISSING_DOMAIN'
  | 'MISSING_PHASE'
  | 'MISSING_ACTIVITY'
  | 'OVER_MAX_LENGTH'
  | 'INVALID_CHARACTERS'
  | 'IDEMPOTENCY_FAILURE';

export interface NodeIdParts {
  domain: string;
  phase: string;
  activity: string;
  detail?: string;
  original?: string; // raw original for diagnostics
}

export interface BuildNodeIdOptions {
  enforceMaxLength?: boolean; // default true
  maxLength?: number; // default 80
  strict?: boolean; // if true, throw on invalid vs silent normalize
}

export interface NodeIdValidationResult {
  valid: boolean;
  errors: { code: NodeIdErrorCode; message: string }[];
  normalized?: string;
  parts?: NodeIdParts;
}
