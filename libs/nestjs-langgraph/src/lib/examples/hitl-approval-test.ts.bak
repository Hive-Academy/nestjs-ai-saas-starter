import { Injectable, Logger } from '@nestjs/common';
import { Workflow, Node, Edge } from '../decorators';
import { RequiresApproval, ApprovalRiskLevel, EscalationStrategy } from '../decorators/approval.decorator';
import { StreamProgress, StreamEvent } from '../decorators/streaming.decorator';
import { StreamEventType } from '../constants';
import { WorkflowState, Command } from '../interfaces/workflow.interface';

/**
 * Extended workflow state for HITL testing
 */
interface HITLTestState extends WorkflowState {
  /** Test scenario being executed */
  scenario: 'low-risk' | 'medium-risk' | 'high-risk' | 'critical-risk' | 'custom';
  
  /** Deployment target environment */
  environment: 'development' | 'staging' | 'production';
  
  /** Code changes to deploy */
  codeChanges: {
    files: string[];
    linesAdded: number;
    linesRemoved: number;
    riskScore: number;
  };
  
  /** User impact assessment */
  userImpact: {
    affectedUsers: number;
    criticalFeatures: string[];
    downtime: number; // minutes
  };
  
  /** Approval history for this execution */
  approvalHistory: Array<{
    nodeId: string;
    approved: boolean;
    approver: string;
    timestamp: Date;
    confidence: number;
  }>;
  
  /** Test results */
  results?: {
    approvalPath: string[];
    totalApprovalTime: number;
    confidenceProgression: number[];
    riskAssessments: any[];
  };
}

/**
 * HITL Approval Test Workflow
 * 
 * Demonstrates comprehensive human approval capabilities including:
 * - Confidence-based approval routing
 * - Risk assessment integration
 * - Approval chains and escalation
 * - Real-time streaming of approval requests
 * - Multiple approval scenarios
 */
@Injectable()
@Workflow({
  name: 'hitl-approval-test',
  description: 'Test workflow for Human-In-The-Loop approval system',
  requiresHumanApproval: true,
  streaming: true,
  channels: {
    scenario: null,
    environment: null,
    codeChanges: null,
    userImpact: null,
    approvalHistory: null,
    results: null,
    // ... other WorkflowState fields
    executionId: null,
    status: null,
    currentNode: null,
    completedNodes: null,
    confidence: null,
    messages: null,
    error: null,
    humanFeedback: null,
    metadata: null,
    timestamps: null,
    retryCount: null,
    startedAt: null,
    completedAt: null,
    previousNode: null,
    nextNode: null,
    requiresApproval: null,
    approvalReceived: null,
    waitingForApproval: null,
    rejectionReason: null,
    lastError: null,
    risks: null
  }
})
export class HITLApprovalTestWorkflow {
  private readonly logger = new Logger(HITLApprovalTestWorkflow.name);

  /**
   * Initialize test scenario
   */
  @Node('start')
  @StreamProgress({ 
    enabled: true,
    granularity: 'coarse',
    milestones: [10, 50, 90, 100]
  })
  async initializeTest(state: HITLTestState): Promise<Partial<HITLTestState>> {
    this.logger.log(`Starting HITL approval test: scenario=${state.scenario}, environment=${state.environment}`);
    
    // Initialize approval history
    const approvalHistory = state.approvalHistory || [];
    
    // Set initial confidence based on scenario
    let initialConfidence: number;
    switch (state.scenario) {
      case 'low-risk':
        initialConfidence = 0.9;
        break;
      case 'medium-risk':
        initialConfidence = 0.7;
        break;
      case 'high-risk':
        initialConfidence = 0.4;
        break;
      case 'critical-risk':
        initialConfidence = 0.2;
        break;
      default:
        initialConfidence = 0.6;
    }
    
    return {
      confidence: initialConfidence,
      approvalHistory,
      metadata: {
        ...state.metadata,
        testStarted: new Date(),
        initialScenario: state.scenario,
        safeMode: state.environment === 'development'
      }
    };
  }

  /**
   * Low-risk operation - should auto-approve with high confidence
   */
  @Node('low_risk_operation')
  @RequiresApproval({
    confidenceThreshold: 0.8,
    riskThreshold: ApprovalRiskLevel.MEDIUM,
    message: (state) => `Deploy minor changes to ${state['environment']}: ${state['codeChanges']?.files?.length || 0} files`,
    skipConditions: {
      highConfidence: 0.9,
      userRole: ['developer', 'admin'],
      safeMode: true
    },
    timeoutMs: 300000, // 5 minutes
    onTimeout: 'approve'
  })
  @StreamEvent({ 
    events: [StreamEventType.NODE_START],
    filter: { includeDebug: false }
  })
  async performLowRiskOperation(state: HITLTestState): Promise<Partial<HITLTestState>> {
    this.logger.log(`Executing low-risk operation for execution ${state.executionId}`);
    
    // Record approval decision
    const approved = !state.waitingForApproval;
    this.recordApprovalDecision(state, 'low_risk_operation', approved, state.confidence);
    
    return {
      metadata: {
        ...state.metadata,
        lowRiskCompleted: true,
        operationResult: 'success'
      },
      confidence: Math.min(state.confidence + 0.05, 1.0) // Slight confidence boost for successful operation
    };
  }

  /**
   * Medium-risk operation - requires standard approval
   */
  @Node('medium_risk_operation')
  @RequiresApproval({
    confidenceThreshold: 0.7,
    riskThreshold: ApprovalRiskLevel.MEDIUM,
    chainId: 'development-approval-chain',
    message: (state) => {
      const users = state['userImpact']?.affectedUsers || 0;
      return `Deploy changes affecting ${users} users to ${state['environment']}`;
    },
    metadata: (state) => ({
      codeChanges: state['codeChanges'],
      userImpact: state['userImpact'],
      environment: state['environment']
    }),
    riskAssessment: {
      enabled: true,
      factors: ['user-impact', 'code-complexity', 'environment-risk']
    },
    timeoutMs: 1800000, // 30 minutes
    onTimeout: 'escalate',
    handlers: {
      beforeApproval: async (state) => {
        console.log(`Pre-approval check for medium-risk operation: confidence=${state.confidence}`);
      },
      afterApproval: async (state, approved) => {
        console.log(`Post-approval result: ${approved ? 'approved' : 'denied'}`);
      }
    }
  })
  @StreamEvent({ 
    events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE],
    filter: { includeDebug: false },
    transformer: (event: any) => ({ ...event, userImpact: event.state?.userImpact })
  })
  async performMediumRiskOperation(state: HITLTestState): Promise<Partial<HITLTestState>> {
    this.logger.log(`Executing medium-risk operation for execution ${state.executionId}`);
    
    // Simulate some processing time
    await this.delay(1000);
    
    const approved = !state.waitingForApproval;
    this.recordApprovalDecision(state, 'medium_risk_operation', approved, state.confidence);
    
    return {
      metadata: {
        ...state.metadata,
        mediumRiskCompleted: true,
        operationResult: approved ? 'success' : 'skipped'
      },
      confidence: approved ? Math.min(state.confidence + 0.02, 1.0) : Math.max(state.confidence - 0.1, 0.0)
    };
  }

  /**
   * High-risk operation - requires senior approval and escalation chain
   */
  @Node('high_risk_operation')
  @RequiresApproval({
    confidenceThreshold: 0.5,
    riskThreshold: ApprovalRiskLevel.HIGH,
    chainId: 'senior-approval-chain',
    escalationStrategy: EscalationStrategy.CHAIN,
    message: (state) => {
      const downtime = state['userImpact']?.downtime || 0;
      return `HIGH RISK: Production deployment with ${downtime}min potential downtime`;
    },
    metadata: (state) => ({
      riskLevel: 'HIGH',
      potentialDowntime: state['userImpact']?.downtime,
      criticalFeatures: state['userImpact']?.criticalFeatures,
      codeComplexity: state['codeChanges']?.riskScore
    }),
    riskAssessment: {
      enabled: true,
      factors: ['downtime-risk', 'critical-features', 'production-impact', 'code-complexity'],
      evaluator: (state) => {
        const downtime = state['userImpact']?.downtime || 0;
        const criticalFeatures = state['userImpact']?.criticalFeatures?.length || 0;
        
        let score = 0.6; // Base high risk
        if (downtime > 10) score += 0.2;
        if (criticalFeatures > 2) score += 0.15;
        if (state['environment'] === 'production') score += 0.1;
        
        return {
          level: score > 0.8 ? ApprovalRiskLevel.CRITICAL : ApprovalRiskLevel.HIGH,
          factors: ['high-downtime', 'critical-features', 'production-deployment'],
          score: Math.min(score, 1.0)
        };
      }
    },
    timeoutMs: 3600000, // 1 hour
    onTimeout: 'escalate',
    delegation: {
      enabled: true,
      maxLevels: 2,
      allowedRoles: ['senior-developer', 'team-lead', 'engineering-manager']
    }
  })
  @StreamEvent({ 
    events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE],
    filter: { includeDebug: false },
    transformer: (event: any) => ({ 
      ...event,
      riskLevel: 'HIGH',
      downtime: event.state?.userImpact?.downtime 
    })
  })
  async performHighRiskOperation(state: HITLTestState): Promise<Partial<HITLTestState>> {
    this.logger.log(`Executing high-risk operation for execution ${state.executionId}`);
    
    // Simulate complex processing
    await this.delay(2000);
    
    const approved = !state.waitingForApproval;
    this.recordApprovalDecision(state, 'high_risk_operation', approved, state.confidence);
    
    return {
      metadata: {
        ...state.metadata,
        highRiskCompleted: true,
        operationResult: approved ? 'success' : 'cancelled',
        riskMitigated: approved
      },
      confidence: approved ? Math.min(state.confidence + 0.1, 1.0) : Math.max(state.confidence - 0.2, 0.0)
    };
  }

  /**
   * Critical operation - requires executive approval
   */
  @Node('critical_operation')
  @RequiresApproval({
    confidenceThreshold: 0.3,
    riskThreshold: ApprovalRiskLevel.CRITICAL,
    chainId: 'executive-approval-chain',
    escalationStrategy: EscalationStrategy.CHAIN,
    message: (state) => {
      const users = state['userImpact']?.affectedUsers || 0;
      return `CRITICAL: Major production change affecting ${users} users - Executive approval required`;
    },
    metadata: (state) => ({
      riskLevel: 'CRITICAL',
      executiveApprovalRequired: true,
      businessImpact: 'HIGH',
      userImpact: state['userImpact'],
      rollbackPlan: 'Automated rollback available',
      emergencyContacts: ['cto@company.com', 'vp-eng@company.com']
    }),
    riskAssessment: {
      enabled: true,
      factors: ['business-impact', 'user-disruption', 'revenue-risk', 'compliance-risk']
    },
    timeoutMs: 7200000, // 2 hours
    onTimeout: 'reject', // Critical operations should not auto-approve
    delegation: {
      enabled: false // No delegation for critical operations
    },
    handlers: {
      beforeApproval: async (state) => {
        console.log(`CRITICAL OPERATION ALERT: Executive approval required for ${state.executionId}`);
        // In production, this would send alerts to executives
      },
      afterApproval: async (state, approved) => {
        console.log(`CRITICAL OPERATION ${approved ? 'APPROVED' : 'DENIED'} by executive`);
        // In production, this would log to audit systems
      }
    }
  })
  @StreamEvent({ 
    events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE],
    filter: { includeDebug: false },
    transformer: (event: any) => ({ 
      ...event,
      riskLevel: 'CRITICAL',
      affectedUsers: event.state?.userImpact?.affectedUsers,
      executiveApproval: true
    })
  })
  async performCriticalOperation(state: HITLTestState): Promise<Partial<HITLTestState>> {
    this.logger.log(`Executing critical operation for execution ${state.executionId}`);
    
    // Simulate critical operation processing
    await this.delay(3000);
    
    const approved = !state.waitingForApproval;
    this.recordApprovalDecision(state, 'critical_operation', approved, state.confidence);
    
    return {
      metadata: {
        ...state.metadata,
        criticalCompleted: true,
        operationResult: approved ? 'success' : 'aborted',
        executiveApprovalReceived: approved,
        auditLogged: true
      },
      confidence: approved ? Math.min(state.confidence + 0.15, 1.0) : 0.1 // Major confidence penalty if critical operation rejected
    };
  }

  /**
   * Compile test results
   */
  @Node('compile_results')
  @StreamProgress({ 
    enabled: true,
    granularity: 'fine',
    milestones: [90, 100]
  })
  async compileResults(state: HITLTestState): Promise<Partial<HITLTestState>> {
    this.logger.log(`Compiling results for HITL test ${state.executionId}`);
    
    const approvalPath = state.completedNodes || [];
    const approvalHistory = state.approvalHistory || [];
    
    const totalApprovalTime = approvalHistory.reduce((total, approval) => {
      // In a real implementation, we'd calculate actual approval times
      return total + 30000; // Mock 30 seconds per approval
    }, 0);
    
    const confidenceProgression = approvalHistory.map(approval => approval.confidence);
    
    const results = {
      approvalPath,
      totalApprovalTime,
      confidenceProgression,
      riskAssessments: [], // Would contain actual risk assessments
      summary: {
        scenario: state.scenario,
        environment: state.environment,
        totalApprovals: approvalHistory.length,
        approvedCount: approvalHistory.filter(a => a.approved).length,
        rejectedCount: approvalHistory.filter(a => !a.approved).length,
        avgConfidence: confidenceProgression.length > 0 
          ? confidenceProgression.reduce((a, b) => a + b, 0) / confidenceProgression.length 
          : 0,
        testDuration: state.metadata?.['testStarted'] ? Date.now() - new Date(state.metadata['testStarted'] as string).getTime() : 0
      }
    };
    
    return {
      results,
      status: 'completed',
      metadata: {
        ...state.metadata,
        testCompleted: new Date(),
        testResults: results
      }
    };
  }

  /**
   * Routing logic based on scenario
   */
  @Edge('start', (state: HITLTestState) => {
    switch (state.scenario) {
      case 'low-risk':
        return 'low_risk_operation';
      case 'medium-risk':
        return 'medium_risk_operation';
      case 'high-risk':
        return 'high_risk_operation';
      case 'critical-risk':
        return 'critical_operation';
      default:
        return 'medium_risk_operation'; // Default to medium risk
    }
  })
  routeToRiskLevel() {
    // Edge routing is handled by the condition function above
  }

  @Edge('low_risk_operation', 'compile_results')
  @Edge('medium_risk_operation', 'compile_results')
  @Edge('high_risk_operation', 'compile_results')
  @Edge('critical_operation', 'compile_results')
  routeToResults() {
    // Direct routing to results compilation
  }

  /**
   * Helper method to record approval decisions for analysis
   */
  private recordApprovalDecision(
    state: HITLTestState,
    nodeId: string,
    approved: boolean,
    confidence: number
  ): void {
    if (!state.approvalHistory) {
      state.approvalHistory = [];
    }
    
    state.approvalHistory.push({
      nodeId,
      approved,
      approver: approved ? 'system' : 'human', // Simplified for test
      timestamp: new Date(),
      confidence
    });
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test data factory for different scenarios
 */
export class HITLTestDataFactory {
  static createLowRiskScenario(): Partial<HITLTestState> {
    return {
      scenario: 'low-risk',
      environment: 'development',
      codeChanges: {
        files: ['utils.ts', 'config.ts'],
        linesAdded: 15,
        linesRemoved: 3,
        riskScore: 0.2
      },
      userImpact: {
        affectedUsers: 0,
        criticalFeatures: [],
        downtime: 0
      },
      confidence: 0.9,
      metadata: {
        userRole: 'developer',
        safeMode: true
      }
    };
  }

  static createMediumRiskScenario(): Partial<HITLTestState> {
    return {
      scenario: 'medium-risk',
      environment: 'staging',
      codeChanges: {
        files: ['api.ts', 'database.ts', 'service.ts'],
        linesAdded: 150,
        linesRemoved: 45,
        riskScore: 0.5
      },
      userImpact: {
        affectedUsers: 100,
        criticalFeatures: ['user-authentication'],
        downtime: 2
      },
      confidence: 0.7
    };
  }

  static createHighRiskScenario(): Partial<HITLTestState> {
    return {
      scenario: 'high-risk',
      environment: 'production',
      codeChanges: {
        files: ['core.ts', 'payment.ts', 'security.ts', 'database-migration.sql'],
        linesAdded: 300,
        linesRemoved: 120,
        riskScore: 0.8
      },
      userImpact: {
        affectedUsers: 5000,
        criticalFeatures: ['payment-processing', 'user-data', 'security'],
        downtime: 15
      },
      confidence: 0.4
    };
  }

  static createCriticalRiskScenario(): Partial<HITLTestState> {
    return {
      scenario: 'critical-risk',
      environment: 'production',
      codeChanges: {
        files: ['billing-system.ts', 'user-accounts.ts', 'infrastructure.yaml', 'security-config.ts'],
        linesAdded: 500,
        linesRemoved: 200,
        riskScore: 0.95
      },
      userImpact: {
        affectedUsers: 50000,
        criticalFeatures: ['billing', 'user-accounts', 'payment-processing', 'data-access'],
        downtime: 60
      },
      confidence: 0.2,
      metadata: {
        businessCritical: true,
        compliance: true,
        revenue: true
      }
    };
  }
}