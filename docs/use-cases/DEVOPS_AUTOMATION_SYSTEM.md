# DevOps CI/CD Automation System

## Overview

This use case demonstrates a comprehensive AI-powered DevOps pipeline that combines code analysis, security scanning, deployment automation, and human oversight for safe software delivery.

Updated to align with the latest architecture improvements:

- Dual agent types support (simple-agent and workflow-agent) via the Agent-Workflow Bridge when appropriate
- Unified decorator composition with a single enhanced @RequiresApproval across modules
- Typed metadata for streaming/checkpoints; conservative defaults for production environments
- Centralized registration pattern and platform-backed audit trails

**Modules Used**: workflow-engine + functional-api + multi-agent + hitl + platform

## System Architecture

```text
Code Changes → AI Analysis → Build & Test → Deployment Planning → Human Approval → Platform Execution
     ↓             ↓            ↓              ↓                 ↓               ↓
  Repository    Multi-Agent   Automated     Risk Assessment   Approval Chain   Audit Trail
  Integration   Code Review    Testing      & Compliance     Management       & Monitoring
```

## Implementation

### 1. DevOps Specialist Agents

#### Code Review Agent

```typescript
@Agent({
  id: 'code-reviewer',
  name: 'Code Review Specialist',
  capabilities: ['code_analysis', 'security_audit', 'performance_review', 'best_practices'],
  tools: ['static_analyzer', 'security_scanner', 'performance_profiler', 'complexity_analyzer'],
  priority: 'high',
  executionTime: 'medium',
})
@Injectable()
export class CodeReviewerAgent {
  constructor(private readonly staticAnalysisService: StaticAnalysisService, private readonly securityScannerService: SecurityScannerService, private readonly performanceAnalyzerService: PerformanceAnalyzerService, private readonly complexityAnalyzerService: ComplexityAnalyzerService) {}

  async nodeFunction(state: DevOpsState): Promise<Partial<DevOpsState>> {
    const codeAnalysis = await this.performComprehensiveCodeAnalysis(state.codeChanges, state.repositoryContext, state.targetBranch);

    return {
      messages: [new AIMessage(`Code review complete: ${codeAnalysis.issues.length} issues found, ` + `${codeAnalysis.securityScore}/10 security score`)],
      codeAnalysis: {
        securityFindings: codeAnalysis.security,
        performanceIssues: codeAnalysis.performance,
        codeQuality: codeAnalysis.quality,
        testCoverage: codeAnalysis.coverage,
        complexity: codeAnalysis.complexity,
        bestPracticeViolations: codeAnalysis.bestPractices,
        overallScore: codeAnalysis.overallScore,
      },
      confidence: codeAnalysis.confidence,
      riskLevel: this.calculateCodeRisk(codeAnalysis),
    };
  }

  @Tool({
    name: 'run_static_analysis',
    description: 'Run comprehensive static code analysis',
    schema: z.object({
      files: z.array(z.string()),
      language: z.string(),
      analysisType: z.enum(['basic', 'comprehensive', 'security-focused']).default('comprehensive'),
    }),
  })
  async runStaticAnalysis({ files, language, analysisType }: { files: string[]; language: string; analysisType: 'basic' | 'comprehensive' | 'security-focused' }) {
    const analysisConfig = {
      files,
      language,
      rules: this.getAnalysisRules(analysisType),
      includeMetrics: true,
      generateRecommendations: true,
    };

    return await this.staticAnalysisService.analyzeCode(analysisConfig);
  }

  @Tool({
    name: 'run_security_scan',
    description: 'Run comprehensive security analysis on code changes',
    schema: z.object({
      files: z.array(z.string()),
      scanDepth: z.enum(['basic', 'comprehensive', 'deep']).default('comprehensive'),
      includeVulnerabilityDb: z.boolean().default(true),
      checkDependencies: z.boolean().default(true),
    }),
  })
  @RequiresApproval({
    when: (state) => state.repositoryContext?.containsSensitiveData === true,
    message: 'Access external vulnerability databases for security scan?',
    timeoutMs: 300000,
  })
  async runSecurityScan({ files, scanDepth, includeVulnerabilityDb, checkDependencies }: { files: string[]; scanDepth: 'basic' | 'comprehensive' | 'deep'; includeVulnerabilityDb: boolean; checkDependencies: boolean }) {
    const scanConfig = {
      targetFiles: files,
      depth: scanDepth,
      externalDatabases: includeVulnerabilityDb,
      dependencyAnalysis: checkDependencies,
      compliance: ['OWASP', 'CIS', 'SOC2'],
    };

    const securityResults = await this.securityScannerService.scanCode(scanConfig);

    return {
      vulnerabilities: securityResults.vulnerabilities,
      securityScore: securityResults.overallScore,
      complianceStatus: securityResults.compliance,
      recommendations: securityResults.recommendations,
      riskLevel: this.categorizeSecurityRisk(securityResults),
    };
  }

  @Tool({
    name: 'analyze_performance_impact',
    description: 'Analyze potential performance impact of code changes',
    schema: z.object({
      beforeCommit: z.string(),
      afterCommit: z.string(),
      testSuite: z.array(z.string()).optional(),
      benchmarkThreshold: z.number().optional().default(0.1),
    }),
  })
  async analyzePerformanceImpact({ beforeCommit, afterCommit, testSuite, benchmarkThreshold }: { beforeCommit: string; afterCommit: string; testSuite?: string[]; benchmarkThreshold: number }) {
    return await this.performanceAnalyzerService.compareCommits({
      baseline: beforeCommit,
      comparison: afterCommit,
      tests: testSuite,
      threshold: benchmarkThreshold,
    });
  }

  @Tool({
    name: 'calculate_code_complexity',
    description: 'Calculate cyclomatic complexity and maintainability metrics',
    schema: z.object({
      files: z.array(z.string()),
      includeTestFiles: z.boolean().default(false),
    }),
  })
  async calculateCodeComplexity({ files, includeTestFiles }: { files: string[]; includeTestFiles: boolean }) {
    return await this.complexityAnalyzerService.analyzeComplexity({
      sourceFiles: files,
      includeTests: includeTestFiles,
      metrics: ['cyclomatic', 'cognitive', 'maintainability'],
    });
  }

  private async performComprehensiveCodeAnalysis(codeChanges: CodeChange[], context: RepositoryContext, targetBranch: string) {
    const changedFiles = codeChanges.map((change) => change.filePath);

    // Run parallel analysis
    const [staticAnalysis, securityScan, performanceAnalysis, complexityAnalysis] = await Promise.all([
      this.runStaticAnalysis({
        files: changedFiles,
        language: context.primaryLanguage,
        analysisType: 'comprehensive',
      }),
      this.runSecurityScan({
        files: changedFiles,
        scanDepth: 'comprehensive',
        includeVulnerabilityDb: true,
        checkDependencies: true,
      }),
      this.analyzePerformanceImpact({
        beforeCommit: context.baseCommit,
        afterCommit: context.headCommit,
      }),
      this.calculateCodeComplexity({
        files: changedFiles,
        includeTestFiles: false,
      }),
    ]);

    // Combine analysis results
    const combinedAnalysis = {
      security: securityScan,
      performance: performanceAnalysis,
      quality: staticAnalysis,
      complexity: complexityAnalysis,
      coverage: await this.calculateTestCoverage(changedFiles),
      bestPractices: await this.checkBestPractices(changedFiles, context),
      issues: this.consolidateIssues([staticAnalysis, securityScan, performanceAnalysis]),
    };

    combinedAnalysis.overallScore = this.calculateOverallScore(combinedAnalysis);
    combinedAnalysis.confidence = this.calculateAnalysisConfidence(combinedAnalysis);

    return combinedAnalysis;
  }

  private calculateCodeRisk(analysis: any): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Security risk
    if (analysis.security?.vulnerabilities?.high > 0) riskScore += 4;
    else if (analysis.security?.vulnerabilities?.medium > 0) riskScore += 2;
    else if (analysis.security?.vulnerabilities?.low > 0) riskScore += 1;

    // Performance risk
    if (analysis.performance?.degradation > 0.2) riskScore += 3;
    else if (analysis.performance?.degradation > 0.1) riskScore += 2;

    // Complexity risk
    if (analysis.complexity?.averageComplexity > 15) riskScore += 2;
    else if (analysis.complexity?.averageComplexity > 10) riskScore += 1;

    // Test coverage risk
    if (analysis.coverage?.percentage < 0.6) riskScore += 2;
    else if (analysis.coverage?.percentage < 0.8) riskScore += 1;

    if (riskScore >= 7) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }
}

// WORKFLOW-AGENT: A focused internal workflow for code analysis, compiled via AgentWorkflowBridgeService
class CodeReviewInternalWorkflow {
  @Entrypoint()
  async analyze(params: { files: string[]; language: string; base: string; head: string }) {
    const staticRes = await this.runStatic(params);
    const securityRes = await this.runSecurity(params);
    return { staticRes, securityRes } as const;
  }

  @Task()
  async runStatic({ files, language }: { files: string[]; language: string }) {
    // Delegate to static analysis subsystem; returns typed metrics
    return { metrics: { filesAnalyzed: files.length, language } } as const;
  }

  @Task()
  async runSecurity({ files }: { files: string[] }) {
    // Delegate to security subsystem; returns typed vulnerability counts
    return { vulnerabilities: { critical: 0, high: 0, medium: 1, low: 3 }, filesScanned: files.length } as const;
  }
}
```

#### Deployment Manager Agent

```typescript
@Agent({
  id: 'deployment-manager',
  name: 'Deployment Manager',
  capabilities: ['deployment_orchestration', 'rollback_management', 'infrastructure_monitoring'],
  tools: ['kubernetes_api', 'helm_charts', 'monitoring_setup', 'rollback_automation'],
  priority: 'critical',
  executionTime: 'medium',
})
@Injectable()
export class DeploymentManagerAgent {
  constructor(private readonly kubernetesService: KubernetesService, private readonly helmService: HelmService, private readonly monitoringService: MonitoringService, private readonly rollbackService: RollbackService) {}

  async nodeFunction(state: DevOpsState): Promise<Partial<DevOpsState>> {
    const deploymentPlan = await this.createComprehensiveDeploymentPlan(state.codeAnalysis, state.buildResult, state.targetEnvironment, state.infrastructureContext);

    return {
      messages: [new AIMessage(`Deployment plan created for ${state.targetEnvironment}: ` + `${deploymentPlan.services.length} services, ${deploymentPlan.estimatedDowntime}s downtime`)],
      deploymentPlan,
      confidence: deploymentPlan.confidence,
      estimatedRisk: deploymentPlan.riskAssessment,
    };
  }

  @Tool({
    name: 'validate_kubernetes_manifests',
    description: 'Validate Kubernetes deployment manifests',
    schema: z.object({
      manifests: z.array(z.string()),
      namespace: z.string(),
      dryRun: z.boolean().default(true),
    }),
  })
  async validateKubernetesManifests({ manifests, namespace, dryRun }: { manifests: string[]; namespace: string; dryRun: boolean }) {
    return await this.kubernetesService.validateManifests({
      manifestPaths: manifests,
      targetNamespace: namespace,
      performDryRun: dryRun,
      checkResourceLimits: true,
      validateSecurity: true,
    });
  }

  @Tool({
    name: 'create_rollback_plan',
    description: 'Create comprehensive rollback plan for deployment',
    schema: z.object({
      deploymentId: z.string(),
      environment: z.string(),
      services: z.array(z.string()),
      rollbackStrategy: z.enum(['immediate', 'gradual', 'canary']).default('gradual'),
    }),
  })
  @RequiresApproval({
    when: (state) => state.targetEnvironment === 'production',
    confidenceThreshold: 0.9,
    message: 'Create production rollback plan with database rollback capability?',
    riskThreshold: ApprovalRiskLevel.HIGH,
  })
  async createRollbackPlan({ deploymentId, environment, services, rollbackStrategy }: { deploymentId: string; environment: string; services: string[]; rollbackStrategy: 'immediate' | 'gradual' | 'canary' }) {
    const rollbackPlan = await this.rollbackService.createRollbackPlan({
      deployment: deploymentId,
      targetEnvironment: environment,
      affectedServices: services,
      strategy: rollbackStrategy,
      includeDatabase: environment === 'production',
      verificationSteps: true,
    });

    return {
      rollbackPlan,
      estimatedRollbackTime: rollbackPlan.estimatedDuration,
      automationLevel: rollbackPlan.automationCapability,
      validationSteps: rollbackPlan.verificationSteps,
    };
  }

  @Tool({
    name: 'setup_deployment_monitoring',
    description: 'Setup comprehensive monitoring for deployment',
    schema: z.object({
      services: z.array(z.string()),
      environment: z.string(),
      monitoringLevel: z.enum(['basic', 'comprehensive', 'enterprise']).default('comprehensive'),
    }),
  })
  async setupDeploymentMonitoring({ services, environment, monitoringLevel }: { services: string[]; environment: string; monitoringLevel: 'basic' | 'comprehensive' | 'enterprise' }) {
    const monitoringConfig = await this.monitoringService.createDeploymentMonitoring({
      targetServices: services,
      environment,
      level: monitoringLevel,
      alerting: {
        errorRate: true,
        latency: true,
        availability: true,
        resourceUsage: true,
      },
      dashboards: true,
      logAggregation: true,
    });

    return {
      monitoringSetup: monitoringConfig,
      alertingRules: monitoringConfig.alerts,
      dashboardUrls: monitoringConfig.dashboards,
      healthCheckEndpoints: monitoringConfig.healthChecks,
    };
  }

  @Tool({
    name: 'estimate_deployment_impact',
    description: 'Estimate the impact and risk of deployment',
    schema: z.object({
      changes: z.array(
        z.object({
          service: z.string(),
          changeType: z.enum(['code', 'config', 'infrastructure', 'dependency']),
          impact: z.enum(['low', 'medium', 'high']),
        })
      ),
      environment: z.string(),
      currentLoad: z.number().optional(),
    }),
  })
  async estimateDeploymentImpact({
    changes,
    environment,
    currentLoad,
  }: {
    changes: Array<{
      service: string;
      changeType: 'code' | 'config' | 'infrastructure' | 'dependency';
      impact: 'low' | 'medium' | 'high';
    }>;
    environment: string;
    currentLoad?: number;
  }) {
    const impactAnalysis = await this.calculateDeploymentImpact(changes, environment, currentLoad);

    return {
      estimatedDowntime: impactAnalysis.downtime,
      affectedUsers: impactAnalysis.userImpact,
      riskLevel: impactAnalysis.risk,
      mitigationStrategies: impactAnalysis.mitigations,
      rollbackComplexity: impactAnalysis.rollbackRisk,
    };
  }

  private async createComprehensiveDeploymentPlan(codeAnalysis: CodeAnalysis, buildResult: BuildResult, targetEnvironment: string, infraContext: InfrastructureContext) {
    // Determine services affected by changes
    const affectedServices = await this.identifyAffectedServices(codeAnalysis.changedFiles, infraContext);

    // Create deployment strategy
    const deploymentStrategy = this.selectDeploymentStrategy(targetEnvironment, affectedServices, codeAnalysis.riskLevel);

    // Generate rollback plan
    const rollbackPlan = await this.createRollbackPlan({
      deploymentId: `deploy_${Date.now()}`,
      environment: targetEnvironment,
      services: affectedServices,
      rollbackStrategy: 'gradual',
    });

    // Setup monitoring
    const monitoring = await this.setupDeploymentMonitoring({
      services: affectedServices,
      environment: targetEnvironment,
      monitoringLevel: targetEnvironment === 'production' ? 'enterprise' : 'comprehensive',
    });

    // Estimate impact
    const impact = await this.estimateDeploymentImpact({
      changes: affectedServices.map((service) => ({
        service,
        changeType: 'code',
        impact: codeAnalysis.riskLevel === 'high' ? 'high' : 'medium',
      })),
      environment: targetEnvironment,
    });

    return {
      id: `deploy_${Date.now()}`,
      services: affectedServices,
      strategy: deploymentStrategy,
      rollbackPlan: rollbackPlan.rollbackPlan,
      monitoring: monitoring.monitoringSetup,
      estimatedDowntime: impact.estimatedDowntime,
      riskAssessment: {
        level: impact.riskLevel,
        factors: impact.mitigationStrategies,
        rollbackComplexity: impact.rollbackComplexity,
      },
      confidence: this.calculateDeploymentConfidence(codeAnalysis, buildResult, impact),
      timeline: this.createDeploymentTimeline(deploymentStrategy, affectedServices),
    };
  }
}
```

#### Infrastructure Security Agent

```typescript
@Agent({
  id: 'infrastructure-security',
  name: 'Infrastructure Security Specialist',
  capabilities: ['security_compliance', 'vulnerability_assessment', 'policy_enforcement'],
  tools: ['compliance_checker', 'vulnerability_scanner', 'policy_validator'],
  priority: 'critical',
})
@Injectable()
export class InfrastructureSecurityAgent {
  constructor(private readonly complianceService: ComplianceService, private readonly vulnerabilityService: VulnerabilityAssessmentService, private readonly policyService: PolicyEnforcementService) {}

  async nodeFunction(state: DevOpsState): Promise<Partial<DevOpsState>> {
    const securityAssessment = await this.performSecurityAssessment(state.infrastructureContext, state.deploymentPlan, state.targetEnvironment);

    return {
      messages: [new AIMessage(`Security assessment complete: ${securityAssessment.complianceScore}% compliant, ` + `${securityAssessment.vulnerabilities.critical} critical vulnerabilities`)],
      securityAssessment,
      confidence: securityAssessment.confidence,
      complianceStatus: securityAssessment.overallCompliance,
    };
  }

  @Tool({
    name: 'validate_security_policies',
    description: 'Validate deployment against security policies',
    schema: z.object({
      deploymentManifests: z.array(z.string()),
      environment: z.string(),
      policySet: z.enum(['basic', 'enterprise', 'government']).default('enterprise'),
    }),
  })
  async validateSecurityPolicies({ deploymentManifests, environment, policySet }: { deploymentManifests: string[]; environment: string; policySet: 'basic' | 'enterprise' | 'government' }) {
    return await this.policyService.validateDeployment({
      manifests: deploymentManifests,
      targetEnvironment: environment,
      policies: policySet,
      strictMode: environment === 'production',
    });
  }

  private async performSecurityAssessment(infraContext: InfrastructureContext, deploymentPlan: DeploymentPlan, environment: string) {
    // Multi-faceted security assessment
    const [complianceCheck, vulnerabilityAssessment, policyValidation] = await Promise.all([
      this.complianceService.checkCompliance(infraContext, environment),
      this.vulnerabilityService.assessInfrastructure(infraContext),
      this.validateSecurityPolicies({
        deploymentManifests: deploymentPlan.manifests,
        environment,
        policySet: environment === 'production' ? 'enterprise' : 'basic',
      }),
    ]);

    return {
      complianceScore: complianceCheck.overallScore,
      vulnerabilities: vulnerabilityAssessment.vulnerabilities,
      policyViolations: policyValidation.violations,
      overallCompliance: this.calculateOverallCompliance([complianceCheck, vulnerabilityAssessment, policyValidation]),
      confidence: 0.9, // High confidence in security tools
      recommendations: this.generateSecurityRecommendations([complianceCheck, vulnerabilityAssessment, policyValidation]),
    };
  }
}
```

### 2. DevOps CI/CD Workflow

```typescript
@Workflow({
  name: 'devops-cicd-pipeline',
  description: 'Comprehensive AI-powered CI/CD pipeline with security and compliance',
  streaming: true,
  hitl: { enabled: true },
  cache: true,
  metrics: true,
})
export class DevOpsCICDWorkflow extends StreamingWorkflowBase<DevOpsState> {
  constructor(private readonly multiAgentCoordinator: MultiAgentCoordinatorService, private readonly platformClient: PlatformClientService, private readonly buildService: BuildService, private readonly testService: TestService, eventEmitter: EventEmitter2, graphBuilder: WorkflowGraphBuilderService, subgraphManager: SubgraphManagerService, metadataProcessor: MetadataProcessorService, streamService?: WorkflowStreamService) {
    super(eventEmitter, graphBuilder, subgraphManager, metadataProcessor, streamService);
  }

  protected readonly workflowConfig = {
    name: 'devops-cicd-pipeline',
    streaming: true,
    cache: true,
    confidenceThreshold: 0.85,
    hitl: {
      enabled: true,
      timeout: 1800000, // 30 minutes
      fallbackStrategy: 'reject' as const,
    },
  };

  // Note: The centralized registry compiles and validates this workflow before execution.
  // Agents may be simple or workflow-agents; the AgentWorkflowBridgeService compiles
  // internal micro-workflows to single nodes while preserving external interfaces.

  @StartNode({
    description: 'Initialize CI/CD pipeline with repository context',
    timeout: 60000,
  })
  async initializePipeline(state: DevOpsState): Promise<Partial<DevOpsState>> {
    const pipelineId = `cicd_${Date.now()}`;

    // Gather comprehensive context
    const repositoryContext = await this.gatherRepositoryContext(state.repositoryUrl, state.branch, state.targetEnvironment);

    const infrastructureContext = await this.getInfrastructureContext(state.targetEnvironment);

    return {
      pipelineId,
      status: 'pipeline_started',
      startTime: new Date(),
      repositoryContext,
      infrastructureContext,
      metadata: {
        ...state.metadata,
        pipelineInitiated: true,
        triggerEvent: state.triggerEvent || 'manual',
        initiatedBy: state.userId,
      },
    };
  }

  @Node({
    type: 'standard',
    description: 'Multi-agent code and security analysis',
    timeout: 600000, // 10 minutes for comprehensive analysis
  })
  async performComprehensiveAnalysis(state: DevOpsState): Promise<Partial<DevOpsState>> {
    // Setup multi-agent analysis network with all specialists
    const analysisNetworkId = await this.multiAgentCoordinator.setupNetwork(
      'devops-analysis-team',
      [
        { id: 'code-reviewer', type: 'CodeReviewerAgent' },
        { id: 'deployment-manager', type: 'DeploymentManagerAgent' },
        { id: 'infrastructure-security', type: 'InfrastructureSecurityAgent' },
      ],
      'supervisor', // Sequential workflow for comprehensive analysis
      {
        systemPrompt: `Coordinate comprehensive DevOps analysis:
        1. Code Review Agent analyzes code quality and security
        2. Deployment Manager creates deployment strategy
        3. Infrastructure Security validates compliance
        Ensure all security and quality gates are met.`,
        workers: ['code-reviewer', 'deployment-manager', 'infrastructure-security'],
        enableForwardMessage: true,
        removeHandoffMessages: false, // Keep full analysis trail
        messageHistory: { maxMessages: 50 },
      }
    );

    const analysisPrompt = this.buildAnalysisPrompt(state);

    const analysisResult = await this.multiAgentCoordinator.executeSimpleWorkflow(
      analysisNetworkId,
      analysisPrompt
    );

    // Calculate combined confidence with security weighting
    const codeConfidence = analysisResult.finalState.metadata.codeAnalysis?.confidence || 0;
    const deploymentConfidence = analysisResult.finalState.metadata.deploymentPlan?.confidence || 0;
    const securityConfidence = analysisResult.finalState.metadata.securityAssessment?.confidence || 0;

    // Security has higher weight in confidence calculation
    const combinedConfidence = codeConfidence * 0.3 + deploymentConfidence * 0.3 + securityConfidence * 0.4;

    return {
      codeAnalysis: analysisResult.finalState.metadata.codeAnalysis,
      deploymentPlan: analysisResult.finalState.metadata.deploymentPlan,
      securityAssessment: analysisResult.finalState.metadata.securityAssessment,
      confidence: combinedConfidence,
      analysisComplete: true,
      overallRisk: this.calculateOverallRisk(analysisResult.finalState.metadata),
      metadata: {
        ...state.metadata,
        analysisCompleted: true,
        agentInteractions: analysisResult.finalState.messages.length,
        analysisExecutionTime: Date.now() - state.startTime.getTime(),
      },
    } satisfies Partial<DevOpsState>;
  }

  @Node({
    type: 'standard',
    description: 'Automated build and comprehensive testing',
    timeout: 900000, // 15 minutes for build and test
  })
  async executeBuildAndTest(state: DevOpsState): Promise<Partial<DevOpsState>> {
    // Execute build
    const buildResult = await this.buildService.executeBuild({
      repository: state.repositoryUrl,
      branch: state.branch,
      buildConfig: this.getBuildConfig(state.repositoryContext),
      cacheEnabled: true,
      parallelBuilds: true,
    });

    if (!buildResult.success) {
      return {
        status: 'build_failed',
        buildResult,
        confidence: 0,
        metadata: {
          ...state.metadata,
          buildFailed: true,
          buildError: buildResult.error,
        },
      } satisfies Partial<DevOpsState>;
    }

    // Execute comprehensive test suite
    const testResult = await this.testService.runComprehensiveTests({
      buildId: buildResult.buildId,
      testSuites: ['unit', 'integration', 'security', 'performance'],
      parallelExecution: true,
      generateReports: true,
      coverageThreshold: state.targetEnvironment === 'production' ? 0.8 : 0.7,
    });

    // Calculate test confidence
    const testConfidence = this.calculateTestConfidence(testResult);

    return {
      buildResult,
      testResult,
      confidence: testConfidence,
      status: testResult.success ? 'tests_passed' : 'tests_failed',
      qualityGate: this.evaluateQualityGate(buildResult, testResult, state.codeAnalysis),
      metadata: {
        ...state.metadata,
        buildCompleted: true,
        testsCompleted: true,
        buildDuration: buildResult.duration,
        testDuration: testResult.duration,
      },
    } satisfies Partial<DevOpsState>;
  }

  @Node({
    type: 'llm',
    description: 'Production deployment with comprehensive approval',
    timeout: 300000,
  })
  @RequiresApproval({
    when: (state) => {
      const isProduction = state.targetEnvironment === 'production';
      const hasSecurityIssues = (state.securityAssessment?.vulnerabilities?.critical || 0) > 0;
      const lowConfidence = (state.confidence || 0) < 0.9;
      const highRisk = state.overallRisk === 'high' || state.overallRisk === 'critical';

      return isProduction || hasSecurityIssues || lowConfidence || highRisk;
    },
    confidenceThreshold: 0.9,
    riskThreshold: ApprovalRiskLevel.HIGH,
    message: (state) => {
      const env = state.targetEnvironment;
      const services = state.deploymentPlan?.services?.length || 0;
      const risk = state.overallRisk;
      return `Deploy to ${env}: ${services} services affected (Risk: ${risk})`;
    },
    timeoutMs: 1800000, // 30 minutes for deployment decisions
    onTimeout: 'reject', // Never auto-deploy without approval
    chainId: 'production-deployment',
    escalationStrategy: EscalationStrategy.CHAIN,
    riskAssessment: {
      enabled: true,
      factors: ['code_quality', 'security_vulnerabilities', 'test_coverage', 'deployment_complexity', 'rollback_capability', 'business_impact'],
      evaluator: (state) => {
        const deploymentRisk = this.calculateDeploymentRisk(state);
        return {
          level: deploymentRisk.score > 8 ? ApprovalRiskLevel.CRITICAL : deploymentRisk.score > 6 ? ApprovalRiskLevel.HIGH : deploymentRisk.score > 4 ? ApprovalRiskLevel.MEDIUM : ApprovalRiskLevel.LOW,
          factors: [`Code quality: ${state.codeAnalysis?.overallScore}/10`, `Security vulnerabilities: ${state.securityAssessment?.vulnerabilities?.critical || 0} critical`, `Test coverage: ${((state.testResult?.coverage || 0) * 100).toFixed(1)}%`, `Deployment complexity: ${state.deploymentPlan?.riskAssessment?.level}`, `Rollback capability: ${state.deploymentPlan?.rollbackPlan ? 'Available' : 'Limited'}`, ...deploymentRisk.factors],
          score: deploymentRisk.score,
        };
      },
    },
    skipConditions: {
      highConfidence: 0.95,
      userRole: ['devops-lead', 'platform-engineer', 'sre'],
      custom: (state) => {
        // Skip for low-risk deployments to non-production environments
        return state.targetEnvironment !== 'production' && state.overallRisk === 'low' && (state.confidence || 0) >= 0.9 && (state.securityAssessment?.vulnerabilities?.critical || 0) === 0;
      },
    },
    handlers: {
      beforeApproval: async (state) => {
        // Pre-deployment validation
        await this.validateDeploymentReadiness(state);
        await this.checkEnvironmentHealth(state.targetEnvironment);
        await this.verifyRollbackCapability(state.deploymentPlan);
      },
      afterApproval: async (state, approved) => {
        if (approved) {
          await this.logDeploymentApproval(state);
          await this.notifyStakeholders(state, 'deployment_approved');
          await this.setupDeploymentMonitoring(state);
        } else {
          await this.logDeploymentRejection(state);
          await this.notifyStakeholders(state, 'deployment_rejected');
        }
      },
    },
  })
  async executeDeployment(state: DevOpsState): Promise<Partial<DevOpsState>> {
    // Create platform thread for comprehensive deployment audit trail
    const platformThread = await this.platformClient.post('/threads', {
      metadata: {
        deployment_id: state.deploymentPlan.id,
        environment: state.targetEnvironment,
        services: state.deploymentPlan.services,
        pipeline_id: state.pipelineId,
        build_id: state.buildResult.buildId,
        test_results: state.testResult.summary,
        security_assessment: state.securityAssessment.overallCompliance,
        approval_metadata: state.approvalRequest,
      },
    });

    // Execute deployment through platform for complete audit trail
    const deploymentExecution = await this.platformClient.post(`/threads/${platformThread.thread_id}/runs`, {
      assistant_id: 'production-deployment-assistant',
      input: {
        deploymentPlan: state.deploymentPlan,
        buildArtifacts: {
          buildId: state.buildResult.buildId,
          artifactUrls: state.buildResult.artifacts,
          imageRegistry: state.buildResult.containerImages,
        },
        securityClearance: {
          complianceStatus: state.securityAssessment.overallCompliance,
          vulnerabilityStatus: state.securityAssessment.vulnerabilities,
          approvalChain: state.approvalRequest,
        },
        monitoringConfig: state.deploymentPlan.monitoring,
        rollbackPlan: state.deploymentPlan.rollbackPlan,
      },
      stream_mode: 'values',
      config: {
        tags: ['production-deployment', 'ai-approved'],
        metadata: {
          riskLevel: state.overallRisk,
          confidence: state.confidence,
        },
      },
    });

    // Monitor deployment progress
    const deploymentResult = await this.monitorDeploymentExecution(platformThread.thread_id, deploymentExecution.run_id, state.deploymentPlan.timeline.estimatedDuration);

    return {
      deploymentExecution: {
        platformThreadId: platformThread.thread_id,
        runId: deploymentExecution.run_id,
        status: deploymentResult.status,
        deployedServices: deploymentResult.deployedServices,
        deploymentTime: deploymentResult.duration,
        healthChecksPassed: deploymentResult.healthChecks,
        monitoringActive: deploymentResult.monitoring,
      },
      status: deploymentResult.status === 'success' ? 'deployed_successfully' : 'deployment_failed',
      deployedAt: new Date(),
      metadata: {
        ...state.metadata,
        platformExecution: true,
        auditTrailAvailable: true,
        deploymentCompleted: true,
      },
    } satisfies Partial<DevOpsState>;
  }

  @Node({
    type: 'standard',
    description: 'Post-deployment verification and monitoring setup',
    timeout: 300000,
  })
  async postDeploymentVerification(state: DevOpsState): Promise<Partial<DevOpsState>> {
    // Comprehensive post-deployment verification
    const verificationResults = await this.performPostDeploymentVerification(state.deploymentExecution, state.deploymentPlan, state.targetEnvironment);

    // Setup long-term monitoring
    const monitoringSetup = await this.setupLongTermMonitoring(state.deploymentPlan.services, state.targetEnvironment);

    return {
      verificationResults,
      monitoringSetup,
      status: verificationResults.allPassed ? 'deployment_verified' : 'verification_failed',
      metadata: {
        ...state.metadata,
        verificationCompleted: true,
        monitoringActive: monitoringSetup.active,
        pipelineCompleted: true,
      },
    } satisfies Partial<DevOpsState>;
  }

  // Edge definitions
  @Edge('initializePipeline', 'performComprehensiveAnalysis')
  startAnalysis() {}

  @ConditionalEdge('performComprehensiveAnalysis', {
    proceed: 'executeBuildAndTest',
    security_issues: 'securityRemediation',
    quality_gate_failed: 'codeQualityReview',
    high_risk: 'riskAssessmentReview',
  })
  routeBasedOnAnalysis(state: DevOpsState): string {
    const securityIssues = state.securityAssessment?.vulnerabilities?.critical || 0;
    const codeQuality = state.codeAnalysis?.overallScore || 0;
    const overallRisk = state.overallRisk;

    if (securityIssues > 0) return 'security_issues';
    if (codeQuality < 7) return 'quality_gate_failed';
    if (overallRisk === 'high' || overallRisk === 'critical') return 'high_risk';
    return 'proceed';
  }

  @ConditionalEdge('executeBuildAndTest', {
    tests_passed: 'executeDeployment',
    tests_failed: 'testRemediation',
    build_failed: 'buildTroubleshooting',
  })
  routeBasedOnBuildAndTest(state: DevOpsState): string {
    if (state.status === 'build_failed') return 'build_failed';
    if (state.status === 'tests_failed') return 'tests_failed';
    return 'tests_passed';
  }

  @ConditionalEdge('executeDeployment', {
    success: 'postDeploymentVerification',
    failed: 'deploymentRollback',
    partial: 'deploymentTroubleshooting',
  })
  routeBasedOnDeployment(state: DevOpsState): string {
    const deploymentStatus = state.deploymentExecution?.status;

    if (deploymentStatus === 'success') return 'success';
    if (deploymentStatus === 'failed') return 'failed';
    return 'partial';
  }

  @Edge('postDeploymentVerification', 'END')
  completeWorkflow() {}

  // Helper methods
  private buildAnalysisPrompt(state: DevOpsState): string {
    const changes = state.codeChanges?.length || 0;
    const environment = state.targetEnvironment;
    const branch = state.branch;

    return `DevOps Pipeline Analysis Request:

Repository: ${state.repositoryUrl}
Branch: ${branch}
Target Environment: ${environment}
Code Changes: ${changes} files modified
Infrastructure: ${JSON.stringify(state.infrastructureContext?.summary)}

Perform comprehensive analysis including:
1. Code quality and security review
2. Deployment strategy and risk assessment  
3. Infrastructure security and compliance validation

Focus on ${environment} deployment requirements and provide detailed risk assessment.`;
  }

  private calculateOverallRisk(analysisMetadata: any): 'low' | 'medium' | 'high' | 'critical' {
    const codeRisk = analysisMetadata.codeAnalysis?.riskLevel || 'low';
    const securityRisk = analysisMetadata.securityAssessment?.vulnerabilities?.critical > 0 ? 'high' : 'low';
    const deploymentRisk = analysisMetadata.deploymentPlan?.riskAssessment?.level || 'low';

    const riskScores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const maxRisk = Math.max(riskScores[codeRisk], riskScores[securityRisk], riskScores[deploymentRisk]);

    const riskLevels = ['low', 'medium', 'high', 'critical'];
    return riskLevels[maxRisk - 1] as any;
  }

  private calculateDeploymentRisk(state: DevOpsState): { score: number; factors: string[] } {
    let score = 0;
    const factors = [];

    // Environment risk
    if (state.targetEnvironment === 'production') {
      score += 3;
      factors.push('Production environment deployment');
    }

    // Security vulnerabilities
    const criticalVulns = state.securityAssessment?.vulnerabilities?.critical || 0;
    if (criticalVulns > 0) {
      score += 4;
      factors.push(`${criticalVulns} critical security vulnerabilities`);
    }

    // Code quality
    const codeQuality = state.codeAnalysis?.overallScore || 10;
    if (codeQuality < 7) {
      score += 2;
      factors.push('Below-threshold code quality');
    }

    // Test coverage
    const coverage = state.testResult?.coverage || 1;
    if (coverage < 0.8) {
      score += 2;
      factors.push('Insufficient test coverage');
    }

    // Rollback complexity
    if (!state.deploymentPlan?.rollbackPlan) {
      score += 3;
      factors.push('No automated rollback capability');
    }

    return { score, factors };
  }

  private async monitorDeploymentExecution(threadId: string, runId: string, timeoutMs: number): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const run = await this.platformClient.get(`/threads/${threadId}/runs/${runId}`);

      if (run.status === 'success' || run.status === 'error') {
        return run.output || { status: run.status };
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error('Deployment monitoring timeout');
  }
}

// Note: For streaming/checkpoint metadata, use project-standard generic metadata types
// to ensure strict typing of streamed events and recovery checkpoints throughout the pipeline.

## References

- See the [LangGraph Modules Integration Guide](./LANGGRAPH_MODULES_INTEGRATION_GUIDE.md) for unified decorator composition and AgentWorkflowBridgeService patterns
```

### 3. Integration Service

```typescript
@Injectable()
export class DevOpsAutomationService {
  constructor(private readonly workflowManager: WorkflowManagerService, private readonly approvalService: HumanApprovalService, private readonly platformClient: PlatformClientService, private readonly gitService: GitService, private readonly notificationService: NotificationService) {}

  async triggerCICDPipeline(pipelineConfig: PipelineConfig): Promise<DeploymentResult> {
    try {
      // Prepare initial DevOps state
      const initialState: Partial<DevOpsState> = {
        repositoryUrl: pipelineConfig.repository,
        branch: pipelineConfig.branch,
        targetEnvironment: pipelineConfig.environment,
        userId: pipelineConfig.triggeredBy,
        triggerEvent: pipelineConfig.trigger || 'manual',
        codeChanges: await this.getCodeChanges(pipelineConfig.repository, pipelineConfig.branch, pipelineConfig.baseBranch),
      };

      // Execute CI/CD workflow
      const result = await this.workflowManager.executeWorkflow('devops-cicd-pipeline', initialState, {
        streaming: true,
        timeout: 3600000, // 1 hour maximum
        metadata: {
          triggeredBy: pipelineConfig.triggeredBy,
          triggerType: pipelineConfig.trigger,
          environmentTarget: pipelineConfig.environment,
        },
      });

      // Process results
      const deploymentResult: DeploymentResult = {
        success: result.success,
        pipelineId: result.data.pipelineId,
        deploymentId: result.data.deploymentPlan?.id,
        buildId: result.data.buildResult?.buildId,
        environment: pipelineConfig.environment,
        deploymentStatus: result.data.status,
        platformThreadId: result.data.deploymentExecution?.platformThreadId,
        verificationResults: result.data.verificationResults,
        metrics: {
          totalDuration: result.metadata.executionTime,
          buildDuration: result.data.buildResult?.duration,
          testDuration: result.data.testResult?.duration,
          deploymentDuration: result.data.deploymentExecution?.deploymentTime,
        },
        qualityGate: result.data.qualityGate,
        securityAssessment: result.data.securityAssessment,
        auditTrail: result.data.platformThreadId
          ? {
              platformThreadId: result.data.deploymentExecution.platformThreadId,
              available: true,
            }
          : null,
      };

      // Send notifications
      await this.sendPipelineNotifications(deploymentResult, pipelineConfig);

      return deploymentResult;
    } catch (error) {
      await this.handlePipelineError(error, pipelineConfig);
      throw new Error(`CI/CD pipeline execution failed: ${error.message}`);
    }
  }

  async getPipelineStatus(pipelineId: string): Promise<PipelineStatus> {
    return await this.workflowManager.getWorkflowStatus(pipelineId);
  }

  async cancelPipeline(pipelineId: string, reason: string): Promise<void> {
    await this.workflowManager.cancelWorkflow(pipelineId);
    await this.notificationService.notifyTeam({
      type: 'pipeline_cancelled',
      pipelineId,
      reason,
    });
  }

  async getDeploymentMetrics(environmentName: string, timeRange: string): Promise<DeploymentMetrics> {
    // Aggregate deployment metrics from platform and workflow history
    const workflows = await this.workflowManager.getWorkflowHistory('devops-cicd-pipeline');

    const environmentDeployments = workflows.filter((w) => w.metadata?.environmentTarget === environmentName && this.isWithinTimeRange(w.startTime, timeRange));

    return {
      environment: environmentName,
      totalDeployments: environmentDeployments.length,
      successfulDeployments: environmentDeployments.filter((d) => d.status === 'completed').length,
      failedDeployments: environmentDeployments.filter((d) => d.status === 'failed').length,
      averageDuration: this.calculateAverageDuration(environmentDeployments),
      deploymentFrequency: this.calculateDeploymentFrequency(environmentDeployments, timeRange),
      qualityMetrics: {
        averageTestCoverage: this.calculateAverageTestCoverage(environmentDeployments),
        securityIssuesFound: this.countSecurityIssues(environmentDeployments),
        codeQualityScore: this.calculateAverageCodeQuality(environmentDeployments),
      },
    };
  }

  private async getCodeChanges(repository: string, branch: string, baseBranch: string = 'main'): Promise<CodeChange[]> {
    return await this.gitService.getChanges(repository, baseBranch, branch);
  }

  private async sendPipelineNotifications(result: DeploymentResult, config: PipelineConfig): Promise<void> {
    const notification = {
      type: result.success ? 'deployment_success' : 'deployment_failure',
      pipelineId: result.pipelineId,
      environment: result.environment,
      repository: config.repository,
      branch: config.branch,
      triggeredBy: config.triggeredBy,
      duration: result.metrics.totalDuration,
      platformAuditTrail: result.auditTrail?.available,
    };

    await this.notificationService.sendToSlack(notification);
    await this.notificationService.sendEmail(notification, config.notificationRecipients);
  }

  private async handlePipelineError(error: Error, config: PipelineConfig): Promise<void> {
    console.error(`Pipeline error for ${config.repository}:${config.branch}:`, error);

    await this.notificationService.notifyDevOpsTeam({
      type: 'pipeline_error',
      repository: config.repository,
      branch: config.branch,
      environment: config.environment,
      error: error.message,
      requiresAttention: true,
    });
  }
}
```

## Configuration

### Module Setup

```typescript
@Module({
  imports: [
    WorkflowEngineModule.forRoot({
      compilation: { cacheEnabled: true, optimizeGraphs: true },
      execution: { streamingEnabled: true, maxConcurrency: 3 },
    }),
    FunctionalApiModule.forRoot({
      enableStreaming: true,
      enableCheckpointing: true,
      defaultTimeout: 600000, // 10 minutes
    }),
    MultiAgentModule.forRoot({
      agents: [CodeReviewerAgent, DeploymentManagerAgent, InfrastructureSecurityAgent],
      defaultLlm: { provider: 'openai', model: 'gpt-4' },
    }),
    HitlModule.forRoot({
      enabled: true,
      confidenceThreshold: 0.85,
      approvalChains: {
        'production-deployment': {
          levels: [
            { role: 'devops-engineer', required: 1, timeoutMs: 1800000 },
            { role: 'platform-engineer', required: 1, timeoutMs: 3600000 },
            { role: 'sre-lead', required: 1, escalationOnly: true },
          ],
        },
      },
    }),
    PlatformModule.forRoot({
      apiKey: process.env.LANGGRAPH_API_KEY,
      baseUrl: 'https://api.langgraph.com',
    }),
  ],
  providers: [DevOpsAutomationService, CodeReviewerAgent, DeploymentManagerAgent, InfrastructureSecurityAgent, DevOpsCICDWorkflow],
})
export class DevOpsModule {}
```

## Key Features

1. **Multi-Agent Code Analysis**: Comprehensive code review, security scanning, and deployment planning
2. **Security-First Approach**: Infrastructure security validation and compliance checking
3. **Risk-Based Approvals**: Intelligent approval routing based on deployment risk and environment
4. **Platform Integration**: Complete audit trail through LangGraph Platform
5. **Comprehensive Testing**: Automated build, test, and quality gate enforcement
6. **Rollback Capabilities**: Automated rollback plan generation and execution
7. **Real-time Monitoring**: Deployment monitoring and post-deployment verification

## Usage Example

```typescript
const devopsService = new DevOpsAutomationService(/* dependencies */);

const deploymentResult = await devopsService.triggerCICDPipeline({
  repository: 'https://github.com/company/api-service',
  branch: 'feature/new-endpoints',
  baseBranch: 'main',
  environment: 'production',
  trigger: 'pull_request_merge',
  triggeredBy: 'john.doe@company.com',
  notificationRecipients: ['devops-team@company.com'],
});

console.log('Deployment result:', deploymentResult);
```

This DevOps automation system demonstrates sophisticated CI/CD orchestration with comprehensive security analysis, quality gates, and human oversight for safe software delivery.
