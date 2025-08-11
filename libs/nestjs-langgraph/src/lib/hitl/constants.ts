/**
 * Constants for Human-In-The-Loop (HITL) integration
 */

/**
 * Injection tokens for HITL services
 */
export const HUMAN_APPROVAL_SERVICE = Symbol('HUMAN_APPROVAL_SERVICE');
export const CONFIDENCE_EVALUATOR_SERVICE = Symbol('CONFIDENCE_EVALUATOR_SERVICE');
export const APPROVAL_CHAIN_SERVICE = Symbol('APPROVAL_CHAIN_SERVICE');
export const FEEDBACK_PROCESSOR_SERVICE = Symbol('FEEDBACK_PROCESSOR_SERVICE');

/**
 * Event names for HITL system
 */
export const HITL_EVENTS = {
  APPROVAL_REQUESTED: 'hitl.approval.requested',
  APPROVAL_COMPLETED: 'hitl.approval.completed',
  APPROVAL_TIMEOUT: 'hitl.approval.timeout',
  APPROVAL_ESCALATED: 'hitl.approval.escalated',
  FEEDBACK_SUBMITTED: 'hitl.feedback.submitted',
  FEEDBACK_PROCESSED: 'hitl.feedback.processed',
  CONFIDENCE_EVALUATED: 'hitl.confidence.evaluated',
  RISK_ASSESSED: 'hitl.risk.assessed',
} as const;

/**
 * Default configuration values
 */
export const HITL_DEFAULTS = {
  APPROVAL_TIMEOUT_MS: 3600000, // 1 hour
  CONFIDENCE_THRESHOLD: 0.7,
  HIGH_CONFIDENCE_AUTO_APPROVE: 0.95,
  MAX_ESCALATION_LEVELS: 3,
  FEEDBACK_RETENTION_MS: 86400000 * 7, // 7 days
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
} as const;

/**
 * Risk assessment weights for different factors
 */
export const RISK_WEIGHTS = {
  SECURITY: 0.3,
  DATA_IMPACT: 0.25,
  USER_IMPACT: 0.2,
  BUSINESS_IMPACT: 0.15,
  OPERATIONAL_IMPACT: 0.1,
} as const;

/**
 * Confidence boost/penalty factors
 */
export const CONFIDENCE_FACTORS = {
  HUMAN_APPROVAL: 0.1,
  HUMAN_REJECTION: -0.2,
  SUCCESSFUL_EXECUTION: 0.05,
  FAILED_EXECUTION: -0.15,
  TIMEOUT: -0.1,
  ESCALATION: -0.05,
} as const;