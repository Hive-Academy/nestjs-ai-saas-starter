import {
  Injectable,
  ComponentRef,
  ViewContainerRef,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import {
  Agent3DComponent,
  Agent3DConfig,
} from '../components/agent-3d.component';
import {
  AgentState,
  ToolExecution,
  MemoryContext,
} from '../../../core/interfaces/agent-state.interface';
import { AgentCommunicationService } from '../../../core/services/agent-communication.service';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';
import { AgentStateEffects } from '../effects/agent-state-effects';

export interface AgentVisualizerConfig {
  sceneId: string;
  viewContainerRef: ViewContainerRef;
  defaultAgentConfig?: Partial<Agent3DConfig>;
  enableInteraction: boolean;
  enableAnimation: boolean;
}

export interface Agent3DInstance {
  id: string;
  agent: AgentState;
  component: ComponentRef<Agent3DComponent>;
  lastUpdate: Date;
}

/**
 * Agent Visualizer Service
 * Manages the collection of 3D agent visualizations in the constellation
 * Handles real-time agent state updates and visual synchronization
 */
@Injectable({
  providedIn: 'root',
})
export class AgentVisualizerService {
  private readonly agentCommunication = inject(AgentCommunicationService);
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly destroyRef = inject(DestroyRef);

  // Service state
  private readonly agentInstances = signal<Map<string, Agent3DInstance>>(
    new Map()
  );
  private readonly isInitialized = signal(false);
  private readonly hoveredAgentId = signal<string | null>(null);
  private readonly selectedAgentId = signal<string | null>(null);

  // Configuration
  private config: AgentVisualizerConfig | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // State effects system
  private stateEffects: AgentStateEffects | null = null;

  // Public reactive state
  readonly activeAgents = computed(() =>
    Array.from(this.agentInstances().values())
  );
  readonly agentCount = computed(() => this.agentInstances().size);
  readonly hoveredAgent = computed(() => {
    const hoveredId = this.hoveredAgentId();
    return hoveredId ? this.agentInstances().get(hoveredId) : null;
  });
  readonly selectedAgent = computed(() => {
    const selectedId = this.selectedAgentId();
    return selectedId ? this.agentInstances().get(selectedId) : null;
  });

  /**
   * Initialize the agent visualizer
   */
  initialize(config: AgentVisualizerConfig): void {
    if (this.isInitialized()) {
      console.warn('AgentVisualizerService already initialized');
      return;
    }

    this.config = config;
    this.initializeStateEffects();
    this.setupAgentSubscriptions();
    this.setupInteractionHandlers();
    this.isInitialized.set(true);

    console.log('AgentVisualizerService initialized');
  }

  /**
   * Add or update agent visualization
   */
  visualizeAgent(agent: AgentState): void {
    if (!this.isInitialized() || !this.config) {
      console.warn('AgentVisualizerService not initialized');
      return;
    }

    const existingInstance = this.agentInstances().get(agent.id);

    if (existingInstance) {
      // Update existing agent
      this.updateAgentInstance(existingInstance, agent);
    } else {
      // Create new agent visualization
      this.createAgentInstance(agent);
    }
  }

  /**
   * Remove agent visualization
   */
  removeAgent(agentId: string): void {
    const instances = this.agentInstances();
    const instance = instances.get(agentId);

    if (instance) {
      // Clean up component
      instance.component.destroy();

      // Remove from tracking
      const newInstances = new Map(instances);
      newInstances.delete(agentId);
      this.agentInstances.set(newInstances);

      // Clear selection if this agent was selected
      if (this.selectedAgentId() === agentId) {
        this.selectedAgentId.set(null);
      }

      console.log(`Agent ${agentId} visualization removed`);
    }
  }

  /**
   * Update all agent animations (called from render loop)
   */
  updateAnimations(): void {
    if (!this.config?.enableAnimation) return;

    this.agentInstances().forEach((instance) => {
      instance.component.instance.updateAnimation();
    });

    // Update state effects
    if (this.stateEffects) {
      this.stateEffects.updateEffects();
    }
  }

  /**
   * Handle mouse interaction for agent selection
   */
  handleMouseEvent(event: MouseEvent, camera: THREE.Camera): void {
    if (!this.config?.enableInteraction) return;

    const sceneInstance = this.threeService.getScene(this.config.sceneId);
    if (!sceneInstance) return;

    // Calculate mouse position in normalized device coordinates
    const rect = sceneInstance.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, camera);

    // Get all agent meshes
    const agentMeshes: THREE.Object3D[] = [];
    sceneInstance.scene.traverse((child) => {
      if (child.userData['agentId']) {
        agentMeshes.push(child);
      }
    });

    // Check for intersections
    const intersects = this.raycaster.intersectObjects(agentMeshes, true);

    if (event.type === 'mousemove') {
      this.handleMouseHover(intersects);
    } else if (event.type === 'click') {
      this.handleMouseClick(intersects);
    }
  }

  /**
   * Select agent programmatically
   */
  selectAgent(agentId: string | null): void {
    const currentSelected = this.selectedAgentId();

    // Clear previous selection
    if (currentSelected) {
      const prevInstance = this.agentInstances().get(currentSelected);
      if (prevInstance) {
        prevInstance.component.instance.onSelect(false);
      }
    }

    // Set new selection
    this.selectedAgentId.set(agentId);

    if (agentId) {
      const newInstance = this.agentInstances().get(agentId);
      if (newInstance) {
        newInstance.component.instance.onSelect(true);

        // Switch to the selected agent in communication service
        this.agentCommunication.switchAgent(agentId);
      }
    }
  }

  /**
   * Get agent instance by ID
   */
  getAgentInstance(agentId: string): Agent3DInstance | null {
    return this.agentInstances().get(agentId) || null;
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentState['type']): Agent3DInstance[] {
    return Array.from(this.agentInstances().values()).filter(
      (instance) => instance.agent.type === type
    );
  }

  /**
   * Get agent positions for layout calculations
   */
  getAgentPositions(): Array<{ id: string; position: THREE.Vector3 }> {
    return Array.from(this.agentInstances().values()).map((instance) => ({
      id: instance.id,
      position: new THREE.Vector3(
        instance.agent.position.x,
        instance.agent.position.y,
        instance.agent.position.z || 0
      ),
    }));
  }

  /**
   * Clean up all visualizations
   */
  cleanup(): void {
    this.agentInstances().forEach((instance) => {
      instance.component.destroy();
    });

    // Clean up state effects
    if (this.stateEffects) {
      this.stateEffects.dispose();
      this.stateEffects = null;
    }

    this.agentInstances.set(new Map());
    this.hoveredAgentId.set(null);
    this.selectedAgentId.set(null);
    this.isInitialized.set(false);

    console.log('AgentVisualizerService cleaned up');
  }

  /**
   * Initialize state effects system
   */
  private initializeStateEffects(): void {
    if (!this.config) return;

    const sceneInstance = this.threeService.getScene(this.config.sceneId);
    if (!sceneInstance) return;

    this.stateEffects = new AgentStateEffects(sceneInstance.scene);
  }

  /**
   * Setup real-time agent state subscriptions
   */
  private setupAgentSubscriptions(): void {
    // Subscribe to agent updates
    this.agentCommunication.agentUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedAgent) => {
        this.visualizeAgent(updatedAgent);
        this.handleAgentStateChange(updatedAgent);
      });

    // Subscribe to memory updates
    this.agentCommunication.memoryUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contexts) => {
        // Handle real memory update contexts from TASK_API_001 backend
        this.handleMemoryUpdate(contexts);
      });

    // Subscribe to tool execution updates
    this.agentCommunication.toolExecutions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((toolExecution) => {
        // Handle real tool execution from TASK_API_001 backend
        this.handleToolExecutionUpdate(toolExecution);
      });

    // Subscribe to available agents changes
    this.agentCommunication.availableAgents().forEach((agent: AgentState) => {
      this.visualizeAgent(agent);
    });

    // Handle agent removal (could be enhanced with explicit removal events)
    // For now, we'll track which agents haven't been updated recently
    setInterval(() => {
      this.cleanupStaleAgents();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Setup mouse interaction handlers
   */
  private setupInteractionHandlers(): void {
    if (!this.config?.enableInteraction) return;

    const sceneInstance = this.threeService.getScene(this.config.sceneId);
    if (!sceneInstance) return;

    const container = sceneInstance.container;

    container.addEventListener('mousemove', (event) => {
      this.handleMouseEvent(event, sceneInstance.camera);
    });

    container.addEventListener('click', (event) => {
      this.handleMouseEvent(event, sceneInstance.camera);
    });

    // Add cursor style changes
    container.style.cursor = 'pointer';
  }

  /**
   * Create new agent 3D instance
   */
  private createAgentInstance(agent: AgentState): void {
    if (!this.config) return;

    // Create component
    const componentRef =
      this.config.viewContainerRef.createComponent(Agent3DComponent);

    // Configure component
    componentRef.instance.agent = agent;
    componentRef.instance.sceneId = this.config.sceneId;
    componentRef.instance.config = this.config.defaultAgentConfig;

    // Create instance record
    const instance: Agent3DInstance = {
      id: agent.id,
      agent,
      component: componentRef,
      lastUpdate: new Date(),
    };

    // Add to tracking
    const newInstances = new Map(this.agentInstances());
    newInstances.set(agent.id, instance);
    this.agentInstances.set(newInstances);

    console.log(`Agent ${agent.id} visualization created`);
  }

  /**
   * Update existing agent instance
   */
  private updateAgentInstance(
    instance: Agent3DInstance,
    updatedAgent: AgentState
  ): void {
    // Update agent data
    instance.agent = updatedAgent;
    instance.lastUpdate = new Date();

    // Update component input
    instance.component.instance.agent = updatedAgent;

    // Trigger change detection
    instance.component.changeDetectorRef.detectChanges();
  }

  /**
   * Handle mouse hover interactions
   */
  private handleMouseHover(intersects: THREE.Intersection[]): void {
    const currentHovered = this.hoveredAgentId();
    let newHoveredId: string | null = null;

    if (intersects.length > 0) {
      // Find the closest agent mesh
      for (const intersect of intersects) {
        const agentId = this.findAgentIdFromMesh(intersect.object);
        if (agentId) {
          newHoveredId = agentId;
          break;
        }
      }
    }

    // Update hover state if changed
    if (currentHovered !== newHoveredId) {
      // Clear previous hover
      if (currentHovered) {
        const prevInstance = this.agentInstances().get(currentHovered);
        if (prevInstance) {
          prevInstance.component.instance.onHover(false);
        }
      }

      // Set new hover
      if (newHoveredId) {
        const newInstance = this.agentInstances().get(newHoveredId);
        if (newInstance) {
          newInstance.component.instance.onHover(true);
        }
      }

      this.hoveredAgentId.set(newHoveredId);
    }
  }

  /**
   * Handle mouse click interactions
   */
  private handleMouseClick(intersects: THREE.Intersection[]): void {
    if (intersects.length > 0) {
      // Find the closest agent mesh
      for (const intersect of intersects) {
        const agentId = this.findAgentIdFromMesh(intersect.object);
        if (agentId) {
          this.selectAgent(agentId);
          break;
        }
      }
    } else {
      // Click on empty space - clear selection
      this.selectAgent(null);
    }
  }

  /**
   * Find agent ID from a Three.js mesh by traversing up the hierarchy
   */
  private findAgentIdFromMesh(mesh: THREE.Object3D): string | null {
    let current: THREE.Object3D | null = mesh;

    while (current) {
      if (current.userData['agentId']) {
        return current.userData['agentId'];
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Handle agent state changes for visual effects
   */
  private handleAgentStateChange(agent: AgentState): void {
    if (!this.stateEffects) return;

    const position = new THREE.Vector3(
      agent.position.x,
      agent.position.y,
      agent.position.z || 0
    );

    // Update tool execution progress rings
    agent.currentTools.forEach((tool) => {
      this.stateEffects!.updateToolProgressRing(agent.id, tool, position);
    });

    // Handle status-specific effects
    switch (agent.status) {
      case 'thinking':
        // Show memory access indicator for thinking state
        this.stateEffects.createMemoryAccessIndicator(
          agent.id,
          'workflow',
          position,
          0.8,
          1000
        );
        break;
      case 'executing':
        // Enhanced memory access for execution
        this.stateEffects.createMemoryAccessIndicator(
          agent.id,
          'chromadb',
          position,
          1.0,
          800
        );
        break;
    }
  }

  /**
   * Handle real memory update contexts from TASK_API_001 backend
   */
  private handleMemoryUpdate(contexts: MemoryContext[]): void {
    if (!this.stateEffects) return;

    // Find affected agents and create memory access indicators
    contexts.forEach((context) => {
      context.relatedAgents.forEach((agentId) => {
        const instance = this.agentInstances().get(agentId);
        if (instance && context.isActive) {
          const position = new THREE.Vector3(
            instance.agent.position.x,
            instance.agent.position.y,
            instance.agent.position.z || 0
          );

          this.stateEffects!.createMemoryAccessIndicator(
            agentId,
            context.source,
            position,
            context.relevanceScore,
            1500
          );
        }
      });
    });
  }

  /**
   * Handle real tool execution updates from TASK_API_001 backend
   */
  private handleToolExecutionUpdate(toolExecution: ToolExecution): void {
    if (!this.stateEffects) return;

    // Find the agent instance for this tool execution by looking for the tool in current tools
    this.agentInstances().forEach((instance, agentId) => {
      if (
        instance.agent.currentTools.some((tool) => tool.id === toolExecution.id)
      ) {
        const position = new THREE.Vector3(
          instance.agent.position.x,
          instance.agent.position.y,
          instance.agent.position.z || 0
        );

        this.stateEffects!.updateToolProgressRing(
          agentId,
          toolExecution,
          position
        );
      }
    });
  }

  /**
   * Create communication stream between agents
   */
  createCommunicationStream(
    fromAgentId: string,
    toAgentId: string,
    messageType: 'data' | 'command' | 'response' = 'data'
  ): void {
    if (!this.stateEffects) return;

    const fromInstance = this.agentInstances().get(fromAgentId);
    const toInstance = this.agentInstances().get(toAgentId);

    if (fromInstance && toInstance) {
      this.stateEffects.handleAgentCommunication(
        fromInstance.agent,
        toInstance.agent,
        messageType
      );
    }
  }

  /**
   * Clean up agents that haven't been updated recently
   */
  private cleanupStaleAgents(): void {
    const now = new Date();
    const staleThreshold = 2 * 60 * 1000; // 2 minutes

    const instancesToRemove: string[] = [];

    this.agentInstances().forEach((instance, agentId) => {
      const timeSinceUpdate = now.getTime() - instance.lastUpdate.getTime();
      if (timeSinceUpdate > staleThreshold) {
        instancesToRemove.push(agentId);
      }
    });

    instancesToRemove.forEach((agentId) => {
      console.log(`Removing stale agent visualization: ${agentId}`);
      this.removeAgent(agentId);
    });
  }
}
