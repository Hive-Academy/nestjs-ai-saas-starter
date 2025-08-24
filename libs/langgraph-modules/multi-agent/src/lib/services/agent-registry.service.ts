import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  AgentDefinition, 
  AgentNotFoundError,
  AgentDefinitionSchema,
} from '../interfaces/multi-agent.interface';

/**
 * Service for managing agent registration and lifecycle
 * Follows Single Responsibility Principle - only handles agent registry operations
 */
@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agentRegistry = new Map<string, AgentDefinition>();
  private readonly agentHealth = new Map<string, boolean>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Register a new agent with validation
   */
  registerAgent(definition: AgentDefinition): void {
    // Validate agent definition
    const validation = AgentDefinitionSchema.safeParse(definition);
    if (!validation.success) {
      throw new Error(`Invalid agent definition: ${validation.error.message}`);
    }

    // Check for duplicate registration
    if (this.agentRegistry.has(definition.id)) {
      this.logger.warn(`Agent ${definition.id} is already registered, updating definition`);
    }

    this.agentRegistry.set(definition.id, definition);
    this.agentHealth.set(definition.id, true);
    
    this.logger.log(`Registered agent: ${definition.id} (${definition.name})`);

    this.eventEmitter.emit('agent.registered', {
      agentId: definition.id,
      name: definition.name,
      description: definition.description,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      return false;
    }

    this.agentRegistry.delete(agentId);
    this.agentHealth.delete(agentId);

    this.logger.log(`Unregistered agent: ${agentId}`);

    this.eventEmitter.emit('agent.unregistered', {
      agentId,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentDefinition {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    return agent;
  }

  /**
   * Get agent safely (returns undefined if not found)
   */
  findAgent(agentId: string): AgentDefinition | undefined {
    return this.agentRegistry.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agentRegistry.values());
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): AgentDefinition[] {
    return this.getAllAgents().filter(agent => {
      const capabilities = agent.metadata?.capabilities;
      return Array.isArray(capabilities) && capabilities.includes(capability);
    });
  }

  /**
   * Check if agent exists
   */
  hasAgent(agentId: string): boolean {
    return this.agentRegistry.has(agentId);
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agentRegistry.size;
  }

  /**
   * List agent IDs
   */
  listAgentIds(): string[] {
    return Array.from(this.agentRegistry.keys());
  }

  /**
   * Validate agents exist
   */
  validateAgentsExist(agentIds: readonly string[]): void {
    const missingAgents = agentIds.filter(id => !this.hasAgent(id));
    if (missingAgents.length > 0) {
      throw new AgentNotFoundError(`Agents not found: ${missingAgents.join(', ')}`);
    }
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentId: string): boolean {
    return this.agentHealth.get(agentId) ?? false;
  }

  /**
   * Update agent health status
   */
  updateAgentHealth(agentId: string, isHealthy: boolean): void {
    if (!this.hasAgent(agentId)) {
      throw new AgentNotFoundError(agentId);
    }

    const previousHealth = this.agentHealth.get(agentId);
    this.agentHealth.set(agentId, isHealthy);

    if (previousHealth !== isHealthy) {
      this.eventEmitter.emit('agent.health.changed', {
        agentId,
        isHealthy,
        previousHealth,
        timestamp: new Date().toISOString(),
      });

      if (!isHealthy) {
        this.logger.warn(`Agent ${agentId} is now unhealthy`);
      }
    }
  }

  /**
   * Get all agent health statuses
   */
  getAllAgentHealth(): Map<string, boolean> {
    return new Map(this.agentHealth);
  }

  /**
   * Get healthy agents only
   */
  getHealthyAgents(): AgentDefinition[] {
    return this.getAllAgents().filter(agent => 
      this.getAgentHealth(agent.id)
    );
  }

  /**
   * Clear all agents (useful for testing)
   */
  clearAll(): void {
    const agentCount = this.agentRegistry.size;
    this.agentRegistry.clear();
    this.agentHealth.clear();
    
    this.logger.log(`Cleared ${agentCount} agents from registry`);
    
    this.eventEmitter.emit('agent.registry.cleared', {
      count: agentCount,
      timestamp: new Date().toISOString(),
    });
  }
}