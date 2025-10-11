// Module
export { HitlModule } from './lib/hitl.module';

// Config utilities for decorator access
export * from './lib/utils/hitl-config.accessor';

// Services
export { HumanApprovalService } from './lib/services/human-approval.service';
export { ApprovalProcessingService } from './lib/services/approval-processing.service';
export { ApprovalTimeoutService } from './lib/services/approval-timeout.service';
export { ApprovalStreamingService } from './lib/services/approval-streaming.service';
export { UserInterruptionService } from './lib/services/user-interruption.service';
export { ConfidenceEvaluatorService } from './lib/services/confidence-evaluator.service';
export { ApprovalChainService } from './lib/services/approval-chain.service';
export { FeedbackProcessorService } from './lib/services/feedback-processor.service';
export { HitlNotificationService } from './lib/services/hitl-notification.service';
export type * from './lib/services/hitl-notification.service';
export { HitlTimeoutService } from './lib/services/hitl-timeout.service';

// Routing (moved from main library)
export { WorkflowRoutingService } from './lib/routing/workflow-routing.service';

// Nodes
export { HumanApprovalNode } from './lib/nodes/human-approval.node';

// Decorators
export * from './lib/decorators/approval.decorator';

// Constants
export * from './lib/constants';

// Interfaces
export type * from './lib/interfaces/hitl.interface';
export {
  IHitlStorageService,
  HitlStorageError,
  InvalidApprovalDataError,
} from './lib/interfaces/hitl-storage.interface';
export type { IApprovalChainStorageService } from './lib/interfaces/approval-chain-storage.interface';
export type { ApprovalChainStorageConfig } from './lib/interfaces/approval-chain-storage.interface';
export type {
  ApprovalStorageData,
  ApprovalStorageStatus,
  ApprovalStorageResponse,
  HitlStorageStats,
} from './lib/interfaces/hitl-storage.interface';
export {
  IUserInterruptionService,
  IUserInterruptionStorageService,
  InterruptionStatus,
  InterruptionType,
} from './lib/interfaces/user-interruption.interface';
export type {
  UserInterruption,
  InterruptionContext,
  UserInterruptionResponse,
} from './lib/interfaces/user-interruption.interface';

// Approval Chain Types
export type {
  ApprovalLevel,
  ApprovalRequest,
} from './lib/services/approval-chain.service';

// Confidence Storage Types
export type {
  IConfidenceStorageService,
  ConfidenceStorageOptions,
  MLTrainingSet,
  MLPredictionResult,
  ConfidenceOutcome,
  FeatureVector,
  ConfidenceAnalytics,
  PatternInsights,
  IConfidenceStorageFactory,
} from './lib/interfaces/confidence-storage.interface';

// Confidence Evaluator Types
export type {
  ApprovalPattern,
  ConfidenceFactor,
} from './lib/services/confidence-evaluator.service';

// Feedback Storage Types
export {
  IFeedbackStorageService,
  FeedbackType,
  InvalidFeedbackDataError,
  FeedbackStorageError,
} from './lib/interfaces/feedback-storage.interface';
export type {
  FeedbackEntry,
  ProcessingResult,
  FeedbackAnalytics,
} from './lib/interfaces/feedback-storage.interface';

// Approver Intelligence Types (Phase 1 P0-CRITICAL)
export type {
  ApproverProfile,
  ApproverExpertise,
  ApproverRanking,
} from './lib/interfaces/approver-intelligence.interface';
