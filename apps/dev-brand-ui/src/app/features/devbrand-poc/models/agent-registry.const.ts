/**
 * Shared Agent Registry
 *
 * Single source of truth for agent metadata used across the DevBrand workflow UI.
 * Used by both DevBrandWorkflowStateService and AgentActivityPanelsComponent.
 *
 * @remarks
 * When adding a new agent, update this file ONLY. All consumers will automatically
 * pick up the change through the shared AGENT_REGISTRY and AGENT_METADATA exports.
 */

/**
 * Agent registry entry for known LangGraph agent nodes.
 */
export interface AgentRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
}

/**
 * Canonical agent registry mapping LangGraph node names to display metadata.
 * Used by the workflow state service for event routing and agent identification.
 */
export const AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  supervisor: {
    id: 'supervisor',
    name: 'Supervisor',
    icon: '\u{1F9E0}',
    description: 'Orchestrates agent delegation and workflow routing',
  },
  'github-code-analyzer': {
    id: 'github-code-analyzer',
    name: 'GitHub Code Analyzer',
    icon: '\u{1F50D}',
    description: 'Analyzes repositories and extracts technical achievements',
  },
  'personal-brand-strategist': {
    id: 'personal-brand-strategist',
    name: 'Personal Brand Strategist',
    icon: '\u{1F3AF}',
    description: 'Develops brand strategy and professional positioning',
  },
  'content-creator': {
    id: 'content-creator',
    name: 'Content Creator',
    icon: '\u{270D}\u{FE0F}',
    description: 'Generates platform-specific content and posts',
  },
};

/**
 * Ordered agent metadata array for display purposes.
 * Used by components that render agent lists in a specific order.
 */
export const AGENT_METADATA: readonly AgentRegistryEntry[] = [
  AGENT_REGISTRY['supervisor'],
  AGENT_REGISTRY['github-code-analyzer'],
  AGENT_REGISTRY['personal-brand-strategist'],
  AGENT_REGISTRY['content-creator'],
];
