import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowState } from '../interfaces/workflow.interface';
import { ApprovalRiskLevel } from '../decorators/approval.decorator';
import { HITL_EVENTS, RISK_WEIGHTS, CONFIDENCE_FACTORS } from './constants';

/**
 * Confidence factor contribution
 */
export interface ConfidenceFactor {
  name: string;
  value: number;
  weight: number;
  source: 'historical' | 'contextual' | 'algorithmic' | 'user' | 'system';
  description: string;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  level: ApprovalRiskLevel;
  score: number; // 0-1 scale
  factors: string[];
  details: {
    security: number;
    dataImpact: number;
    userImpact: number;
    businessImpact: number;
    operationalImpact: number;
    [key: string]: number;
  };
  recommendations: string[];
  mitigations: string[];
}

/**
 * Risk assessment options
 */
export interface RiskAssessmentOptions {
  factors?: string[];
  customEvaluator?: (state: WorkflowState) => {
    level: ApprovalRiskLevel;
    factors: string[];
    score: number;
  };
  weights?: Record<string, number>;
}

/**
 * Historical approval pattern
 */
export interface ApprovalPattern {
  nodeId: string;
  approvalRate: number;
  averageConfidence: number;
  commonRejectionReasons: string[];
  riskFactors: string[];
  successfulExecutions: number;
  failedExecutions: number;
  lastUpdated: Date;
}

/**
 * Confidence evaluation context
 */
export interface ConfidenceEvaluationContext {
  /** Current workflow state */
  state: WorkflowState;
  
  /** Historical patterns for this node */
  historicalPattern?: ApprovalPattern;
  
  /** User/role context */
  userContext?: {
    role: string;
    experience: number;
    successRate: number;
  };
  
  /** Environmental factors */
  environment?: {
    isProduction: boolean;
    timeOfDay: number; // 0-23
    dayOfWeek: number; // 0-6
    systemLoad: number; // 0-1
  };
  
  /** Custom evaluation factors */
  customFactors?: Record<string, number>;
}

/**
 * Machine learning integration hooks
 */
export interface MLIntegrationHooks {
  /** Predict confidence based on state */
  predictConfidence?: (state: WorkflowState) => Promise<number>;
  
  /** Predict risk level */
  predictRisk?: (state: WorkflowState) => Promise<ApprovalRiskLevel>;
  
  /** Learn from approval outcome */
  learnFromOutcome?: (
    state: WorkflowState,
    approved: boolean,
    confidence: number,
    actualOutcome: 'success' | 'failure'
  ) => Promise<void>;
  
  /** Get recommendation */
  getRecommendation?: (state: WorkflowState) => Promise<{
    shouldApprove: boolean;
    confidence: number;
    reasoning: string[];
  }>;
}

/**
 * Service for evaluating confidence levels and risk assessments for approval decisions
 */
@Injectable()
export class ConfidenceEvaluatorService implements OnModuleInit {
  private readonly logger = new Logger(ConfidenceEvaluatorService.name);
  
  // In-memory stores (in production, these would be backed by persistent storage)
  private approvalPatterns = new Map<string, ApprovalPattern>();
  private confidenceHistory = new Map<string, ConfidenceFactor[]>();
  private mlHooks?: MLIntegrationHooks;

  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Confidence Evaluator Service initialized');
    
    // Load historical patterns (would be from database in production)
    await this.loadHistoricalPatterns();
  }

  /**
   * Evaluate confidence level for workflow state
   */
  async evaluateConfidence(
    state: WorkflowState,
    context?: Partial<ConfidenceEvaluationContext>
  ): Promise<number> {
    const evaluationContext: ConfidenceEvaluationContext = {
      state,
      ...context
    };
    
    this.logger.debug(`Evaluating confidence for execution ${state.executionId}`);
    
    try {
      // Get base confidence from state
      let confidence = state.confidence || 0.5;
      
      // Apply confidence factors
      const factors = await this.calculateConfidenceFactors(evaluationContext);
      
      // Weighted average of all factors
      let totalWeight = 0;
      let weightedSum = 0;
      
      for (const factor of factors) {
        weightedSum += factor.value * factor.weight;
        totalWeight += factor.weight;
      }
      
      if (totalWeight > 0) {
        confidence = weightedSum / totalWeight;
      }
      
      // Apply ML prediction if available
      if (this.mlHooks?.predictConfidence) {
        const mlConfidence = await this.mlHooks.predictConfidence(state);
        confidence = (confidence + mlConfidence) / 2; // Average with ML prediction
      }
      
      // Clamp to valid range
      confidence = Math.max(0, Math.min(1, confidence));
      
      // Store confidence factors for analysis
      this.confidenceHistory.set(state.executionId, factors);
      
      // Emit evaluation event
      await this.eventEmitter.emit(HITL_EVENTS.CONFIDENCE_EVALUATED, {
        executionId: state.executionId,
        confidence,
        factors: factors.map(f => ({ name: f.name, value: f.value, weight: f.weight })),
        timestamp: new Date()
      });
      
      this.logger.debug(`Confidence evaluated: ${confidence.toFixed(3)} for execution ${state.executionId}`);
      
      return confidence;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error evaluating confidence: ${errorMsg}`, errorStack);
      return state.confidence || 0.5; // Fallback to current or default
    }
  }

  /**
   * Assess risk level for workflow state
   */
  async assessRisk(
    state: WorkflowState,
    options: RiskAssessmentOptions = {}
  ): Promise<RiskAssessment> {
    this.logger.debug(`Assessing risk for execution ${state.executionId}`);
    
    try {
      // Use custom evaluator if provided
      if (options.customEvaluator) {
        const customResult = options.customEvaluator(state);
        const assessment: RiskAssessment = {
          ...customResult,
          details: {
            security: 0,
            dataImpact: 0,
            userImpact: 0,
            businessImpact: 0,
            operationalImpact: 0
          },
          recommendations: [],
          mitigations: []
        };
        
        return this.enhanceRiskAssessment(assessment, state, options);
      }
      
      // Calculate risk factors
      const riskDetails = await this.calculateRiskFactors(state, options);
      
      // Calculate weighted risk score
      const weights = { ...RISK_WEIGHTS, ...options.weights };
      let riskScore = 0;
      
      riskScore += riskDetails.security * weights.SECURITY;
      riskScore += riskDetails.dataImpact * weights.DATA_IMPACT;
      riskScore += riskDetails.userImpact * weights.USER_IMPACT;
      riskScore += riskDetails.businessImpact * weights.BUSINESS_IMPACT;
      riskScore += riskDetails.operationalImpact * weights.OPERATIONAL_IMPACT;
      
      // Determine risk level
      let riskLevel: ApprovalRiskLevel;
      if (riskScore >= 0.8) {
        riskLevel = ApprovalRiskLevel.CRITICAL;
      } else if (riskScore >= 0.6) {
        riskLevel = ApprovalRiskLevel.HIGH;
      } else if (riskScore >= 0.3) {
        riskLevel = ApprovalRiskLevel.MEDIUM;
      } else {
        riskLevel = ApprovalRiskLevel.LOW;
      }
      
      // Apply ML prediction if available
      if (this.mlHooks?.predictRisk) {
        const mlRiskLevel = await this.mlHooks.predictRisk(state);
        // Use highest risk level between calculation and ML prediction
        const riskLevels = [ApprovalRiskLevel.LOW, ApprovalRiskLevel.MEDIUM, ApprovalRiskLevel.HIGH, ApprovalRiskLevel.CRITICAL];
        const currentIndex = riskLevels.indexOf(riskLevel);
        const mlIndex = riskLevels.indexOf(mlRiskLevel);
        riskLevel = riskLevels[Math.max(currentIndex, mlIndex)];
      }
      
      // Identify factors that contributed to risk
      const factors = this.identifyRiskFactors(riskDetails, options.factors || []);
      
      const assessment: RiskAssessment = {
        level: riskLevel,
        score: riskScore,
        factors,
        details: riskDetails,
        recommendations: this.generateRecommendations(riskLevel, factors),
        mitigations: this.generateMitigations(riskLevel, factors)
      };
      
      // Emit risk assessment event
      await this.eventEmitter.emit(HITL_EVENTS.RISK_ASSESSED, {
        executionId: state.executionId,
        assessment,
        timestamp: new Date()
      });
      
      this.logger.debug(`Risk assessed: ${riskLevel} (${riskScore.toFixed(3)}) for execution ${state.executionId}`);
      
      return assessment;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error assessing risk: ${errorMsg}`, errorStack);
      
      // Return safe default
      return {
        level: ApprovalRiskLevel.MEDIUM,
        score: 0.5,
        factors: ['evaluation-error'],
        details: {
          security: 0.5,
          dataImpact: 0.5,
          userImpact: 0.5,
          businessImpact: 0.5,
          operationalImpact: 0.5
        },
        recommendations: ['Manual review recommended due to evaluation error'],
        mitigations: ['Proceed with caution']
      };
    }
  }

  /**
   * Get confidence factors for a state
   */
  async getConfidenceFactors(state: WorkflowState): Promise<Record<string, number>> {
    const factors = this.confidenceHistory.get(state.executionId);
    if (!factors) {
      return {};
    }
    
    const result: Record<string, number> = {};
    for (const factor of factors) {
      result[factor.name] = factor.value;
    }
    
    return result;
  }

  /**
   * Learn from approval outcome for future predictions
   */
  async learnFromApprovalOutcome(
    state: WorkflowState,
    approved: boolean,
    confidence: number,
    actualOutcome?: 'success' | 'failure'
  ): Promise<void> {
    const nodeId = state.currentNode || 'unknown';
    
    this.logger.debug(`Learning from approval outcome for node ${nodeId}: approved=${approved}, outcome=${actualOutcome}`);
    
    try {
      // Update historical pattern
      let pattern = this.approvalPatterns.get(nodeId);
      if (!pattern) {
        pattern = {
          nodeId,
          approvalRate: 0,
          averageConfidence: 0,
          commonRejectionReasons: [],
          riskFactors: [],
          successfulExecutions: 0,
          failedExecutions: 0,
          lastUpdated: new Date()
        };
        this.approvalPatterns.set(nodeId, pattern);
      }
      
      // Update approval rate
      const totalApprovals = pattern.successfulExecutions + pattern.failedExecutions;
      const newTotal = totalApprovals + 1;
      pattern.approvalRate = (pattern.approvalRate * totalApprovals + (approved ? 1 : 0)) / newTotal;
      
      // Update average confidence
      pattern.averageConfidence = (pattern.averageConfidence * totalApprovals + confidence) / newTotal;
      
      // Update execution counts
      if (actualOutcome === 'success') {
        pattern.successfulExecutions++;
      } else if (actualOutcome === 'failure') {
        pattern.failedExecutions++;
      }
      
      pattern.lastUpdated = new Date();
      
      // Use ML hook if available
      if (this.mlHooks?.learnFromOutcome && actualOutcome) {
        await this.mlHooks.learnFromOutcome(state, approved, confidence, actualOutcome);
      }
      
      this.logger.debug(`Updated pattern for node ${nodeId}: approval rate ${pattern.approvalRate.toFixed(3)}`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error learning from approval outcome: ${errorMsg}`, errorStack);
    }
  }

  /**
   * Get historical approval pattern for a node
   */
  getHistoricalPattern(nodeId: string): ApprovalPattern | undefined {
    return this.approvalPatterns.get(nodeId);
  }

  /**
   * Get ML recommendation if available
   */
  async getMLRecommendation(state: WorkflowState): Promise<{
    shouldApprove: boolean;
    confidence: number;
    reasoning: string[];
  } | undefined> {
    if (this.mlHooks?.getRecommendation) {
      try {
        return await this.mlHooks.getRecommendation(state);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`ML recommendation failed: ${errorMsg}`);
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Register ML integration hooks
   */
  registerMLHooks(hooks: Partial<MLIntegrationHooks>): void {
    this.mlHooks = { ...this.mlHooks, ...hooks };
    this.logger.log('ML integration hooks registered');
  }

  /**
   * Load historical patterns (would be from database in production)
   */
  private async loadHistoricalPatterns(): Promise<void> {
    // In production, this would load from a persistent store
    // For now, we'll initialize with some default patterns
    
    const defaultPatterns: ApprovalPattern[] = [
      {
        nodeId: 'deploy_production',
        approvalRate: 0.85,
        averageConfidence: 0.7,
        commonRejectionReasons: ['insufficient testing', 'high risk'],
        riskFactors: ['production-deployment', 'user-impact'],
        successfulExecutions: 42,
        failedExecutions: 3,
        lastUpdated: new Date()
      },
      {
        nodeId: 'modify_user_data',
        approvalRate: 0.92,
        averageConfidence: 0.8,
        commonRejectionReasons: ['data validation failed'],
        riskFactors: ['data-modification', 'user-privacy'],
        successfulExecutions: 156,
        failedExecutions: 12,
        lastUpdated: new Date()
      }
    ];
    
    for (const pattern of defaultPatterns) {
      this.approvalPatterns.set(pattern.nodeId, pattern);
    }
    
    this.logger.debug(`Loaded ${defaultPatterns.length} historical patterns`);
  }

  // Additional helper methods that were missing...
  
  /**
   * Calculate confidence factors
   */
  private async calculateConfidenceFactors(
    context: ConfidenceEvaluationContext
  ): Promise<ConfidenceFactor[]> {
    const factors: ConfidenceFactor[] = [];
    const { state } = context;
    
    // Base confidence from state
    factors.push({
      name: 'base_confidence',
      value: state.confidence || 0.5,
      weight: 0.3,
      source: 'system',
      description: 'Base confidence from workflow state'
    });
    
    // Historical success pattern
    if (context.historicalPattern) {
      const pattern = context.historicalPattern;
      const successRate = pattern.successfulExecutions / 
        Math.max(1, pattern.successfulExecutions + pattern.failedExecutions);
      
      factors.push({
        name: 'historical_success',
        value: successRate,
        weight: 0.25,
        source: 'historical',
        description: `Historical success rate: ${(successRate * 100).toFixed(1)}%`
      });
    }
    
    return factors;
  }

  /**
   * Calculate risk factors
   */
  private async calculateRiskFactors(
    state: WorkflowState,
    options: RiskAssessmentOptions
  ): Promise<RiskAssessment['details']> {
    const details = {
      security: 0,
      dataImpact: 0,
      userImpact: 0,
      businessImpact: 0,
      operationalImpact: 0
    };
    
    // Analyze metadata for risk indicators
    const metadata = state.metadata || {};
    
    // Security risk assessment
    if (metadata['privilegedOperation'] || metadata['adminAction']) {
      details.security = Math.max(details.security, 0.8);
    }
    
    // Data impact assessment
    if (metadata['prodData'] || metadata['customerData']) {
      details.dataImpact = Math.max(details.dataImpact, 0.9);
    }
    
    // User impact assessment
    const userCount = metadata['affectedUsers'] as number || 0;
    if (userCount > 1000) {
      details.userImpact = 0.8;
    }
    
    return details;
  }

  /**
   * Generate recommendations based on risk level
   */
  private generateRecommendations(level: ApprovalRiskLevel, factors: string[]): string[] {
    const recommendations: string[] = [];
    
    switch (level) {
      case ApprovalRiskLevel.LOW:
        recommendations.push('Consider auto-approval for similar operations');
        break;
      case ApprovalRiskLevel.MEDIUM:
        recommendations.push('Standard approval process recommended');
        break;
      case ApprovalRiskLevel.HIGH:
        recommendations.push('Senior approval required');
        break;
      case ApprovalRiskLevel.CRITICAL:
        recommendations.push('Executive approval required');
        break;
    }
    
    return recommendations;
  }

  /**
   * Generate mitigations based on risk level
   */
  private generateMitigations(level: ApprovalRiskLevel, factors: string[]): string[] {
    const mitigations: string[] = [];
    
    switch (level) {
      case ApprovalRiskLevel.LOW:
        mitigations.push('Standard monitoring and alerting');
        break;
      case ApprovalRiskLevel.MEDIUM:
        mitigations.push('Enhanced monitoring during execution');
        break;
      case ApprovalRiskLevel.HIGH:
        mitigations.push('Real-time monitoring and alerting');
        break;
      case ApprovalRiskLevel.CRITICAL:
        mitigations.push('War room setup with all stakeholders');
        break;
    }
    
    return mitigations;
  }

  /**
   * Identify risk factors from details
   */
  private identifyRiskFactors(
    details: RiskAssessment['details'],
    customFactors: string[]
  ): string[] {
    const factors: string[] = [];
    
    if (details.security > 0.6) factors.push('high-security-risk');
    if (details.dataImpact > 0.7) factors.push('high-data-impact');
    if (details.userImpact > 0.6) factors.push('high-user-impact');
    if (details.businessImpact > 0.7) factors.push('high-business-impact');
    if (details.operationalImpact > 0.8) factors.push('high-operational-impact');
    
    factors.push(...customFactors);
    
    return factors;
  }

  /**
   * Enhance risk assessment with additional analysis
   */
  private async enhanceRiskAssessment(
    assessment: RiskAssessment,
    state: WorkflowState,
    options: RiskAssessmentOptions
  ): Promise<RiskAssessment> {
    if (!assessment.details.security) {
      const details = await this.calculateRiskFactors(state, options);
      assessment.details = { ...details, ...assessment.details };
    }
    
    if (assessment.recommendations.length === 0) {
      assessment.recommendations = this.generateRecommendations(
        assessment.level,
        assessment.factors
      );
    }
    
    if (assessment.mitigations.length === 0) {
      assessment.mitigations = this.generateMitigations(
        assessment.level,
        assessment.factors
      );
    }
    
    return assessment;
  }

}