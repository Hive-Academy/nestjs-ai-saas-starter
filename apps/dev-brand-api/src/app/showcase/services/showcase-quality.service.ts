import { Injectable, Logger } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { ApprovalRiskLevel } from '@hive-academy/langgraph-hitl';
import type { ShowcaseAgentState, ShowcaseApproval } from '../types/showcase.types';

/**
 * ✅ SHOWCASE QUALITY SERVICE
 * 
 * Responsible for quality assurance and approval workflows.
 * Handles HITL approvals, risk assessment, and quality metrics.
 */
@Injectable()
export class ShowcaseQualityService {
  private readonly logger = new Logger(ShowcaseQualityService.name);

  /**
   * Create approval request for content quality review
   */
  createApprovalRequest(
    showcaseId: string,
    state: Partial<ShowcaseAgentState>
  ): ShowcaseApproval {
    this.logger.log('✅ Creating quality assurance approval request...');

    const approvalRequest: ShowcaseApproval = {
      id: `approval-${showcaseId}-${Date.now()}`,
      type: 'content',
      title: 'Showcase Content Quality Review',
      description: 'Review generated showcase content for accuracy and completeness',
      requestedBy: 'supervisor-showcase-workflow',
      requestedAt: Date.now(),

      options: [
        {
          id: 'approve',
          label: 'Approve Content',
          description: 'Content meets quality standards and is ready for final processing',
          consequences: ['Content will be finalized and prepared for delivery'],
          confidence: 0.9,
        },
        {
          id: 'revise',
          label: 'Request Revisions',
          description: 'Content needs improvements before approval',
          consequences: ['Content will be regenerated with improvements'],
          confidence: 0.7,
        },
        {
          id: 'reject',
          label: 'Reject Content',
          description: 'Content does not meet standards and needs complete rework',
          consequences: ['Workflow will restart from analysis phase'],
          confidence: 0.3,
        },
      ],

      context: {
        agentState: {
          contentSections: (state.generatedContent as any[])?.length || 0,
          analysisQuality: (state.analysis as any[])?.length || 0,
        },
        reasoning: 'Human validation required for showcase content quality',
        confidence: 0.85,
        alternatives: [
          'Auto-approve based on high confidence',
          'Skip approval for basic mode',
        ],
      },

      timeout: 180000, // 3 minutes
      fallbackAction: 'auto-approve',
    };

    return approvalRequest;
  }

  /**
   * Assess content quality and determine risk level
   */
  assessContentRisk(state: Partial<ShowcaseAgentState>): {
    level: ApprovalRiskLevel;
    factors: string[];
    score: number;
    autoApprove: boolean;
  } {
    const factors: string[] = [];
    let riskScore = 0;

    // Analyze content completeness
    const contentSections = (state.generatedContent as any[])?.length || 0;
    if (contentSections < 3) {
      factors.push('Insufficient content sections');
      riskScore += 0.3;
    }

    // Analyze analysis depth
    const analysisResults = (state.analysis as any[])?.length || 0;
    if (analysisResults < 1) {
      factors.push('Limited analysis depth');
      riskScore += 0.2;
    }

    // Check for errors
    const errorCount = state.errors?.length || 0;
    if (errorCount > 0) {
      factors.push(`${errorCount} workflow errors detected`);
      riskScore += errorCount * 0.1;
    }

    // Assess demonstration mode
    if (state.demonstrationMode === 'enterprise') {
      factors.push('Enterprise mode requires thorough validation');
      riskScore += 0.1;
    }

    // Determine risk level
    let level: ApprovalRiskLevel;
    if (riskScore >= 0.6) {
      level = ApprovalRiskLevel.HIGH;
    } else if (riskScore >= 0.3) {
      level = ApprovalRiskLevel.MEDIUM;
    } else {
      level = ApprovalRiskLevel.LOW;
    }

    const autoApprove = riskScore < 0.2 && state.demonstrationMode === 'basic';

    this.logger.log(`Risk assessment: ${level} (score: ${riskScore}, auto-approve: ${autoApprove})`);

    return {
      level,
      factors,
      score: riskScore,
      autoApprove,
    };
  }

  /**
   * Validate content meets quality standards
   */
  validateQualityStandards(state: Partial<ShowcaseAgentState>): {
    passed: boolean;
    score: number;
    checks: Array<{
      name: string;
      passed: boolean;
      weight: number;
      description: string;
    }>;
  } {
    const checks = [
      {
        name: 'Content Completeness',
        passed: (state.generatedContent as any[])?.length >= 3,
        weight: 0.3,
        description: 'Minimum 3 content sections required',
      },
      {
        name: 'Analysis Depth',
        passed: (state.analysis as any[])?.length >= 1,
        weight: 0.2,
        description: 'At least one analysis result required',
      },
      {
        name: 'Error Rate',
        passed: (state.errors?.length || 0) <= 2,
        weight: 0.2,
        description: 'Maximum 2 recoverable errors allowed',
      },
      {
        name: 'Execution Time',
        passed: (Date.now() - (state.executionStartTime || Date.now())) < 300000,
        weight: 0.1,
        description: 'Workflow should complete within 5 minutes',
      },
      {
        name: 'Message Continuity',
        passed: (state.messages?.length || 0) >= 5,
        weight: 0.1,
        description: 'Minimum message flow for traceability',
      },
      {
        name: 'Agent Coordination',
        passed: (state.metricsCollected?.agentSwitches || 0) >= 1,
        weight: 0.1,
        description: 'Evidence of multi-agent coordination',
      },
    ];

    const score = checks.reduce((total, check) => {
      return total + (check.passed ? check.weight : 0);
    }, 0);

    const passed = score >= 0.7; // 70% threshold

    this.logger.log(`Quality validation: ${passed ? 'PASSED' : 'FAILED'} (score: ${Math.round(score * 100)}%)`);

    return {
      passed,
      score,
      checks,
    };
  }

  /**
   * Update state with approval request
   */
  updateStateWithApproval(
    state: Partial<ShowcaseAgentState>,
    approvalRequest: ShowcaseApproval
  ): Partial<ShowcaseAgentState> {
    return {
      ...state,
      pendingApprovals: [...(state.pendingApprovals || []), approvalRequest],
      messages: [
        ...(state.messages || []),
        new HumanMessage('Quality assurance initiated - human approval requested'),
        new HumanMessage(`Approval request: ${approvalRequest.title}`),
      ],
    };
  }

  /**
   * Process approval response
   */
  processApprovalResponse(
    approvalId: string,
    response: 'approve' | 'revise' | 'reject',
    state: Partial<ShowcaseAgentState>
  ): {
    approved: boolean;
    nextAction: string;
    updatedState: Partial<ShowcaseAgentState>;
  } {
    this.logger.log(`Processing approval response: ${response} for ${approvalId}`);

    const approval = state.pendingApprovals?.find(a => a.id === approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    const approvalHistory = [
      ...(state.approvalHistory || []),
      {
        approvalId,
        response,
        timestamp: Date.now(),
        reviewer: 'human-reviewer',
        comments: `Content ${response}d via quality assurance workflow`,
      },
    ];

    const pendingApprovals = state.pendingApprovals?.filter(a => a.id !== approvalId) || [];

    let nextAction: string;
    let approved: boolean;

    switch (response) {
      case 'approve':
        nextAction = 'finalize_showcase';
        approved = true;
        break;
      case 'revise':
        nextAction = 'generate_content';
        approved = false;
        break;
      case 'reject':
        nextAction = 'intelligent_analysis';
        approved = false;
        break;
      default:
        throw new Error(`Invalid approval response: ${response}`);
    }

    const updatedState: Partial<ShowcaseAgentState> = {
      ...state,
      pendingApprovals,
      approvalHistory,
      messages: [
        ...(state.messages || []),
        new HumanMessage(`Approval ${response}d: ${approval.title}`),
        new HumanMessage(`Next action: ${nextAction}`),
      ],
    };

    return {
      approved,
      nextAction,
      updatedState,
    };
  }

  /**
   * Generate quality assurance report
   */
  generateQualityReport(state: Partial<ShowcaseAgentState>): {
    overallScore: number;
    qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
    recommendations: string[];
  } {
    const validation = this.validateQualityStandards(state);
    const overallScore = Math.round(validation.score * 100);

    let qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) qualityGrade = 'A';
    else if (overallScore >= 80) qualityGrade = 'B';
    else if (overallScore >= 70) qualityGrade = 'C';
    else if (overallScore >= 60) qualityGrade = 'D';
    else qualityGrade = 'F';

    const failedChecks = validation.checks.filter(c => !c.passed);
    const recommendations = failedChecks.map(check => 
      `Improve ${check.name}: ${check.description}`
    );

    const summary = `Quality assessment completed with ${overallScore}% score (Grade ${qualityGrade}). ${
      validation.passed ? 'Meets' : 'Does not meet'
    } minimum quality standards.`;

    return {
      overallScore,
      qualityGrade,
      summary,
      recommendations,
    };
  }
}