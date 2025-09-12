# HITL Module - User Manual

## Overview

The **@hive-academy/langgraph-hitl** (Human-In-The-Loop) module provides sophisticated human oversight and approval workflows for LangGraph AI systems, enabling safe deployment of AI agents with human governance, risk assessment, confidence evaluation, and multi-level approval chains.

**Key Features:**

- **Smart Approval Workflows** - Conditional approvals based on confidence thresholds and risk assessment
- **Multi-Level Approval Chains** - Hierarchical approval routing with escalation strategies
- **Risk Assessment Engine** - Automatic risk evaluation with configurable factors and scoring
- **Confidence Evaluation** - AI confidence scoring to determine when human approval is needed
- **Timeout & Fallback Handling** - Robust timeout management with configurable fallback strategies
- **Feedback Processing** - Human feedback integration to improve AI decision-making

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-hitl
```

```typescript
import { Module } from '@nestjs/common';
import { HitlModule } from '@hive-academy/langgraph-hitl';

@Module({
  imports: [
    HitlModule.forRoot({
      enabled: true,
      defaultTimeout: 300000, // 5 minutes
      confidenceThreshold: 0.8,
      riskAssessment: {
        enabled: true,
        defaultThreshold: 'medium',
      },
      approvalChains: {
        default: {
          levels: [
            { role: 'supervisor', required: 1 },
            { role: 'manager', required: 1, escalationOnly: true },
          ],
          timeoutStrategy: 'escalate',
        },
      },
      notifications: {
        channels: ['email', 'slack'],
        urgentChannels: ['sms', 'slack'],
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### HumanApprovalService - Primary Interface

**Central orchestrator** for all human approval operations:

```typescript
// Request approval for workflow actions
requestApproval(executionId: string, request: HumanApprovalRequest): Promise<string>

// Process human response to approval request
processApprovalResponse(requestId: string, response: HumanApprovalResponse): Promise<void>

// Check approval status
getApprovalStatus(requestId: string): Promise<ApprovalWorkflowState>

// Cancel pending approval
cancelApproval(requestId: string, reason?: string): Promise<void>

// Get pending approvals for user
getPendingApprovals(userId: string): Promise<HumanApprovalRequest[]>
```

### Decorators - METHOD-LEVEL Usage

**@RequiresApproval** decorator for marking methods that need human oversight:

```typescript
// Basic usage - requires approval when confidence is low
@RequiresApproval({ confidenceThreshold: 0.7 })
async processPayment(state: WorkflowState): Promise<WorkflowState>

// Advanced usage - conditional approval with risk assessment
@RequiresApproval({
  when: (state) => state.amount > 10000,
  riskThreshold: ApprovalRiskLevel.HIGH,
  chainId: 'financial-approval',
  timeoutMs: 600000,
  onTimeout: 'escalate'
})
async processLargeTransaction(state: WorkflowState): Promise<WorkflowState>
```

### Complete Production Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { HumanApprovalService, RequiresApproval, ApprovalRiskLevel, EscalationStrategy } from '@hive-academy/langgraph-hitl';

interface CodeGenerationTask {
  prompt: string;
  fileCount: number;
  complexity: 'low' | 'medium' | 'high';
  affectedSystems: string[];
  estimatedImpact: number;
}

interface DeploymentContext {
  environment: 'development' | 'staging' | 'production';
  affectedServices: string[];
  rollbackPlan: boolean;
  impactAssessment: string;
}

@Injectable()
export class EnterpriseAIWorkflowService {
  constructor(private readonly approvalService: HumanApprovalService) {}

  @RequiresApproval({
    when: (state) => {
      const task = state.task as CodeGenerationTask;
      return task.complexity === 'high' || task.fileCount > 10 || task.estimatedImpact > 7;
    },
    confidenceThreshold: 0.85,
    riskThreshold: ApprovalRiskLevel.MEDIUM,
    message: (state) => {
      const task = state.task as CodeGenerationTask;
      return `Code generation request: ${task.fileCount} files, ${task.complexity} complexity`;
    },
    metadata: (state) => ({
      taskType: 'code_generation',
      complexity: (state.task as CodeGenerationTask).complexity,
      estimatedTime: this.estimateCodeGenerationTime(state.task as CodeGenerationTask),
    }),
    timeoutMs: 1800000, // 30 minutes
    onTimeout: 'escalate',
    chainId: 'engineering-approval',
    riskAssessment: {
      enabled: true,
      factors: ['complexity', 'fileCount', 'systemImpact'],
      evaluator: (state) => {
        const task = state.task as CodeGenerationTask;
        const riskScore = this.calculateCodeRisk(task);
        return {
          level: riskScore > 8 ? ApprovalRiskLevel.HIGH : riskScore > 5 ? ApprovalRiskLevel.MEDIUM : ApprovalRiskLevel.LOW,
          factors: ['Code complexity', 'File modifications', 'System dependencies'],
          score: riskScore,
        };
      },
    },
    skipConditions: {
      highConfidence: 0.95,
      userRole: ['senior-engineer', 'architect'],
      custom: (state) => {
        // Skip for low-risk internal tool modifications
        const task = state.task as CodeGenerationTask;
        return task.affectedSystems.every((sys) => sys.startsWith('internal-'));
      },
    },
  })
  async generateCode(state: WorkflowState): Promise<WorkflowState> {
    const task = state.task as CodeGenerationTask;

    try {
      // Simulate code generation
      const generatedCode = await this.performCodeGeneration(task);

      return {
        ...state,
        generatedCode,
        status: 'code_generated',
        confidence: this.calculateConfidence(task, generatedCode),
        metadata: {
          ...state.metadata,
          filesGenerated: generatedCode.files.length,
          linesOfCode: generatedCode.totalLines,
          testsIncluded: generatedCode.hasTests,
        },
      };
    } catch (error) {
      return {
        ...state,
        status: 'error',
        error: error.message,
        requiresManualReview: true,
      };
    }
  }

  @RequiresApproval({
    when: (state) => {
      const context = state.deployment as DeploymentContext;
      return context.environment === 'production' || !context.rollbackPlan;
    },
    confidenceThreshold: 0.9,
    riskThreshold: ApprovalRiskLevel.HIGH,
    message: (state) => {
      const context = state.deployment as DeploymentContext;
      return `Production deployment: ${context.affectedServices.length} services affected`;
    },
    timeoutMs: 900000, // 15 minutes for production deployments
    onTimeout: 'reject', // Don't auto-deploy production on timeout
    chainId: 'production-deployment',
    escalationStrategy: EscalationStrategy.CHAIN,
    riskAssessment: {
      enabled: true,
      factors: ['environment', 'serviceCount', 'rollbackPlan', 'offHours'],
      evaluator: (state) => {
        const context = state.deployment as DeploymentContext;
        const riskFactors = [];
        let riskScore = 0;

        if (context.environment === 'production') {
          riskScore += 5;
          riskFactors.push('Production environment');
        }

        if (context.affectedServices.length > 3) {
          riskScore += 3;
          riskFactors.push('Multiple services affected');
        }

        if (!context.rollbackPlan) {
          riskScore += 4;
          riskFactors.push('No rollback plan');
        }

        const isOffHours = new Date().getHours() > 18 || new Date().getHours() < 8;
        if (isOffHours && context.environment === 'production') {
          riskScore += 2;
          riskFactors.push('Off-hours deployment');
        }

        return {
          level: riskScore > 8 ? ApprovalRiskLevel.CRITICAL : riskScore > 5 ? ApprovalRiskLevel.HIGH : riskScore > 2 ? ApprovalRiskLevel.MEDIUM : ApprovalRiskLevel.LOW,
          factors: riskFactors,
          score: riskScore,
        };
      },
    },
    handlers: {
      beforeApproval: async (state) => {
        // Pre-deployment validation
        await this.validateDeploymentReadiness(state.deployment as DeploymentContext);
      },
      afterApproval: async (state, response) => {
        // Log approval for audit
        await this.logDeploymentApproval(state, response);
      },
      onRejection: async (state, response) => {
        // Handle deployment rejection
        await this.handleDeploymentRejection(state, response);
      },
    },
  })
  async deployToProduction(state: WorkflowState): Promise<WorkflowState> {
    const context = state.deployment as DeploymentContext;

    try {
      // Execute deployment
      const deploymentResult = await this.executeDeployment(context);

      return {
        ...state,
        deployment: {
          ...context,
          result: deploymentResult,
          status: 'deployed',
          deployedAt: new Date(),
        },
        confidence: 1.0, // Deployment completed successfully
      };
    } catch (error) {
      // Handle deployment failure
      await this.initiateRollback(context);

      return {
        ...state,
        status: 'deployment_failed',
        error: error.message,
        rollbackInitiated: true,
      };
    }
  }

  async handleApprovalRequest(requestId: string): Promise<void> {
    // Get approval request details
    const request = await this.approvalService.getApprovalRequest(requestId);

    // Send notifications based on urgency
    if (request.riskAssessment?.level === ApprovalRiskLevel.CRITICAL) {
      await this.sendUrgentNotification(request);
    } else {
      await this.sendStandardNotification(request);
    }
  }

  async processManualApproval(requestId: string, decision: 'approved' | 'rejected', userId: string, feedback?: string): Promise<void> {
    const response: HumanApprovalResponse = {
      requestId,
      decision,
      feedback,
      approvedBy: userId,
      approvedAt: new Date(),
      metadata: {
        reviewTime: this.calculateReviewTime(requestId),
        reviewerRole: await this.getUserRole(userId),
      },
    };

    await this.approvalService.processApprovalResponse(requestId, response);
  }

  private estimateCodeGenerationTime(task: CodeGenerationTask): number {
    return task.fileCount * 5 + (task.complexity === 'high' ? 30 : 10);
  }

  private calculateCodeRisk(task: CodeGenerationTask): number {
    let risk = 0;
    risk += task.fileCount > 20 ? 4 : task.fileCount > 10 ? 2 : 0;
    risk += task.complexity === 'high' ? 4 : task.complexity === 'medium' ? 2 : 0;
    risk += task.affectedSystems.length > 3 ? 3 : 0;
    risk += task.estimatedImpact;
    return risk;
  }

  private async performCodeGeneration(task: CodeGenerationTask): Promise<any> {
    // Simulate code generation process
    return {
      files: Array(task.fileCount)
        .fill(null)
        .map((_, i) => `file_${i}.ts`),
      totalLines: task.fileCount * 50,
      hasTests: task.complexity !== 'low',
    };
  }

  private calculateConfidence(task: CodeGenerationTask, result: any): number {
    let confidence = 0.8;
    if (task.complexity === 'low') confidence += 0.1;
    if (result.hasTests) confidence += 0.1;
    return Math.min(confidence, 1.0);
  }

  private async validateDeploymentReadiness(context: DeploymentContext): Promise<void> {
    if (!context.rollbackPlan) {
      throw new Error('Rollback plan required for production deployment');
    }
    // Additional validation logic
  }

  private async executeDeployment(context: DeploymentContext): Promise<any> {
    // Simulate deployment process
    return { deploymentId: `deploy_${Date.now()}`, version: '1.2.3' };
  }

  private async initiateRollback(context: DeploymentContext): Promise<void> {
    console.log('Initiating rollback for deployment:', context);
  }
}
```

## Configuration

### Basic Configuration

```typescript
HitlModule.forRoot({
  enabled: true,
  defaultTimeout: 300000,
  confidenceThreshold: 0.8,
  approvalChains: {
    default: {
      levels: [{ role: 'supervisor', required: 1 }],
    },
  },
});
```

### Production Configuration

```typescript
HitlModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    enabled: configService.get('HITL_ENABLED', true),
    defaultTimeout: configService.get('HITL_DEFAULT_TIMEOUT', 300000),
    confidenceThreshold: configService.get('HITL_CONFIDENCE_THRESHOLD', 0.8),
    riskAssessment: {
      enabled: configService.get('RISK_ASSESSMENT_ENABLED', true),
      defaultThreshold: configService.get('RISK_THRESHOLD', 'medium') as ApprovalRiskLevel,
      factors: {
        complexity: { weight: 0.3, enabled: true },
        impact: { weight: 0.4, enabled: true },
        environment: { weight: 0.3, enabled: true },
      },
    },
    approvalChains: {
      default: {
        id: 'default',
        name: 'Standard Approval',
        levels: [
          { role: 'team-lead', required: 1, timeoutMs: 600000 },
          { role: 'manager', required: 1, escalationOnly: true, timeoutMs: 1200000 },
        ],
        timeoutStrategy: 'escalate',
      },
      'high-risk': {
        id: 'high-risk',
        name: 'High Risk Approval',
        levels: [
          { role: 'senior-engineer', required: 2, timeoutMs: 900000 },
          { role: 'architect', required: 1, timeoutMs: 1800000 },
          { role: 'director', required: 1, escalationOnly: true, timeoutMs: 3600000 },
        ],
        timeoutStrategy: 'reject',
      },
      financial: {
        id: 'financial',
        name: 'Financial Approval',
        levels: [
          { role: 'finance-manager', required: 1, timeoutMs: 1800000 },
          { role: 'cfo', required: 1, escalationOnly: true, timeoutMs: 3600000 },
        ],
        timeoutStrategy: 'escalate',
      },
    },
    notifications: {
      enabled: configService.get('HITL_NOTIFICATIONS_ENABLED', true),
      channels: {
        email: {
          enabled: true,
          config: { smtp: configService.get('SMTP_CONFIG') },
        },
        slack: {
          enabled: true,
          config: { webhook: configService.get('SLACK_WEBHOOK_URL') },
        },
        sms: {
          enabled: configService.get('SMS_NOTIFICATIONS_ENABLED', false),
          config: { provider: configService.get('SMS_PROVIDER') },
        },
      },
      urgentChannels: ['sms', 'slack'],
      escalationDelay: configService.get('ESCALATION_DELAY', 300000),
    },
    auditLogging: {
      enabled: configService.get('AUDIT_LOGGING_ENABLED', true),
      includeStateSnapshots: configService.get('INCLUDE_STATE_SNAPSHOTS', false),
      retention: configService.get('AUDIT_RETENTION_DAYS', 90),
    },
  }),
  inject: [ConfigService],
});
```

## Advanced Features

### Custom Risk Assessment

```typescript
@Injectable()
export class CustomRiskEvaluator {
  evaluateRisk(state: WorkflowState, context: any): RiskAssessment {
    const factors = [];
    let score = 0;

    // Business hours check
    const now = new Date();
    const isBusinessHours = now.getHours() >= 9 && now.getHours() <= 17;
    if (!isBusinessHours) {
      score += 2;
      factors.push('Off-hours operation');
    }

    // Data sensitivity check
    if (context.involvesPII || context.involvesFinancialData) {
      score += 4;
      factors.push('Sensitive data involved');
    }

    // System criticality
    if (context.criticalSystems?.length > 0) {
      score += 3;
      factors.push('Critical systems affected');
    }

    return {
      level: score > 7 ? ApprovalRiskLevel.CRITICAL : score > 4 ? ApprovalRiskLevel.HIGH : score > 2 ? ApprovalRiskLevel.MEDIUM : ApprovalRiskLevel.LOW,
      factors,
      score,
      details: { businessHours: isBusinessHours, systemsCritical: context.criticalSystems },
    };
  }
}
```

### Approval Chain Management

```typescript
@Injectable()
export class DynamicApprovalChainService {
  async createApprovalChain(config: ApprovalChainConfig): Promise<string> {
    const chain = {
      id: `chain_${Date.now()}`,
      name: config.name,
      levels: config.levels.map((level, index) => ({
        ...level,
        order: index,
        active: true,
      })),
      metadata: {
        createdAt: new Date(),
        createdBy: config.createdBy,
        purpose: config.purpose,
      },
    };

    await this.storeApprovalChain(chain);
    return chain.id;
  }

  async getApprovalChain(chainId: string): Promise<ApprovalChain> {
    return this.loadApprovalChain(chainId);
  }

  async updateApprovalChain(chainId: string, updates: Partial<ApprovalChainConfig>): Promise<void> {
    const chain = await this.loadApprovalChain(chainId);
    const updatedChain = { ...chain, ...updates, updatedAt: new Date() };
    await this.storeApprovalChain(updatedChain);
  }
}
```

## Core Interfaces

### HITL Types

```typescript
interface HumanApprovalRequest {
  id: string;
  executionId: string;
  nodeId: string;
  message: string;
  metadata: Record<string, unknown>;
  state: WorkflowState;
  options: RequiresApprovalOptions;
  workflowState: ApprovalWorkflowState;
  riskAssessment?: RiskAssessment;
  confidence: ConfidenceEvaluation;
  timestamps: ApprovalTimestamps;
}

interface RequiresApprovalOptions {
  when?: (state: WorkflowState) => boolean;
  confidenceThreshold?: number;
  riskThreshold?: ApprovalRiskLevel;
  message?: string | ((state: WorkflowState) => string);
  timeoutMs?: number;
  onTimeout?: 'approve' | 'reject' | 'escalate' | 'retry';
  chainId?: string;
  escalationStrategy?: EscalationStrategy;
  skipConditions?: SkipConditions;
  riskAssessment?: RiskAssessmentConfig;
}

enum ApprovalWorkflowState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  TIMEOUT = 'timeout',
}

enum ApprovalRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

## Error Handling

```typescript
import { HitlTimeoutError, ApprovalRejectedError } from '@hive-academy/langgraph-hitl';

@Injectable()
export class RobustHitlService {
  constructor(private readonly approvalService: HumanApprovalService) {}

  async safeRequestApproval(request: HumanApprovalRequest): Promise<string | null> {
    try {
      return await this.approvalService.requestApproval(request.executionId, request);
    } catch (error) {
      if (error instanceof HitlTimeoutError) {
        this.logger.warn('Approval request timed out:', error.message);
        return this.handleApprovalTimeout(request);
      } else if (error instanceof ApprovalRejectedError) {
        this.logger.info('Approval was rejected:', error.message);
        return this.handleApprovalRejection(request, error);
      }
      throw error;
    }
  }

  private async handleApprovalTimeout(request: HumanApprovalRequest): Promise<string | null> {
    // Implement fallback strategy based on configuration
    switch (request.options.onTimeout) {
      case 'approve':
        return 'auto-approved-timeout';
      case 'reject':
        return null;
      case 'escalate':
        return this.escalateApproval(request);
      default:
        return null;
    }
  }

  private async handleApprovalRejection(request: HumanApprovalRequest, error: ApprovalRejectedError): Promise<string | null> {
    // Log rejection for audit
    this.logger.info(`Approval rejected for ${request.executionId}: ${error.reason}`);

    // Implement retry logic if configured
    if (request.retry?.count < request.retry?.maxAttempts) {
      return this.retryApprovalRequest(request);
    }

    return null;
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { HitlModule, HumanApprovalService } from '@hive-academy/langgraph-hitl';

describe('HumanApprovalService', () => {
  let service: HumanApprovalService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        HitlModule.forRoot({
          enabled: true,
          defaultTimeout: 30000,
          confidenceThreshold: 0.8,
        }),
      ],
    }).compile();

    service = module.get<HumanApprovalService>(HumanApprovalService);
  });

  it('should create approval request', async () => {
    const request: HumanApprovalRequest = {
      id: 'test-request',
      executionId: 'exec-123',
      nodeId: 'test-node',
      message: 'Test approval',
      state: { test: true },
      // ... other required fields
    };

    const requestId = await service.requestApproval('exec-123', request);
    expect(requestId).toBeDefined();
  });

  it('should process approval response', async () => {
    const response: HumanApprovalResponse = {
      requestId: 'test-request',
      decision: 'approved',
      approvedBy: 'test-user',
      approvedAt: new Date(),
    };

    await expect(service.processApprovalResponse('test-request', response)).resolves.not.toThrow();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Approval Timeouts in Production

```typescript
// Solution: Configure appropriate timeouts and fallback strategies
const config = {
  defaultTimeout: 900000, // 15 minutes for production
  approvalChains: {
    production: {
      levels: [
        { role: 'engineer', required: 1, timeoutMs: 600000 },
        { role: 'manager', required: 1, timeoutMs: 1800000, escalationOnly: true },
      ],
      timeoutStrategy: 'escalate', // Don't auto-approve in production
    },
  },
};
```

#### 2. High Volume of Low-Value Approval Requests

```typescript
// Solution: Implement smart skip conditions and confidence thresholds
@RequiresApproval({
  confidenceThreshold: 0.85, // Higher threshold
  skipConditions: {
    highConfidence: 0.95,
    custom: (state) => {
      // Skip for routine operations
      return state.operationType === 'routine' && state.impact < 3;
    }
  },
  riskThreshold: ApprovalRiskLevel.MEDIUM // Only require approval for medium+ risk
})
```

#### 3. Approval Chain Bottlenecks

```typescript
// Solution: Implement parallel approvals and delegation
const chainConfig = {
  levels: [
    {
      role: ['senior-engineer', 'team-lead'], // Multiple roles can approve
      required: 1, // Only need one approval
      parallelApproval: true,
      delegation: {
        enabled: true,
        allowedRoles: ['engineer'],
      },
    },
  ],
};
```

This comprehensive HITL module provides sophisticated human oversight capabilities with intelligent approval routing, risk assessment, and robust fallback mechanisms for safe AI system deployment.
