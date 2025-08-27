import { Module, DynamicModule } from '@nestjs/common';
import { HumanApprovalService } from './services/human-approval.service';
import { ConfidenceEvaluatorService } from './services/confidence-evaluator.service';
import { ApprovalChainService } from './services/approval-chain.service';
import { FeedbackProcessorService } from './services/feedback-processor.service';

export interface HitlModuleOptions {
  // Module configuration options
  defaultTimeout?: number;
  confidenceThreshold?: number;
}

@Module({})
export class HitlModule {
  static forRoot(options?: HitlModuleOptions): DynamicModule {
    return {
      module: HitlModule,
      providers: [
        HumanApprovalService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
        {
          provide: 'HITL_OPTIONS',
          useValue: options || {},
        },
      ],
      exports: [
        HumanApprovalService,
        ConfidenceEvaluatorService,
        ApprovalChainService,
        FeedbackProcessorService,
      ],
    };
  }
}
