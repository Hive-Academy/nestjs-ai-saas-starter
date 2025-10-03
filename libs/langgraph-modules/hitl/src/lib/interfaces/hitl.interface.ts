export interface HitlConfig {
  enabled?: boolean;
  timeout?: number;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  nodeId: string;
  data: unknown;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  feedback?: string;
  approvedBy?: string;
  approvedAt: Date;
}

export interface ConfidenceThreshold {
  low: number;
  medium: number;
  high: number;
}

import type { Type } from '@nestjs/common';
import type { IHitlStorageService } from './hitl-storage.interface';
import type { IUserInterruptionStorageService } from './user-interruption.interface';
import type { IApprovalChainStorageService } from './approval-chain-storage.interface';
import type { IFeedbackStorageService } from './feedback-storage.interface';
import type { IConfidenceStorageService } from './confidence-storage.interface';
import type {
  ICheckpointAdapter,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';

export interface HitlModuleOptions {
  defaultTimeout?: number;
  confidenceThreshold?: number;
  enabled?: boolean;
  checkpointAdapter?: ICheckpointAdapter;
  memoryAdapter?: IMemoryAdapter;
  adapters?: {
    storage?: Type<IHitlStorageService> | IHitlStorageService;
    interruptionStorage?:
      | Type<IUserInterruptionStorageService>
      | IUserInterruptionStorageService;
    approvalChainStorage?:
      | Type<IApprovalChainStorageService>
      | IApprovalChainStorageService;
    feedbackStorage?: Type<IFeedbackStorageService> | IFeedbackStorageService;
    confidenceStorage?:
      | Type<IConfidenceStorageService>
      | IConfidenceStorageService;
  };
}

export interface HitlModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory?: (
    ...args: any[]
  ) => Promise<HitlModuleOptions> | HitlModuleOptions;
  useClass?: Type<HitlOptionsFactory>;
  useExisting?: Type<HitlOptionsFactory>;
}

export interface HitlOptionsFactory {
  createHitlOptions(): Promise<HitlModuleOptions> | HitlModuleOptions;
}
