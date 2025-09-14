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

export interface HitlModuleOptions {
  defaultTimeout?: number;
  confidenceThreshold?: number;
  enabled?: boolean;
  adapters?: {
    storage?: Type<IHitlStorageService> | IHitlStorageService;
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
