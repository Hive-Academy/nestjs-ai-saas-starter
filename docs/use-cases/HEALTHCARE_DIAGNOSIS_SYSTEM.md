# Healthcare Diagnosis & Treatment Planning System

## Overview

This use case demonstrates an AI-powered medical diagnosis system that combines symptom analysis, diagnostic reasoning, and physician oversight for safe medical decision-making.

**Modules Used**: workflow-engine + functional-api + multi-agent + hitl

## System Architecture

```
Patient Symptoms → AI Medical Agents → Diagnostic Assessment → Physician Review → Treatment Plan
      ↓                ↓                      ↓                    ↓              ↓
   Symptom Input    Multi-Agent         Risk Assessment     Approval Chain    Care Protocol
    & History       Analysis           & Confidence        Management        Implementation
```

## Implementation

### 1. Medical Specialist Agents

#### Symptom Analyzer Agent

```typescript
@Agent({
  id: 'symptom-analyzer',
  name: 'Symptom Analysis Specialist',
  capabilities: ['symptom_analysis', 'differential_diagnosis', 'medical_history_review'],
  tools: ['medical_database', 'symptom_checker', 'drug_interaction_checker'],
  priority: 'high',
  executionTime: 'medium',
})
@Injectable()
export class SymptomAnalyzerAgent {
  constructor(private readonly medicalDatabaseService: MedicalDatabaseService, private readonly symptomAnalysisService: SymptomAnalysisService, private readonly drugInteractionService: DrugInteractionService) {}

  async nodeFunction(state: MedicalState): Promise<Partial<MedicalState>> {
    const analysis = await this.analyzePatientSymptoms(state.patientSymptoms, state.patientHistory, state.vitalSigns);

    return {
      messages: [new AIMessage(`Symptom analysis complete: ${analysis.primaryConcerns.join(', ')}`)],
      symptomAnalysis: {
        primarySymptoms: analysis.primarySymptoms,
        secondarySymptoms: analysis.secondarySymptoms,
        symptomClusters: analysis.clusters,
        temporalPattern: analysis.timeline,
        severity: analysis.severity,
        redFlags: analysis.redFlags,
        differentialDiagnosis: analysis.differentialDx,
      },
      confidence: analysis.confidence,
      riskFactors: analysis.identifiedRisks,
    };
  }

  @Tool({
    name: 'search_medical_literature',
    description: 'Search peer-reviewed medical literature for symptom patterns',
    schema: z.object({
      symptoms: z.array(z.string()),
      patientAge: z.number(),
      gender: z.enum(['male', 'female', 'other']),
      comorbidities: z.array(z.string()).optional(),
    }),
  })
  @RequiresApproval({
    confidenceThreshold: 0.7,
    message: 'Access external medical databases for rare condition research?',
    timeoutMs: 600000, // 10 minutes
    onTimeout: 'reject',
  })
  async searchMedicalLiterature({ symptoms, patientAge, gender, comorbidities }: { symptoms: string[]; patientAge: number; gender: 'male' | 'female' | 'other'; comorbidities?: string[] }) {
    const searchCriteria = {
      symptoms: symptoms.join(' AND '),
      demographics: { age: patientAge, gender },
      comorbidities: comorbidities || [],
    };

    return await this.medicalDatabaseService.searchLiterature(searchCriteria);
  }

  @Tool({
    name: 'check_drug_interactions',
    description: 'Check for potential drug interactions with current medications',
    schema: z.object({
      currentMedications: z.array(z.string()),
      proposedMedications: z.array(z.string()),
    }),
  })
  async checkDrugInteractions({ currentMedications, proposedMedications }: { currentMedications: string[]; proposedMedications: string[] }) {
    return await this.drugInteractionService.checkInteractions(currentMedications, proposedMedications);
  }

  @Tool({
    name: 'assess_symptom_urgency',
    description: 'Assess the urgency level of presented symptoms',
    schema: z.object({
      symptoms: z.array(
        z.object({
          name: z.string(),
          severity: z.number().min(1).max(10),
          duration: z.string(),
          progression: z.enum(['improving', 'stable', 'worsening']),
        })
      ),
      vitalSigns: z
        .object({
          bloodPressure: z.string().optional(),
          heartRate: z.number().optional(),
          temperature: z.number().optional(),
          oxygenSaturation: z.number().optional(),
        })
        .optional(),
    }),
  })
  async assessSymptomUrgency({
    symptoms,
    vitalSigns,
  }: {
    symptoms: Array<{
      name: string;
      severity: number;
      duration: string;
      progression: 'improving' | 'stable' | 'worsening';
    }>;
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
    };
  }) {
    const urgencyFactors = {
      symptomSeverity: Math.max(...symptoms.map((s) => s.severity)),
      worseningSymptoms: symptoms.filter((s) => s.progression === 'worsening').length,
      vitalSignsAbnormal: this.checkVitalSigns(vitalSigns),
      redFlagSymptoms: this.identifyRedFlags(symptoms),
    };

    return {
      urgencyLevel: this.calculateUrgency(urgencyFactors),
      reasoning: this.explainUrgencyReasoning(urgencyFactors),
      recommendedTimeframe: this.getRecommendedTimeframe(urgencyFactors),
    };
  }

  private async analyzePatientSymptoms(symptoms: PatientSymptom[], history: PatientHistory, vitals: VitalSigns) {
    // Advanced symptom analysis
    const symptomClusters = await this.clusterSymptoms(symptoms);
    const temporalAnalysis = this.analyzeSymptomTimeline(symptoms);
    const riskAssessment = await this.assessPatientRisk(symptoms, history, vitals);

    // Generate differential diagnosis
    const differentialDx = await this.generateDifferentialDiagnosis(symptomClusters, history, vitals);

    const confidence = this.calculateDiagnosticConfidence(symptoms, differentialDx, riskAssessment);

    return {
      primarySymptoms: symptoms.filter((s) => s.severity >= 7),
      secondarySymptoms: symptoms.filter((s) => s.severity < 7),
      clusters: symptomClusters,
      timeline: temporalAnalysis,
      severity: Math.max(...symptoms.map((s) => s.severity)),
      redFlags: this.identifyRedFlags(symptoms),
      differentialDx,
      confidence,
      identifiedRisks: riskAssessment.factors,
      primaryConcerns: differentialDx.slice(0, 3).map((dx) => dx.condition),
    };
  }
}
```

#### Diagnostician Agent

```typescript
@Agent({
  id: 'diagnostician',
  name: 'Diagnostic Specialist',
  capabilities: ['diagnosis', 'test_recommendation', 'clinical_reasoning'],
  tools: ['diagnostic_guidelines', 'test_protocols', 'clinical_decision_support'],
  priority: 'critical',
  executionTime: 'medium',
})
@Injectable()
export class DiagnosticianAgent {
  constructor(private readonly diagnosticGuidelinesService: DiagnosticGuidelinesService, private readonly clinicalDecisionService: ClinicalDecisionSupportService, private readonly testRecommendationService: TestRecommendationService) {}

  async nodeFunction(state: MedicalState): Promise<Partial<MedicalState>> {
    const diagnosticAssessment = await this.performComprehensiveDiagnosis(state.symptomAnalysis, state.patientHistory, state.physicalExam);

    return {
      messages: [new AIMessage(`Diagnostic assessment complete: Primary diagnosis - ${diagnosticAssessment.primaryDiagnosis.name}`)],
      diagnosticAssessment,
      confidence: diagnosticAssessment.confidence,
      recommendedTests: diagnosticAssessment.recommendedTests,
      treatmentUrgency: diagnosticAssessment.urgency,
    };
  }

  @Tool({
    name: 'apply_diagnostic_criteria',
    description: 'Apply established diagnostic criteria to patient presentation',
    schema: z.object({
      condition: z.string(),
      symptoms: z.array(z.string()),
      signs: z.array(z.string()),
      labResults: z.record(z.any()).optional(),
    }),
  })
  async applyDiagnosticCriteria({ condition, symptoms, signs, labResults }: { condition: string; symptoms: string[]; signs: string[]; labResults?: Record<string, any> }) {
    return await this.diagnosticGuidelinesService.applyCriteria(condition, { symptoms, signs, labResults });
  }

  @Tool({
    name: 'recommend_diagnostic_tests',
    description: 'Recommend appropriate diagnostic tests based on clinical presentation',
    schema: z.object({
      suspectedConditions: z.array(z.string()),
      patientFactors: z.object({
        age: z.number(),
        comorbidities: z.array(z.string()),
        currentMedications: z.array(z.string()),
        allergies: z.array(z.string()),
      }),
      urgency: z.enum(['routine', 'urgent', 'emergency']),
    }),
  })
  @RequiresApproval({
    when: (state) => {
      const testCost = state.metadata?.estimatedTestCost || 0;
      return testCost > 5000; // High-cost testing requires approval
    },
    message: 'Approve high-cost diagnostic testing panel?',
  })
  async recommendDiagnosticTests({
    suspectedConditions,
    patientFactors,
    urgency,
  }: {
    suspectedConditions: string[];
    patientFactors: {
      age: number;
      comorbidities: string[];
      currentMedications: string[];
      allergies: string[];
    };
    urgency: 'routine' | 'urgent' | 'emergency';
  }) {
    const recommendations = await this.testRecommendationService.recommend({
      conditions: suspectedConditions,
      patient: patientFactors,
      urgency,
    });

    return {
      recommendedTests: recommendations.tests,
      priorityOrder: recommendations.priority,
      estimatedCost: recommendations.totalCost,
      expectedTurnaround: recommendations.turnaroundTime,
      alternatives: recommendations.alternativeApproaches,
    };
  }

  @Tool({
    name: 'calculate_disease_probability',
    description: 'Calculate probability scores for differential diagnoses',
    schema: z.object({
      differentialDiagnosis: z.array(
        z.object({
          condition: z.string(),
          supportingFindings: z.array(z.string()),
          contradictingFindings: z.array(z.string()),
        })
      ),
      populationPrevalence: z.record(z.number()).optional(),
    }),
  })
  async calculateDiseaseProbability({
    differentialDiagnosis,
    populationPrevalence,
  }: {
    differentialDiagnosis: Array<{
      condition: string;
      supportingFindings: string[];
      contradictingFindings: string[];
    }>;
    populationPrevalence?: Record<string, number>;
  }) {
    return await this.clinicalDecisionService.calculateProbabilities(differentialDiagnosis, populationPrevalence);
  }

  private async performComprehensiveDiagnosis(symptomAnalysis: SymptomAnalysis, patientHistory: PatientHistory, physicalExam: PhysicalExam) {
    // Integrate all available clinical data
    const clinicalPicture = this.integrateClinicalData(symptomAnalysis, patientHistory, physicalExam);

    // Apply clinical reasoning
    const diagnosticReasoning = await this.applyDiagnosticReasoning(clinicalPicture);

    // Calculate disease probabilities
    const probabilityScores = await this.calculateDiseaseProbabilities(diagnosticReasoning.differentialDx);

    // Determine primary diagnosis
    const primaryDiagnosis = probabilityScores[0];

    // Assess confidence and risk
    const confidence = this.assessDiagnosticConfidence(primaryDiagnosis, clinicalPicture);

    const riskLevel = this.assessPatientRisk(primaryDiagnosis, patientHistory);

    // Generate test recommendations
    const recommendedTests = await this.generateTestRecommendations(diagnosticReasoning.differentialDx.slice(0, 3));

    return {
      primaryDiagnosis: {
        name: primaryDiagnosis.condition,
        probability: primaryDiagnosis.probability,
        confidence: primaryDiagnosis.confidence,
        supportingEvidence: primaryDiagnosis.supportingFindings,
        contradictingEvidence: primaryDiagnosis.contradictingFindings,
      },
      differentialDiagnosis: probabilityScores.slice(1, 6),
      confidence,
      riskLevel,
      urgency: this.determineUrgency(primaryDiagnosis, riskLevel),
      recommendedTests,
      clinicalReasoning: diagnosticReasoning.reasoning,
      requiresSpecialist: this.determineSpecialistNeed(primaryDiagnosis),
      followUpRecommendations: this.generateFollowUpPlan(primaryDiagnosis),
    };
  }
}
```

#### Treatment Planning Agent

```typescript
@Agent({
  id: 'treatment-planner',
  name: 'Treatment Planning Specialist',
  capabilities: ['treatment_planning', 'medication_selection', 'care_coordination'],
  tools: ['treatment_guidelines', 'medication_database', 'care_protocols'],
  priority: 'high',
})
@Injectable()
export class TreatmentPlannerAgent {
  constructor(private readonly treatmentGuidelinesService: TreatmentGuidelinesService, private readonly medicationService: MedicationService, private readonly careProtocolService: CareProtocolService) {}

  async nodeFunction(state: MedicalState): Promise<Partial<MedicalState>> {
    const treatmentPlan = await this.developTreatmentPlan(state.diagnosticAssessment, state.patientHistory, state.patientPreferences);

    return {
      messages: [new AIMessage(`Treatment plan developed: ${treatmentPlan.primaryTreatment.name}`)],
      treatmentPlan,
      confidence: treatmentPlan.confidence,
    };
  }

  @Tool({
    name: 'select_optimal_medication',
    description: 'Select optimal medication considering patient factors',
    schema: z.object({
      condition: z.string(),
      patientFactors: z.object({
        age: z.number(),
        weight: z.number().optional(),
        kidneyFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
        liverFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
        allergies: z.array(z.string()),
        currentMedications: z.array(z.string()),
      }),
      preferences: z
        .object({
          costSensitive: z.boolean().optional(),
          frequencyPreference: z.enum(['once', 'twice', 'multiple']).optional(),
        })
        .optional(),
    }),
  })
  async selectOptimalMedication({
    condition,
    patientFactors,
    preferences,
  }: {
    condition: string;
    patientFactors: {
      age: number;
      weight?: number;
      kidneyFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
      liverFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
      allergies: string[];
      currentMedications: string[];
    };
    preferences?: {
      costSensitive?: boolean;
      frequencyPreference?: 'once' | 'twice' | 'multiple';
    };
  }) {
    return await this.medicationService.selectOptimalMedication(condition, patientFactors, preferences);
  }

  private async developTreatmentPlan(diagnosis: DiagnosticAssessment, patientHistory: PatientHistory, preferences: PatientPreferences) {
    // Get evidence-based treatment options
    const treatmentOptions = await this.treatmentGuidelinesService.getTreatmentOptions(diagnosis.primaryDiagnosis.name);

    // Consider patient-specific factors
    const filteredOptions = this.filterForPatientFactors(treatmentOptions, patientHistory);

    // Apply patient preferences
    const personalizedOptions = this.applyPatientPreferences(filteredOptions, preferences);

    // Select optimal treatment
    const selectedTreatment = personalizedOptions[0];

    return {
      primaryTreatment: selectedTreatment,
      alternativeTreatments: personalizedOptions.slice(1, 3),
      medication: selectedTreatment.medications,
      monitoring: selectedTreatment.monitoringPlan,
      followUp: selectedTreatment.followUpSchedule,
      confidence: this.calculateTreatmentConfidence(selectedTreatment, diagnosis),
    };
  }
}
```

### 2. Medical Diagnosis Workflow

```typescript
@Workflow({
  name: 'medical-diagnosis-workflow',
  description: 'AI-assisted medical diagnosis with physician oversight',
  streaming: true,
  hitl: { enabled: true },
  confidenceThreshold: 0.9,
  cache: false, // Medical data should not be cached
})
export class MedicalDiagnosisWorkflow extends StreamingWorkflowBase<MedicalState> {
  constructor(private readonly multiAgentCoordinator: MultiAgentCoordinatorService, eventEmitter: EventEmitter2, graphBuilder: WorkflowGraphBuilderService, subgraphManager: SubgraphManagerService, metadataProcessor: MetadataProcessorService, streamService?: WorkflowStreamService) {
    super(eventEmitter, graphBuilder, subgraphManager, metadataProcessor, streamService);
  }

  protected readonly workflowConfig = {
    name: 'medical-diagnosis-workflow',
    streaming: true,
    confidenceThreshold: 0.9,
    hitl: {
      enabled: true,
      timeout: 1800000, // 30 minutes
      fallbackStrategy: 'escalate' as const,
    },
  };

  @StartNode({
    description: 'Initialize patient medical assessment',
    timeout: 60000,
  })
  async initializeAssessment(state: MedicalState): Promise<Partial<MedicalState>> {
    const assessmentId = `med_${Date.now()}`;

    // Validate patient data completeness
    const dataCompleteness = this.assessDataCompleteness(state);

    return {
      assessmentId,
      status: 'assessment_started',
      startTime: new Date(),
      patientId: state.patientId,
      dataCompleteness,
      clinicalContext: await this.establishClinicalContext(state),
      metadata: {
        ...state.metadata,
        assessmentInitiated: true,
        clinicalSetting: state.clinicalSetting || 'primary_care',
      },
    };
  }

  @Node({
    type: 'standard',
    description: 'Multi-agent medical analysis',
    timeout: 300000,
  })
  async performMedicalAnalysis(state: MedicalState): Promise<Partial<MedicalState>> {
    // Setup hierarchical medical analysis network
    const medicalNetworkId = await this.multiAgentCoordinator.setupNetwork(
      'medical-analysis-team',
      [
        { id: 'symptom-analyzer', type: 'SymptomAnalyzerAgent' },
        { id: 'diagnostician', type: 'DiagnosticianAgent' },
      ],
      'hierarchical',
      {
        levels: [
          ['diagnostician'], // Senior level - makes final diagnostic decisions
          ['symptom-analyzer'], // Analysis level - processes symptoms and data
        ],
        escalationRules: [
          {
            condition: (state) => {
              const complexity = state.metadata?.clinicalComplexity;
              return complexity === 'high' || complexity === 'rare_disease';
            },
            targetLevel: 0,
            message: 'Complex case requiring senior diagnostic review',
          },
          {
            condition: (state) => {
              const urgency = state.metadata?.urgency;
              return urgency === 'emergency' || urgency === 'critical';
            },
            targetLevel: 0,
            message: 'Emergency case - immediate senior attention required',
          },
        ],
        systemPrompt: `You are coordinating a medical diagnostic team. 
                      Symptom analysis feeds into comprehensive diagnosis.
                      Maintain highest medical standards and patient safety.`,
        messageHistory: {
          maxMessages: 30,
          removeHandoffMessages: false, // Keep full medical reasoning trail
        },
      }
    );

    const analysisPrompt = this.buildMedicalAnalysisPrompt(state);

    const medicalAnalysisResult = await this.multiAgentCoordinator.executeSimpleWorkflow(medicalNetworkId, analysisPrompt);

    // Calculate combined confidence considering medical criticality
    const symptomConfidence = medicalAnalysisResult.finalState.metadata.symptomAnalysis?.confidence || 0;
    const diagnosticConfidence = medicalAnalysisResult.finalState.metadata.diagnosticAssessment?.confidence || 0;

    // Medical confidence calculation is more conservative
    const combinedConfidence = Math.min(symptomConfidence, diagnosticConfidence) * 0.9;

    return {
      symptomAnalysis: medicalAnalysisResult.finalState.metadata.symptomAnalysis,
      diagnosticAssessment: medicalAnalysisResult.finalState.metadata.diagnosticAssessment,
      confidence: combinedConfidence,
      medicalReasoning: medicalAnalysisResult.finalState.messages,
      clinicalDecisionSupport: {
        recommendedTests: medicalAnalysisResult.finalState.metadata.recommendedTests,
        riskFactors: medicalAnalysisResult.finalState.metadata.riskFactors,
        urgencyLevel: medicalAnalysisResult.finalState.metadata.treatmentUrgency,
      },
      metadata: {
        ...state.metadata,
        analysisCompleted: true,
        agentInteractions: medicalAnalysisResult.finalState.messages.length,
        medicalComplexity: this.assessMedicalComplexity(medicalAnalysisResult.finalState.metadata),
      },
    };
  }

  @Node({
    type: 'llm',
    description: 'Generate treatment plan with physician oversight',
    timeout: 180000,
  })
  @RequiresApproval({
    when: (state) => {
      const diagnosis = state.diagnosticAssessment;
      const riskLevel = diagnosis?.riskLevel;
      const requiresSpecialist = diagnosis?.requiresSpecialist;
      const confidence = state.confidence || 0;

      return riskLevel === 'high' || riskLevel === 'critical' || requiresSpecialist || confidence < 0.85;
    },
    confidenceThreshold: 0.9,
    riskThreshold: ApprovalRiskLevel.HIGH,
    message: (state) => {
      const diagnosis = state.diagnosticAssessment?.primaryDiagnosis;
      const riskLevel = state.diagnosticAssessment?.riskLevel;
      return `Physician review required: ${diagnosis?.name} (Risk: ${riskLevel})`;
    },
    timeoutMs: 1800000, // 30 minutes for medical decisions
    onTimeout: 'escalate',
    chainId: 'medical-approval',
    escalationStrategy: EscalationStrategy.CHAIN,
    riskAssessment: {
      enabled: true,
      factors: ['diagnosis_certainty', 'treatment_complexity', 'patient_risk_factors', 'medication_interactions', 'contraindications'],
      evaluator: (state) => {
        const medicalRisk = this.assessMedicalRisk(state);
        return {
          level: medicalRisk.severity === 'life_threatening' ? ApprovalRiskLevel.CRITICAL : medicalRisk.severity === 'serious' ? ApprovalRiskLevel.HIGH : medicalRisk.severity === 'moderate' ? ApprovalRiskLevel.MEDIUM : ApprovalRiskLevel.LOW,
          factors: [`Diagnostic confidence: ${state.confidence?.toFixed(2) || 'unknown'}`, `Risk level: ${state.diagnosticAssessment?.riskLevel || 'unknown'}`, `Specialist required: ${state.diagnosticAssessment?.requiresSpecialist ? 'Yes' : 'No'}`, ...medicalRisk.factors],
          score: medicalRisk.score,
        };
      },
    },
    skipConditions: {
      highConfidence: 0.95,
      userRole: ['attending_physician', 'specialist'],
      custom: (state) => {
        // Skip for routine, low-risk conditions with high confidence
        const diagnosis = state.diagnosticAssessment;
        const routineConditions = ['common_cold', 'viral_upper_respiratory_infection', 'tension_headache', 'mild_gastroenteritis'];

        return diagnosis?.riskLevel === 'low' && (state.confidence || 0) >= 0.9 && routineConditions.includes(diagnosis?.primaryDiagnosis?.name);
      },
    },
    handlers: {
      beforeApproval: async (state) => {
        // Pre-approval medical validation
        await this.validateMedicalDecision(state);
        await this.checkContraindications(state);
        await this.verifyPatientSafety(state);
      },
      afterApproval: async (state, approved) => {
        if (approved) {
          await this.logMedicalApproval(state);
          await this.notifyHealthcareTeam(state);
          await this.setupPatientMonitoring(state);
        } else {
          await this.logMedicalRejection(state);
          await this.escalateToSpecialist(state);
        }
      },
    },
  })
  async generateTreatmentPlan(state: MedicalState): Promise<Partial<MedicalState>> {
    // Setup treatment planning network
    const treatmentNetworkId = await this.multiAgentCoordinator.setupNetwork('treatment-planning', [{ id: 'treatment-planner', type: 'TreatmentPlannerAgent' }], 'supervisor');

    const treatmentPlanningResult = await this.multiAgentCoordinator.executeSimpleWorkflow(treatmentNetworkId, `Develop treatment plan for: ${state.diagnosticAssessment?.primaryDiagnosis?.name}`);

    const treatmentPlan = treatmentPlanningResult.finalState.metadata.treatmentPlan;

    // Validate treatment plan safety
    const safetyCheck = await this.validateTreatmentSafety(treatmentPlan, state);

    return {
      treatmentPlan: {
        ...treatmentPlan,
        safetyValidation: safetyCheck,
      },
      confidence: treatmentPlan.confidence,
      status: 'treatment_planned',
      nextSteps: {
        immediateActions: treatmentPlan.immediateActions,
        monitoring: treatmentPlan.monitoring,
        followUp: treatmentPlan.followUp,
        patientEducation: treatmentPlan.patientEducation,
      },
      metadata: {
        ...state.metadata,
        treatmentPlanGenerated: true,
        requiresPharmacistReview: this.requiresPharmacistReview(treatmentPlan),
        requiresSpecialistReferral: treatmentPlan.specialistReferral?.required,
      },
    };
  }

  @Node({
    type: 'standard',
    description: 'Finalize care plan and documentation',
    timeout: 120000,
  })
  async finalizeCarePlan(state: MedicalState): Promise<Partial<MedicalState>> {
    const finalCarePlan = await this.assembleFinalCarePlan(state.diagnosticAssessment, state.treatmentPlan, state.patientPreferences);

    // Generate medical documentation
    const medicalDocumentation = await this.generateMedicalDocumentation(state);

    // Setup care coordination
    const careCoordination = await this.setupCareCoordination(finalCarePlan);

    return {
      finalCarePlan,
      medicalDocumentation,
      careCoordination,
      status: 'care_plan_finalized',
      completedAt: new Date(),
      metadata: {
        ...state.metadata,
        carePlanFinalized: true,
        documentationComplete: true,
        careTeamNotified: careCoordination.teamNotified,
      },
    };
  }

  // Edge definitions
  @Edge('initializeAssessment', 'performMedicalAnalysis')
  @ConditionalEdge('initializeAssessment', {
    complete_data: 'performMedicalAnalysis',
    incomplete_data: 'gatherAdditionalData',
    emergency: 'emergencyProtocol',
  })
  checkDataCompleteness(state: MedicalState): string {
    if (state.clinicalContext?.emergencyIndicators?.length > 0) {
      return 'emergency';
    }

    const completeness = state.dataCompleteness?.score || 0;
    return completeness >= 0.8 ? 'complete_data' : 'incomplete_data';
  }

  @ConditionalEdge('performMedicalAnalysis', {
    high_confidence: 'generateTreatmentPlan',
    low_confidence: 'requestAdditionalTests',
    specialist_needed: 'specialistConsultation',
    emergency: 'emergencyProtocol',
  })
  routeBasedOnDiagnosis(state: MedicalState): string {
    const confidence = state.confidence || 0;
    const urgency = state.diagnosticAssessment?.urgency;
    const requiresSpecialist = state.diagnosticAssessment?.requiresSpecialist;

    if (urgency === 'emergency') return 'emergency';
    if (requiresSpecialist) return 'specialist_needed';
    if (confidence >= 0.8) return 'high_confidence';
    return 'low_confidence';
  }

  @Edge('generateTreatmentPlan', 'finalizeCarePlan')
  proceedToFinalization() {}

  // Helper methods
  private buildMedicalAnalysisPrompt(state: MedicalState): string {
    const symptoms = state.patientSymptoms?.map((s) => `${s.name} (severity: ${s.severity})`).join(', ');
    const history = state.patientHistory?.significantHistory?.join(', ') || 'No significant history';

    return `Patient Case Analysis:
    
Chief Complaint: ${state.chiefComplaint}
Present Illness: ${symptoms}
Medical History: ${history}
Vital Signs: ${JSON.stringify(state.vitalSigns)}
Physical Exam: ${state.physicalExam?.findings?.join(', ') || 'Pending'}

Please provide comprehensive symptom analysis and diagnostic assessment.`;
  }

  private assessMedicalRisk(state: MedicalState): { severity: string; factors: string[]; score: number } {
    const factors = [];
    let score = 0;

    // Diagnostic confidence risk
    const confidence = state.confidence || 0;
    if (confidence < 0.7) {
      score += 4;
      factors.push('Low diagnostic confidence');
    }

    // Patient risk factors
    const riskFactors = state.diagnosticAssessment?.riskLevel;
    switch (riskFactors) {
      case 'critical':
        score += 5;
        factors.push('Critical risk patient');
        break;
      case 'high':
        score += 3;
        factors.push('High risk patient');
        break;
      case 'moderate':
        score += 2;
        factors.push('Moderate risk patient');
        break;
    }

    // Treatment complexity
    if (state.treatmentPlan?.complexity === 'high') {
      score += 2;
      factors.push('Complex treatment plan');
    }

    // Medication interactions
    if (state.treatmentPlan?.medication?.interactions?.length > 0) {
      score += 2;
      factors.push('Medication interactions identified');
    }

    let severity = 'low';
    if (score >= 7) severity = 'life_threatening';
    else if (score >= 5) severity = 'serious';
    else if (score >= 3) severity = 'moderate';

    return { severity, factors, score };
  }

  private async validateMedicalDecision(state: MedicalState): Promise<void> {
    // Comprehensive medical validation logic
    const diagnosis = state.diagnosticAssessment;
    const treatmentPlan = state.treatmentPlan;

    // Check for contraindications
    if (treatmentPlan?.medication) {
      const contraindications = await this.checkMedicationContraindications(treatmentPlan.medication, state.patientHistory);

      if (contraindications.length > 0) {
        throw new Error(`Contraindications found: ${contraindications.join(', ')}`);
      }
    }

    // Validate diagnostic criteria
    if (diagnosis?.primaryDiagnosis && diagnosis.confidence < 0.7) {
      throw new Error('Diagnostic confidence below minimum threshold for treatment');
    }
  }
}
```

### 3. Integration Service

```typescript
@Injectable()
export class MedicalDiagnosisService {
  constructor(private readonly workflowManager: WorkflowManagerService, private readonly approvalService: HumanApprovalService, private readonly ehr: ElectronicHealthRecordService, private readonly notificationService: NotificationService) {}

  async processPatientCase(patientCase: PatientCaseInput): Promise<MedicalDiagnosisResult> {
    try {
      // Prepare comprehensive medical state
      const medicalState: Partial<MedicalState> = {
        patientId: patientCase.patientId,
        chiefComplaint: patientCase.chiefComplaint,
        patientSymptoms: patientCase.symptoms,
        patientHistory: await this.ehr.getPatientHistory(patientCase.patientId),
        vitalSigns: patientCase.vitalSigns,
        physicalExam: patientCase.physicalExam,
        clinicalSetting: patientCase.clinicalSetting,
        patientPreferences: await this.ehr.getPatientPreferences(patientCase.patientId),
      };

      // Execute medical diagnosis workflow
      const result = await this.workflowManager.executeWorkflow('medical-diagnosis-workflow', medicalState, {
        streaming: true,
        timeout: 3600000, // 1 hour maximum
        metadata: {
          providerId: patientCase.providerId,
          clinicalSetting: patientCase.clinicalSetting,
          urgency: patientCase.urgency || 'routine',
        },
      });

      // Update EHR with results
      await this.updateElectronicHealthRecord(patientCase.patientId, result.data);

      // Notify healthcare team if needed
      if (result.data.finalCarePlan?.careCoordination?.teamNotification) {
        await this.notifyHealthcareTeam(result.data);
      }

      return {
        success: result.success,
        assessmentId: result.data.assessmentId,
        diagnosis: result.data.diagnosticAssessment,
        treatmentPlan: result.data.treatmentPlan,
        carePlan: result.data.finalCarePlan,
        confidence: result.data.confidence,
        requiresPhysicianReview: result.data.metadata?.requiresApproval || false,
        nextSteps: result.data.nextSteps,
        documentation: result.data.medicalDocumentation,
      };
    } catch (error) {
      // Comprehensive error handling for medical system
      this.handleMedicalError(error, patientCase.patientId);
      throw new Error(`Medical diagnosis processing failed: ${error.message}`);
    }
  }

  async getPatientCarePlan(patientId: string): Promise<PatientCarePlan> {
    return await this.ehr.getCurrentCarePlan(patientId);
  }

  async updateTreatmentProgress(patientId: string, progressUpdate: TreatmentProgressUpdate): Promise<void> {
    await this.ehr.updateTreatmentProgress(patientId, progressUpdate);

    // Trigger care plan adjustment if needed
    if (progressUpdate.requiresAdjustment) {
      await this.triggerCarePlanReview(patientId);
    }
  }

  private async updateElectronicHealthRecord(patientId: string, diagnosisResult: any): Promise<void> {
    const ehrUpdate = {
      diagnosis: diagnosisResult.diagnosticAssessment,
      treatmentPlan: diagnosisResult.treatmentPlan,
      carePlan: diagnosisResult.finalCarePlan,
      assessmentDate: new Date(),
      confidence: diagnosisResult.confidence,
      aiAssisted: true,
    };

    await this.ehr.updatePatientRecord(patientId, ehrUpdate);
  }

  private handleMedicalError(error: Error, patientId: string): void {
    // Log medical errors with appropriate severity
    console.error(`Medical diagnosis error for patient ${patientId}:`, error);

    // Notify medical staff of system errors
    this.notificationService.notifyMedicalStaff({
      type: 'system_error',
      patientId,
      error: error.message,
      requiresImmedateAttention: true,
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
      compilation: { cacheEnabled: false }, // No caching for medical data
      execution: { streamingEnabled: true, maxConcurrency: 3 },
    }),
    FunctionalApiModule.forRoot({
      enableStreaming: true,
      enableCheckpointing: false, // No checkpointing for medical workflows
      defaultTimeout: 600000, // 10 minutes
    }),
    MultiAgentModule.forRoot({
      agents: [SymptomAnalyzerAgent, DiagnosticianAgent, TreatmentPlannerAgent],
      defaultLlm: { provider: 'openai', model: 'gpt-4' },
    }),
    HitlModule.forRoot({
      enabled: true,
      confidenceThreshold: 0.9, // High threshold for medical decisions
      approvalChains: {
        'medical-approval': {
          levels: [
            { role: 'resident', required: 1, timeoutMs: 1800000 },
            { role: 'attending_physician', required: 1, escalationOnly: true },
            { role: 'specialist', required: 1, escalationOnly: true },
          ],
        },
      },
    }),
  ],
  providers: [MedicalDiagnosisService, SymptomAnalyzerAgent, DiagnosticianAgent, TreatmentPlannerAgent, MedicalDiagnosisWorkflow],
})
export class HealthcareModule {}
```

## Key Features

1. **Multi-Agent Medical Analysis**: Specialized agents for symptom analysis and diagnosis
2. **Hierarchical Medical Review**: Structured escalation from residents to specialists
3. **Conservative Confidence Thresholds**: High safety standards for medical decisions
4. **Comprehensive Risk Assessment**: Multi-factor medical risk evaluation
5. **EHR Integration**: Seamless integration with Electronic Health Records
6. **Care Team Coordination**: Automated healthcare team notifications

## Usage Example

```typescript
const medicalService = new MedicalDiagnosisService(/* dependencies */);

const diagnosisResult = await medicalService.processPatientCase({
  patientId: 'patient_12345',
  chiefComplaint: 'Chest pain and shortness of breath',
  symptoms: [
    { name: 'chest_pain', severity: 8, duration: '2 hours' },
    { name: 'shortness_of_breath', severity: 7, duration: '1 hour' },
  ],
  vitalSigns: {
    bloodPressure: '150/95',
    heartRate: 110,
    temperature: 98.6,
    oxygenSaturation: 94,
  },
  clinicalSetting: 'emergency_department',
  providerId: 'dr_smith_md',
  urgency: 'urgent',
});

console.log('Medical diagnosis:', diagnosisResult);
```

This healthcare system demonstrates sophisticated medical AI with proper physician oversight and comprehensive safety measures for clinical decision support.
