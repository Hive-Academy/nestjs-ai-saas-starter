import { Injectable, inject, signal, computed } from '@angular/core';
import * as THREE from 'three';
import {
  MemoryUpdateMessage,
  ToolExecutionMessage,
  AgentUpdateMessage,
  WebSocketMessage,
  MemoryContext,
  ToolExecution,
} from '../../../core/interfaces/agent-state.interface';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';
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
 * Connects Mock API WebSocket data to Three.js visual effects system
 */
@Injectable({
  providedIn: 'root',
})
export class AgentStateVisualizerService {
  private readonly threeService = inject(ThreeIntegrationService);

  // Service state
  private readonly isInitialized = signal(false);
  private readonly activeEffects = signal<Map<string, ActiveVisualEffect>>(
    new Map()
  );
  private readonly effectConfig = signal<VisualEffectConfig | null>(null);

  // WebSocket connection for Mock API
  private mockApiSocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  // Performance monitoring
  private readonly lastFrameTime = signal(0);
  private readonly effectCount = signal(0);
  private readonly memoryUsage = signal(0);

  // Public reactive state
  readonly isConnectedToMockApi = signal(false);
  readonly visualEffectsActive = computed(() => this.activeEffects().size > 0);
  readonly performanceMetrics = computed(() => ({
    frameTime: this.lastFrameTime(),
    effectCount: this.effectCount(),
    memoryUsage: this.memoryUsage(),
    isOptimalPerformance: this.lastFrameTime() < 16.67, // 60fps = 16.67ms per frame
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
    this.connectToMockApi();
    this.setupCleanupInterval();
    this.isInitialized.set(true);

    console.log('AgentStateVisualizerService initialized with config:', config);
  }

  /**
   * Connect to Mock API WebSocket for real-time agent data
   */
  private connectToMockApi(): void {
    try {
      this.mockApiSocket = new WebSocket('ws://localhost:3001');

      this.mockApiSocket.onopen = () => {
        console.log('Connected to Mock API WebSocket');
        this.isConnectedToMockApi.set(true);
        this.reconnectAttempts = 0;
      };

      this.mockApiSocket.onmessage = (event) => {
        this.handleMockApiMessage(JSON.parse(event.data));
      };

      this.mockApiSocket.onclose = () => {
        console.log('Mock API WebSocket connection closed');
        this.isConnectedToMockApi.set(false);
        this.scheduleReconnect();
      };

      this.mockApiSocket.onerror = (error) => {
        console.error('Mock API WebSocket error:', error);
        this.isConnectedToMockApi.set(false);
      };
    } catch (error) {
      console.error('Failed to connect to Mock API:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming messages from Mock API
   */
  private handleMockApiMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'memory_update':
        this.handleMemoryUpdate(message as MemoryUpdateMessage);
        break;
      case 'tool_execution':
        this.handleToolExecution(message as ToolExecutionMessage);
        break;
      case 'agent_update':
        this.handleAgentUpdate(message as AgentUpdateMessage);
        break;
      default:
        // Handle other message types if needed
        break;
    }
  }

  /**
   * Handle memory access updates and trigger visual effects
   */
  private handleMemoryUpdate(message: MemoryUpdateMessage): void {
    const config = this.effectConfig();
    if (!config?.enableMemoryEffects) return;

    message.data.contexts.forEach((context: MemoryContext) => {
      context.relatedAgents.forEach((agentId: string) => {
        this.triggerMemoryAccessEffect(agentId, context);
      });
    });
  }

  /**
   * Handle tool execution updates and trigger progress rings
   */
  private handleToolExecution(message: ToolExecutionMessage): void {
    const config = this.effectConfig();
    if (!config?.enableToolRings) return;

    const { agentId, toolExecution } = message.data;
    this.triggerToolExecutionRing(agentId, toolExecution);
  }

  /**
   * Handle agent state updates for communication streams
   */
  private handleAgentUpdate(message: AgentUpdateMessage): void {
    const config = this.effectConfig();
    if (!config?.enableCommunicationStreams) return;

    // Check if this is part of multi-agent coordination
    const { agentId, state } = message.data;
    if (state.currentTask && this.isCoordinationTask(state.currentTask)) {
      this.triggerCommunicationStream(agentId, state.currentTask);
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

    // Close WebSocket connection
    if (this.mockApiSocket) {
      this.mockApiSocket.close();
      this.mockApiSocket = null;
    }

    this.isInitialized.set(false);
    this.isConnectedToMockApi.set(false);

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
   * Check if task involves coordination
   */
  private isCoordinationTask(taskDescription: string): boolean {
    const coordinationKeywords = [
      'coordinate',
      'collaborate',
      'sync',
      'share',
      'communicate',
    ];
    return coordinationKeywords.some((keyword) =>
      taskDescription.toLowerCase().includes(keyword)
    );
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
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for Mock API');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(
        `Attempting to reconnect to Mock API (attempt ${this.reconnectAttempts})`
      );
      this.connectToMockApi();
    }, delay);
  }
}
