// Module
export { HitlModule } from './lib/hitl.module';

// Config utilities for decorator access
export * from './lib/utils/hitl-config.accessor';

// Services
export { HumanApprovalService } from './lib/services/human-approval.service';
export { ConfidenceEvaluatorService } from './lib/services/confidence-evaluator.service';
export { ApprovalChainService } from './lib/services/approval-chain.service';
export { FeedbackProcessorService } from './lib/services/feedback-processor.service';

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
