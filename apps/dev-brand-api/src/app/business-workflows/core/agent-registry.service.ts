import { Injectable } from '@nestjs/common';

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  roles?: string[];
  version?: string;
  deprecated?: boolean;
}

/**
 * AgentRegistryService
 * Phase 1: static in-memory agents replacing previous mock controller response.
 * Future: load from config or persistence; include health/state.
 */
@Injectable()
export class AgentRegistryService {
  private readonly agents = new Map<string, AgentSummary>();
  private initialized = false;

  private ensureInitialized() {
    if (this.initialized) return;
    const staticAgents: AgentSummary[] = [
      {
        id: 'support-triage',
        name: 'Support Triage',
        description: 'Initial triage of support tickets and routing.',
        capabilities: ['classification', 'routing', 'summarization'],
        roles: ['triage'],
        version: '1.0.0',
      },
      {
        id: 'knowledge-enricher',
        name: 'Knowledge Enricher',
        description: 'Enriches tickets with knowledge base context.',
        capabilities: ['kb-lookup', 'context-expansion'],
        roles: ['enrichment'],
        version: '1.0.0',
      },
      {
        id: 'resolution-drafter',
        name: 'Resolution Drafter',
        description: 'Drafts structured resolution proposals.',
        capabilities: ['drafting', 'formatting'],
        roles: ['resolution'],
        version: '1.0.0',
      },
    ];
    staticAgents.forEach(a => this.agents.set(a.id, a));
    this.initialized = true;
  }

  list(): AgentSummary[] {
    this.ensureInitialized();
    return [...this.agents.values()];
  }

  get(id: string): AgentSummary | undefined {
    this.ensureInitialized();
    return this.agents.get(id);
  }
}
