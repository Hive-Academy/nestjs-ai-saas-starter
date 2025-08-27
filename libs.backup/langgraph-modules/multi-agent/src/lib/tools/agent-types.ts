/**
 * Enumeration of different agent types used throughout the system
 */
export enum AgentType {
  // Core agent types
  RESEARCHER = 'researcher',
  ANALYST = 'analyst',
  WRITER = 'writer',
  REVIEWER = 'reviewer',

  // Specialized agent types
  DATA_SCIENTIST = 'data_scientist',
  SOFTWARE_ENGINEER = 'software_engineer',
  SENIOR_DEVELOPER = 'senior_developer',
  ARCHITECT = 'architect',

  // Domain-specific agents
  FINANCIAL_ANALYST = 'financial_analyst',
  LEGAL_ADVISOR = 'legal_advisor',
  MEDICAL_EXPERT = 'medical_expert',
  MARKETING_SPECIALIST = 'marketing_specialist',

  // AI/ML specific agents
  ML_ENGINEER = 'ml_engineer',
  AI_TRAINER = 'ai_trainer',
  MODEL_EVALUATOR = 'model_evaluator',

  // General purpose
  ASSISTANT = 'assistant',
  COORDINATOR = 'coordinator',
  SUPERVISOR = 'supervisor',
}

/**
 * Agent capability definitions
 */
export interface AgentCapability {
  readonly type: AgentType;
  readonly name: string;
  readonly description: string;
  readonly skills: readonly string[];
  readonly tools: readonly string[];
}

/**
 * Predefined agent capabilities
 */
export const AGENT_CAPABILITIES: Record<AgentType, AgentCapability> = {
  [AgentType.RESEARCHER]: {
    type: AgentType.RESEARCHER,
    name: 'Research Agent',
    description: 'Specializes in information gathering and research tasks',
    skills: [
      'web_search',
      'data_analysis',
      'fact_checking',
      'source_verification',
    ],
    tools: ['web_search', 'document_retrieval', 'citation_generator'],
  },

  [AgentType.ANALYST]: {
    type: AgentType.ANALYST,
    name: 'Analysis Agent',
    description: 'Focuses on data analysis and pattern recognition',
    skills: [
      'data_analysis',
      'statistical_analysis',
      'trend_identification',
      'reporting',
    ],
    tools: ['data_processor', 'chart_generator', 'statistical_tools'],
  },

  [AgentType.WRITER]: {
    type: AgentType.WRITER,
    name: 'Writing Agent',
    description: 'Specializes in content creation and writing tasks',
    skills: ['content_creation', 'editing', 'proofreading', 'style_adaptation'],
    tools: ['text_generator', 'grammar_checker', 'style_guide'],
  },

  [AgentType.REVIEWER]: {
    type: AgentType.REVIEWER,
    name: 'Review Agent',
    description: 'Focuses on quality assurance and review processes',
    skills: [
      'quality_assessment',
      'error_detection',
      'compliance_checking',
      'feedback_generation',
    ],
    tools: ['quality_checker', 'compliance_validator', 'feedback_generator'],
  },

  [AgentType.DATA_SCIENTIST]: {
    type: AgentType.DATA_SCIENTIST,
    name: 'Data Science Agent',
    description:
      'Specializes in advanced data science and machine learning tasks',
    skills: [
      'machine_learning',
      'statistical_modeling',
      'data_visualization',
      'predictive_analysis',
    ],
    tools: ['ml_frameworks', 'data_visualization', 'statistical_packages'],
  },

  [AgentType.SOFTWARE_ENGINEER]: {
    type: AgentType.SOFTWARE_ENGINEER,
    name: 'Software Engineering Agent',
    description: 'Focuses on software development and engineering tasks',
    skills: ['code_generation', 'debugging', 'testing', 'architecture_design'],
    tools: ['code_generator', 'debugger', 'test_framework', 'linter'],
  },

  [AgentType.SENIOR_DEVELOPER]: {
    type: AgentType.SENIOR_DEVELOPER,
    name: 'Senior Developer Agent',
    description: 'Advanced software development with leadership capabilities',
    skills: [
      'advanced_programming',
      'code_review',
      'mentoring',
      'system_design',
    ],
    tools: ['advanced_ide', 'code_review_tools', 'architecture_tools'],
  },

  [AgentType.ARCHITECT]: {
    type: AgentType.ARCHITECT,
    name: 'Architecture Agent',
    description: 'Specializes in system architecture and design decisions',
    skills: [
      'system_design',
      'architecture_patterns',
      'scalability_planning',
      'technology_selection',
    ],
    tools: ['architecture_tools', 'design_patterns', 'scalability_analyzer'],
  },

  [AgentType.FINANCIAL_ANALYST]: {
    type: AgentType.FINANCIAL_ANALYST,
    name: 'Financial Analysis Agent',
    description: 'Focuses on financial analysis and market research',
    skills: [
      'financial_modeling',
      'market_analysis',
      'risk_assessment',
      'investment_analysis',
    ],
    tools: ['financial_calculator', 'market_data', 'risk_analyzer'],
  },

  [AgentType.LEGAL_ADVISOR]: {
    type: AgentType.LEGAL_ADVISOR,
    name: 'Legal Advisory Agent',
    description: 'Provides legal research and advisory capabilities',
    skills: [
      'legal_research',
      'contract_analysis',
      'compliance_checking',
      'legal_writing',
    ],
    tools: ['legal_database', 'contract_analyzer', 'compliance_checker'],
  },

  [AgentType.MEDICAL_EXPERT]: {
    type: AgentType.MEDICAL_EXPERT,
    name: 'Medical Expert Agent',
    description: 'Specializes in medical information and healthcare analysis',
    skills: [
      'medical_research',
      'diagnosis_support',
      'treatment_analysis',
      'drug_interaction',
    ],
    tools: ['medical_database', 'diagnostic_tools', 'drug_reference'],
  },

  [AgentType.MARKETING_SPECIALIST]: {
    type: AgentType.MARKETING_SPECIALIST,
    name: 'Marketing Specialist Agent',
    description: 'Focuses on marketing strategy and campaign development',
    skills: [
      'market_research',
      'campaign_planning',
      'content_marketing',
      'analytics',
    ],
    tools: ['market_analyzer', 'campaign_planner', 'content_generator'],
  },

  [AgentType.ML_ENGINEER]: {
    type: AgentType.ML_ENGINEER,
    name: 'ML Engineering Agent',
    description: 'Specializes in machine learning engineering and deployment',
    skills: [
      'model_development',
      'ml_pipeline',
      'model_deployment',
      'performance_optimization',
    ],
    tools: ['ml_frameworks', 'pipeline_tools', 'deployment_platforms'],
  },

  [AgentType.AI_TRAINER]: {
    type: AgentType.AI_TRAINER,
    name: 'AI Training Agent',
    description: 'Focuses on AI model training and fine-tuning',
    skills: [
      'model_training',
      'hyperparameter_tuning',
      'data_preparation',
      'training_optimization',
    ],
    tools: [
      'training_frameworks',
      'hyperparameter_optimizer',
      'data_preprocessor',
    ],
  },

  [AgentType.MODEL_EVALUATOR]: {
    type: AgentType.MODEL_EVALUATOR,
    name: 'Model Evaluation Agent',
    description: 'Specializes in AI model evaluation and validation',
    skills: [
      'model_evaluation',
      'performance_metrics',
      'bias_detection',
      'validation_testing',
    ],
    tools: ['evaluation_metrics', 'bias_detector', 'validation_suite'],
  },

  [AgentType.ASSISTANT]: {
    type: AgentType.ASSISTANT,
    name: 'General Assistant Agent',
    description: 'General purpose assistant for various tasks',
    skills: [
      'task_management',
      'information_retrieval',
      'basic_analysis',
      'communication',
    ],
    tools: ['task_planner', 'search_engine', 'communication_tools'],
  },

  [AgentType.COORDINATOR]: {
    type: AgentType.COORDINATOR,
    name: 'Coordination Agent',
    description: 'Manages and coordinates multiple agents and workflows',
    skills: [
      'workflow_management',
      'agent_coordination',
      'task_delegation',
      'progress_tracking',
    ],
    tools: ['workflow_engine', 'coordination_platform', 'progress_tracker'],
  },

  [AgentType.SUPERVISOR]: {
    type: AgentType.SUPERVISOR,
    name: 'Supervisor Agent',
    description: 'Oversees and supervises agent operations and quality',
    skills: [
      'quality_oversight',
      'performance_monitoring',
      'decision_making',
      'escalation_handling',
    ],
    tools: ['monitoring_dashboard', 'quality_metrics', 'decision_engine'],
  },
};

/**
 * Helper function to get agent capability by type
 */
export function getAgentCapability(type: AgentType): AgentCapability {
  return AGENT_CAPABILITIES[type];
}

/**
 * Helper function to get all agent types that have a specific skill
 */
export function getAgentsBySkill(skill: string): AgentType[] {
  return Object.values(AgentType).filter((type) =>
    AGENT_CAPABILITIES[type].skills.includes(skill)
  );
}

/**
 * Helper function to get all agent types that can use a specific tool
 */
export function getAgentsByTool(tool: string): AgentType[] {
  return Object.values(AgentType).filter((type) =>
    AGENT_CAPABILITIES[type].tools.includes(tool)
  );
}
