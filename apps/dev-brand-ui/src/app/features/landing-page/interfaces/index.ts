/**
 * Shared TypeScript interfaces for Landing Page components
 * TASK_2025_026 - DevBrand Landing Page Implementation
 */

/**
 * Value Proposition Interface
 * Used by ValuePropositionCardComponent to display library value propositions
 * Contains 8 properties as specified in design-handoff.md:741-750
 */
export interface ValueProposition {
  /** Package name (e.g., '@hive-academy/nestjs-chromadb') */
  packageName: string;

  /** Business-focused headline (e.g., 'Build RAG Applications in Minutes') */
  businessHeadline: string;

  /** Pain point description - traditional approach problem */
  painPoint: string;

  /** Solution description - how our library solves it */
  solution: string;

  /** Array of capability descriptions (e.g., 'Multi-provider embeddings support') */
  capabilities: string[];

  /** Metric value (e.g., '90%', '85%') */
  metricValue: string;

  /** Metric label (e.g., 'Code Reduction', 'Less Boilerplate') */
  metricLabel: string;

  /** Optional Canva-generated icon URL */
  iconUrl?: string;
}

/**
 * Workflow Example Interface
 * Used by WorkflowExampleCardComponent to display real-world workflow examples
 * Contains 9 properties as specified in implementation-plan.md:422-432
 */
export interface WorkflowExample {
  /** Workflow title (e.g., 'RAG Pipeline with Multi-Source Context') */
  title: string;

  /** Workflow description */
  description: string;

  /** Array of module names used (e.g., ['ChromaDB', 'Neo4j', 'Memory', 'Streaming', 'Monitoring']) */
  modules: string[];

  /** Canva-generated architecture diagram URL from design-assets-inventory.md */
  diagramUrl: string;

  /** Number of code lines in traditional approach */
  codeBeforeLines: number;

  /** Number of code lines in our approach */
  codeAfterLines: number;

  /** Traditional approach code snippet */
  codeBefore: string;

  /** Our approach code snippet */
  codeAfter: string;

  /** Array of value delivered statements */
  valueDelivered: string[];
}

/**
 * Metric Card Data Interface
 * Used in Problem/Solution section to display metric cards
 * Contains 3 properties extracted from design-handoff.md:687-705
 */
export interface MetricCardData {
  /** Metric value (e.g., '90%', '60%', '75+', '$262K') */
  value: string;

  /** Metric label (e.g., 'Code Reduction', 'Less Approval Overhead') */
  label: string;

  /** Metric description (e.g., 'Vector operations: 50 lines → 5 lines') */
  description: string;
}
