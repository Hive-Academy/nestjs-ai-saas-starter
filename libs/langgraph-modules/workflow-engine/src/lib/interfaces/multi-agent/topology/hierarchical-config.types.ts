import type { AgentState, AgentCommand } from '../agent.types';

/**
 * Hierarchical configuration for multi-level agent systems
 * Supports supervisor-of-supervisors and nested agent teams
 */
export interface HierarchicalConfig {
  /**
   * Hierarchy levels (top-level supervisors to leaf workers)
   * Each level is an array of agent IDs
   * Example: [['top-supervisor'], ['supervisor1', 'supervisor2'], ['worker1', 'worker2', 'worker3']]
   */
  levels: ReadonlyArray<readonly string[]>;

  /**
   * Escalation rules
   * Defines when and how to escalate to higher levels
   */
  escalationRules?: EscalationRule[];

  /**
   * Parent graph navigation rules
   * Enables agents to send commands to parent graph
   */
  parentGraphRules?: ParentGraphRule[];
}

/**
 * Escalation rule for hierarchical systems
 * Defines conditions for escalating to higher supervisory levels
 */
export interface EscalationRule {
  /**
   * Condition for escalation
   * Returns true if task should be escalated
   */
  condition: (state: AgentState) => boolean;

  /**
   * Target level for escalation
   * Level index (0 = top level)
   */
  targetLevel: number;

  /**
   * Escalation message
   * Explains reason for escalation
   */
  message?: string;
}

/**
 * Parent graph navigation rule
 * Enables subgraph agents to navigate to parent graph nodes
 */
export interface ParentGraphRule {
  /**
   * Condition for parent navigation
   * Returns true if should navigate to parent
   */
  condition: (state: AgentState) => boolean;

  /**
   * Target agent in parent graph
   * Agent ID in parent graph to route to
   */
  targetAgent: string;

  /**
   * Command to execute
   * Command({ goto: 'parent-agent', graph: 'PARENT' })
   */
  command: AgentCommand;
}
