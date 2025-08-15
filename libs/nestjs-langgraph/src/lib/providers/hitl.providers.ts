import type { Provider } from '@nestjs/common';
import { HumanApprovalNode } from '../hitl/human-approval.node';
import { HumanApprovalService } from '../hitl/human-approval.service';
import { ConfidenceEvaluatorService } from '../hitl/confidence-evaluator.service';
import { FeedbackProcessorService } from '../hitl/feedback-processor.service';
import { ApprovalChainService } from '../hitl/approval-chain.service';
import { HITL_MANAGER } from '../constants';
import {
  HUMAN_APPROVAL_SERVICE,
  CONFIDENCE_EVALUATOR_SERVICE,
  APPROVAL_CHAIN_SERVICE,
  FEEDBACK_PROCESSOR_SERVICE,
} from '../hitl/constants';

/**
 * Human-in-the-loop (HITL) service providers for the LangGraph module
 */
export function createHITLProviders(): Provider[] {
  return [
    HumanApprovalNode,
    HumanApprovalService,
    ConfidenceEvaluatorService,
    FeedbackProcessorService,
    ApprovalChainService,
    {
      provide: HITL_MANAGER,
      useClass: HumanApprovalService,
    },
    {
      provide: HUMAN_APPROVAL_SERVICE,
      useClass: HumanApprovalService,
    },
    {
      provide: CONFIDENCE_EVALUATOR_SERVICE,
      useClass: ConfidenceEvaluatorService,
    },
    {
      provide: APPROVAL_CHAIN_SERVICE,
      useClass: ApprovalChainService,
    },
    {
      provide: FEEDBACK_PROCESSOR_SERVICE,
      useClass: FeedbackProcessorService,
    },
  ];
}

/**
 * HITL service exports for the LangGraph module
 */
export const HITL_EXPORTS = [
  HumanApprovalNode,
  HumanApprovalService,
  ConfidenceEvaluatorService,
  FeedbackProcessorService,
  ApprovalChainService,
];
