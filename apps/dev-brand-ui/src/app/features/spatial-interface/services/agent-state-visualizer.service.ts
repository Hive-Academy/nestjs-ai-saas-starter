import { Injectable, inject, signal, computed } from '@angular/core';
import * as THREE from 'three';
import { interval, takeUntil, Subject } from 'rxjs';
import {
  MemoryContext,
  ToolExecution,
} from '../../../core/interfaces/agent-state.interface';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';
import {
  ShowcaseApiService,
  ShowcaseAgent,
  ShowcaseSystemStatus,
} from '../../../core/services/showcase-api.service';
import { MemoryAccessEffect } from '../effects/memory-access-effect';
import { ToolExecutionRing } from '../effects/tool-execution-ring';
import { CommunicationStream } from '../effects/communication-stream';

export interface VisualEffectConfig {
  sceneId: string;
  enableMemoryEffects: boolean;
  enableToolRings: boolean;
  enableCommunicationStreams: boolean;
  effectQuality: 'low' | 'medium' | 'high';
  maxConcurrentEffects: number;
}

export interface ActiveVisualEffect {
  id: string;
  type: 'memory' | 'tool' | 'communication';
  agentId: string;
  startTime: Date;
  duration?: number; // milliseconds
  effect: MemoryAccessEffect | ToolExecutionRing | CommunicationStream;
}

/**
 * Agent State Visualizer Service
 * Orchestrates all visual effects for real-time agent state visualization
 * Connects to Showcase API for real agent data and system status
 */
@Injectable({
  providedIn: 'root',
})
export class AgentStateVisualizerService {
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly showcaseApi = inject(ShowcaseApiService);

  // Service state
  private readonly isInitialized = signal(false);
  private readonly activeEffects = signal<Map<string, ActiveVisualEffect>>(
    new Map()
  );
  private readonly effectConfig = signal<VisualEffectConfig | null>(null);

  // API polling for real-time updates
  private readonly destroy$ = new Subject<void>();
  private readonly pollingInterval = 2000; // Poll every 2 seconds
  private readonly availableAgents = signal<ShowcaseAgent[]>([]);
  private readonly systemStatus = signal<ShowcaseSystemStatus | null>(null);

  // Performance monitoring
  private readonly lastFrameTime = signal(0);
  private readonly effectCount = signal(0);
  private readonly memoryUsage = signal(0);

  // Public reactive state
  readonly isConnectedToApi = computed(() => this.systemStatus() !== null);
  readonly visualEffectsActive = computed(() => this.activeEffects().size > 0);
  readonly currentAgents = this.availableAgents.asReadonly();
  readonly currentSystemStatus = this.systemStatus.asReadonly();
  readonly performanceMetrics = computed(() => ({
    frameTime: this.lastFrameTime(),
    effectCount: this.effectCount(),
    memoryUsage: this.memoryUsage(),
    isOptimalPerformance: this.lastFrameTime() < 16.67, // 60fps = 16.67ms per frame
    apiConnected: this.isConnectedToApi(),
  }));

  /**
   * Initialize the visual effects system
   */
  initialize(config: VisualEffectConfig): void {
    if (this.isInitialized()) {
      console.warn('AgentStateVisualizerService already initialized');
      return;
    }

    this.effectConfig.set(config);
    this.startApiPolling();
    this.setupCleanupInterval();
    this.isInitialized.set(true);

    console.log('AgentStateVisualizerService initialized with config:', config);
  }

  /**
   * Start API polling for real-time agent data
   */
  private startApiPolling(): void {
    console.log('Starting Showcase API polling for real-time agent data');

    // Initial fetch
    this.fetchAgentsAndStatus();

    // Set up polling interval
    interval(this.pollingInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchAgentsAndStatus();
      });
  }

  /**
   * Fetch agents and system status from Showcase API
   */
  private fetchAgentsAndStatus(): void {
    // Fetch available agents
    this.showcaseApi.getAvailableAgents().subscribe({
      next: (agents) => {
        this.availableAgents.set(agents);
        this.simulateAgentActivity(agents);
      },
      error: (error) => {
        console.error('Failed to fetch agents:', error);
      },
    });

    // Fetch system status
    this.showcaseApi.getSystemStatus().subscribe({
      next: (status) => {
        this.systemStatus.set(status);
        this.processSystemStatus(status);
      },
      error: (error) => {
        console.error('Failed to fetch system status:', error);
      },
    });
  }

  /**
   * Process system status and trigger visual effects
   */
  private processSystemStatus(status: ShowcaseSystemStatus): void {
    // Trigger visual effects based on agent activity
    Object.entries(status.agents).forEach(([agentId, agentStatus]) => {
      if (agentStatus === 'active' || agentStatus === 'busy') {
        this.simulateMemoryAccess(agentId);
      }
    });

    // Trigger communication streams for running workflows
    Object.entries(status.workflows).forEach(([workflowId, workflowStatus]) => {
      if (workflowStatus === 'running') {
        this.simulateWorkflowCommunication(workflowId);
      }
    });
  }

  /**
   * Simulate agent activity based on real agents
   */
  private simulateAgentActivity(agents: ShowcaseAgent[]): void {
    agents.forEach((agent) => {
      // Simulate tool execution for agents with high priority
      if (agent.priority === 'high' && Math.random() > 0.7) {
        this.simulateToolExecution(agent.id, agent.tools);
      }

      // Simulate memory access for agents with advanced capabilities
      if (agent.metadata.complexity === 'advanced' && Math.random() > 0.6) {
        this.simulateMemoryAccess(agent.id);
      }
    });
  }

  /**
   * Simulate memory access for visualization
   */
  private simulateMemoryAccess(agentId: string): void {
    const memoryTypes: ('chromadb' | 'neo4j' | 'workflow')[] = [
      'chromadb',
      'neo4j',
      'workflow',
    ];
    const randomType =
      memoryTypes[Math.floor(Math.random() * memoryTypes.length)];

    const mockContext: MemoryContext = {
      id: `sim-${Date.now()}`,
      source: randomType,
      type: 'semantic',
      content: `Simulated ${randomType} access`,
      relevanceScore: 0.5 + Math.random() * 0.5,
      isActive: true,
      timestamp: new Date(),
      tags: ['simulation'],
      relatedAgents: [agentId],
      metadata: { timestamp: new Date().toISOString() },
    };

    this.triggerMemoryAccessEffect(agentId, mockContext);
  }

  /**
   * Simulate tool execution for visualization
   */
  private simulateToolExecution(agentId: string, tools: string[]): void {
    if (tools.length === 0) return;

    const randomTool = tools[Math.floor(Math.random() * tools.length)];

    const mockExecution: ToolExecution = {
      id: `tool-${Date.now()}`,
      toolName: randomTool,
      progress: Math.random() * 100, // 0-100 as per interface
      status: 'running',
      startTime: new Date(),
    };

    this.triggerToolExecutionRing(agentId, mockExecution);
  }

  /**
   * Simulate workflow communication
   */
  private simulateWorkflowCommunication(workflowId: string): void {
    // Create communication between random agents
    const agents = this.availableAgents();
    if (agents.length < 2) return;

    const fromAgent = agents[Math.floor(Math.random() * agents.length)];
    const toAgent = agents[Math.floor(Math.random() * agents.length)];

    if (fromAgent.id !== toAgent.id) {
      this.triggerCommunicationStream(fromAgent.id, `Workflow: ${workflowId}`);
    }
  }

  /**
   * Trigger memory access visual effect
   */
  private triggerMemoryAccessEffect(
    agentId: string,
    memoryContext: MemoryContext
  ): void {
    const agentMesh = this.getAgentMesh(agentId);
    if (!agentMesh) return;

    const effectId = `memory-${agentId}-${Date.now()}`;
    const effect = new MemoryAccessEffect({
      agentMesh,
      memoryType: memoryContext.source,
      duration: this.getMemoryEffectDuration(memoryContext.source),
      intensity: memoryContext.relevanceScore,
    });

    const activeEffect: ActiveVisualEffect = {
      id: effectId,
      type: 'memory',
      agentId,
      startTime: new Date(),
      duration: this.getMemoryEffectDuration(memoryContext.source),
      effect,
    };

    // Add to active effects
    const effects = new Map(this.activeEffects());
    effects.set(effectId, activeEffect);
    this.activeEffects.set(effects);

    // Start the effect
    effect.start();

    console.log(
      `Memory access effect triggered: ${memoryContext.source} for agent ${agentId}`
    );
  }

  /**
   * Trigger tool execution progress ring
   */
  private triggerToolExecutionRing(
    agentId: string,
    toolExecution: ToolExecution
  ): void {
    const agentMesh = this.getAgentMesh(agentId);
    if (!agentMesh) return;

    const effectId = `tool-${agentId}-${toolExecution.id}`;

    // Check if effect already exists and update it
    const existingEffect = this.activeEffects().get(effectId);
    if (existingEffect && existingEffect.effect instanceof ToolExecutionRing) {
      existingEffect.effect.updateProgress(
        toolExecution.progress,
        toolExecution.status
      );
      return;
    }

    // Create new tool execution ring
    const effect = new ToolExecutionRing({
      agentMesh,
      toolName: toolExecution.toolName,
      progress: toolExecution.progress,
      status: toolExecution.status,
      color: this.getToolColor(toolExecution.toolName),
    });

    const activeEffect: ActiveVisualEffect = {
      id: effectId,
      type: 'tool',
      agentId,
      startTime: new Date(),
      effect,
    };

    // Add to active effects
    const effects = new Map(this.activeEffects());
    effects.set(effectId, activeEffect);
    this.activeEffects.set(effects);

    // Start the effect
    effect.start();

    console.log(
      `Tool execution ring triggered: ${toolExecution.toolName} for agent ${agentId}`
    );
  }

  /**
   * Trigger communication stream between agents
   */
  private triggerCommunicationStream(
    fromAgentId: string,
    taskDescription: string
  ): void {
    // Find related agents based on task description
    const relatedAgents = this.findRelatedAgents(fromAgentId, taskDescription);

    relatedAgents.forEach((toAgentId) => {
      const fromMesh = this.getAgentMesh(fromAgentId);
      const toMesh = this.getAgentMesh(toAgentId);

      if (!fromMesh || !toMesh) return;

      const effectId = `comm-${fromAgentId}-${toAgentId}-${Date.now()}`;
      const effect = new CommunicationStream({
        fromAgentMesh: fromMesh,
        toAgentMesh: toMesh,
        communicationType: this.getCommunicationType(taskDescription),
        intensity: 1.0,
        duration: 3000, // 3 seconds
      });

      const activeEffect: ActiveVisualEffect = {
        id: effectId,
        type: 'communication',
        agentId: fromAgentId,
        startTime: new Date(),
        duration: 3000,
        effect,
      };

      // Add to active effects
      const effects = new Map(this.activeEffects());
      effects.set(effectId, activeEffect);
      this.activeEffects.set(effects);

      // Start the effect
      effect.start();

      console.log(
        `Communication stream triggered: ${fromAgentId} -> ${toAgentId}`
      );
    });
  }

  /**
   * Update all active visual effects (called from render loop)
   */
  updateEffects(deltaTime: number): void {
    const startTime = performance.now();

    this.activeEffects().forEach((activeEffect, effectId) => {
      // Update the effect
      activeEffect.effect.update(deltaTime);

      // Check if effect should be removed
      if (this.shouldRemoveEffect(activeEffect)) {
        this.removeEffect(effectId);
      }
    });

    // Update performance metrics
    const frameTime = performance.now() - startTime;
    this.lastFrameTime.set(frameTime);
    this.effectCount.set(this.activeEffects().size);
  }

  /**
   * Clean up all effects and connections
   */
  cleanup(): void {
    // Clean up all active effects
    this.activeEffects().forEach((effect) => {
      effect.effect.dispose();
    });
    this.activeEffects.set(new Map());

    // Stop API polling
    this.destroy$.next();
    this.destroy$.complete();

    this.isInitialized.set(false);
    this.systemStatus.set(null);
    this.availableAgents.set([]);

    console.log('AgentStateVisualizerService cleaned up');
  }

  /**
   * Get agent mesh from Three.js scene
   */
  private getAgentMesh(agentId: string): THREE.Group | null {
    const config = this.effectConfig();
    if (!config) return null;

    const sceneInstance = this.threeService.getScene(config.sceneId);
    if (!sceneInstance) return null;

    let agentMesh: THREE.Group | null = null;
    sceneInstance.scene.traverse((child) => {
      if (child.userData['agentId'] === agentId) {
        agentMesh = child as THREE.Group;
      }
    });

    return agentMesh;
  }

  /**
   * Get memory effect duration based on source type
   */
  private getMemoryEffectDuration(
    source: 'chromadb' | 'neo4j' | 'workflow'
  ): number {
    switch (source) {
      case 'chromadb':
        return 100 + Math.random() * 400; // 100-500ms
      case 'neo4j':
        return 50 + Math.random() * 150; // 50-200ms
      case 'workflow':
        return 200 + Math.random() * 300; // 200-500ms
      default:
        return 300;
    }
  }

  /**
   * Get tool-specific color coding
   */
  private getToolColor(toolName: string): string {
    if (toolName.includes('analysis')) return '#4A90E2'; // Blue
    if (toolName.includes('create') || toolName.includes('generate'))
      return '#7ED321'; // Green
    if (toolName.includes('communication') || toolName.includes('message'))
      return '#F5A623'; // Orange
    if (toolName.includes('coordination') || toolName.includes('manage'))
      return '#9013FE'; // Purple
    return '#50E3C2'; // Default teal
  }

  /**
   * Find related agents for communication streams
   */
  private findRelatedAgents(
    fromAgentId: string,
    taskDescription: string
  ): string[] {
    // This would typically analyze the task and find related agents
    // For now, return a simple mock based on task keywords
    const relatedAgents: string[] = [];

    if (taskDescription.includes('coordinate')) {
      // Find coordinator agents
      relatedAgents.push('coordinator-agent');
    }

    if (taskDescription.includes('analyze')) {
      // Find analyst agents
      relatedAgents.push('analyst-agent');
    }

    return relatedAgents.filter((id) => id !== fromAgentId);
  }

  /**
   * Determine communication type from task description
   */
  private getCommunicationType(
    taskDescription: string
  ): 'coordination' | 'data_sharing' | 'error_reporting' {
    if (
      taskDescription.includes('error') ||
      taskDescription.includes('problem')
    ) {
      return 'error_reporting';
    }
    if (taskDescription.includes('share') || taskDescription.includes('data')) {
      return 'data_sharing';
    }
    return 'coordination';
  }

  /**
   * Check if effect should be removed
   */
  private shouldRemoveEffect(activeEffect: ActiveVisualEffect): boolean {
    const now = new Date().getTime();
    const effectAge = now - activeEffect.startTime.getTime();

    // Remove if effect has explicit duration and has exceeded it
    if (activeEffect.duration && effectAge > activeEffect.duration) {
      return true;
    }

    // Remove if effect reports completion
    if (activeEffect.effect.getIsCompleted()) {
      return true;
    }

    return false;
  }

  /**
   * Remove specific effect
   */
  private removeEffect(effectId: string): void {
    const effects = new Map(this.activeEffects());
    const effect = effects.get(effectId);

    if (effect) {
      effect.effect.dispose();
      effects.delete(effectId);
      this.activeEffects.set(effects);
    }
  }

  /**
   * Setup periodic cleanup of completed effects
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      const effectsToRemove: string[] = [];

      this.activeEffects().forEach((effect, effectId) => {
        if (this.shouldRemoveEffect(effect)) {
          effectsToRemove.push(effectId);
        }
      });

      effectsToRemove.forEach((effectId) => {
        this.removeEffect(effectId);
      });
    }, 1000); // Check every second
  }

  /**
   * Get real agent data by mapping showcase agents to visual representation
   */
  getAgentVisualizationData(agentId: string) {
    const agent = this.availableAgents().find((a) => a.id === agentId);
    if (!agent) return null;

    return {
      name: agent.name,
      type: agent.metadata.category,
      priority: agent.priority,
      capabilities: agent.capabilities,
      tools: agent.tools,
      complexity: agent.metadata.complexity,
      isActive:
        this.systemStatus()?.agents[agentId] === 'active' ||
        this.systemStatus()?.agents[agentId] === 'busy',
    };
  }
}
