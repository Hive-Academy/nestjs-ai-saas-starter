import {
  Injectable,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { AgentState } from '../../../core/interfaces/agent-state.interface';
import { AgentCommunicationService } from '../../../core/services/agent-communication.service';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';
import { AgentVisualizerService } from './agent-visualizer.service';
import { SpatialNavigationService } from './spatial-navigation.service';

export interface AgentInteractionConfig {
  sceneId: string;
  enableHover: boolean;
  enableSelection: boolean;
  enableTooltips: boolean;
  enableDoubleClickFocus: boolean;
  hoverResponseTime: number;
  selectionHighlightDuration: number;
  tooltipDelay: number;
}

export interface TooltipData {
  agentId: string;
  position: THREE.Vector3;
  screenPosition: { x: number; y: number };
  agent: AgentState;
  visible: boolean;
  timestamp: number;
}

export interface InteractionState {
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  tooltipData: TooltipData | null;
  lastInteractionTime: number;
  isDoubleClick: boolean;
}

/**
 * Agent Interaction Service
 * Enhanced raycasting and interaction system for precise agent selection
 * Manages hover states, tooltips, and seamless chat integration
 */
@Injectable({
  providedIn: 'root',
})
export class AgentInteractionService {
  private readonly agentCommunication = inject(AgentCommunicationService);
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly agentVisualizer = inject(AgentVisualizerService);
  private readonly spatialNavigation = inject(SpatialNavigationService);
  private readonly destroyRef = inject(DestroyRef);

  // Service state
  private readonly isInitialized = signal(false);
  private readonly interactionState = signal<InteractionState>({
    hoveredAgentId: null,
    selectedAgentId: null,
    tooltipData: null,
    lastInteractionTime: 0,
    isDoubleClick: false,
  });

  // Configuration
  private config: AgentInteractionConfig | null = null;
  private camera: THREE.Camera | null = null;
  private container: HTMLElement | null = null;

  // Enhanced raycasting system
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private intersectionPool: THREE.Intersection[] = [];
  private lastClickTime = 0;
  private doubleClickThreshold = 300; // milliseconds

  // Performance optimization
  private readonly maxRaycastDistance = 100;
  private readonly raycastThrottle = 16; // ~60fps
  private lastRaycastTime = 0;

  // Public reactive state
  readonly currentInteraction = computed(() => this.interactionState());
  readonly hoveredAgent = computed(() => {
    const state = this.interactionState();
    return state.hoveredAgentId ? this.agentVisualizer.getAgentInstance(state.hoveredAgentId) : null;
  });
  readonly selectedAgent = computed(() => {
    const state = this.interactionState();
    return state.selectedAgentId ? this.agentVisualizer.getAgentInstance(state.selectedAgentId) : null;
  });
  readonly tooltipData = computed(() => this.interactionState().tooltipData);
  readonly isInteracting = computed(() => {
    const state = this.interactionState();
    return state.hoveredAgentId !== null || state.selectedAgentId !== null;
  });

  /**
   * Initialize agent interaction system
   */
  initialize(config: AgentInteractionConfig): void {
    if (this.isInitialized()) {
      console.warn('AgentInteractionService already initialized');
      return;
    }

    this.config = config;
    
    const sceneInstance = this.threeService.getScene(config.sceneId);
    if (!sceneInstance) {
      throw new Error(`Scene ${config.sceneId} not found`);
    }

    this.camera = sceneInstance.camera;
    this.container = sceneInstance.container;
    
    this.setupRaycasting();
    this.setupEventListeners();
    this.setupPerformanceOptimizations();
    
    this.isInitialized.set(true);
    console.log('AgentInteractionService initialized with enhanced raycasting');
  }

  /**
   * Handle mouse/touch interaction events
   */
  handlePointerEvent(event: MouseEvent | TouchEvent, eventType: 'move' | 'click' | 'dblclick'): void {
    if (!this.isInitialized() || !this.config || !this.camera) return;

    // Throttle raycasting for performance
    const now = Date.now();
    if (eventType === 'move' && now - this.lastRaycastTime < this.raycastThrottle) {
      return;
    }
    this.lastRaycastTime = now;

    // Calculate mouse position
    this.updateMousePosition(event);

    // Perform raycasting
    const intersection = this.performRaycast();

    switch (eventType) {
      case 'move':
        this.handleMouseMove(intersection);
        break;
      case 'click':
        this.handleMouseClick(intersection);
        break;
      case 'dblclick':
        this.handleDoubleClick(intersection);
        break;
    }

    // Update interaction state
    this.updateInteractionState(now);
  }

  /**
   * Select agent programmatically
   */
  selectAgent(agentId: string | null): void {
    const currentState = this.interactionState();
    
    if (currentState.selectedAgentId === agentId) return;

    // Clear previous selection
    if (currentState.selectedAgentId) {
      this.clearAgentSelection(currentState.selectedAgentId);
    }

    // Set new selection
    if (agentId) {
      this.setAgentSelection(agentId);
      
      // Switch to the selected agent in communication service
      this.agentCommunication.switchAgent(agentId);
    }

    // Update state
    this.interactionState.update(state => ({
      ...state,
      selectedAgentId: agentId,
      lastInteractionTime: Date.now(),
    }));
  }

  /**
   * Focus camera on agent with smooth transition
   */
  focusOnAgent(agentId: string): Promise<void> {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (!agentInstance) {
      return Promise.reject(`Agent ${agentId} not found`);
    }

    const agentPosition = new THREE.Vector3(
      agentInstance.agent.position.x,
      agentInstance.agent.position.y,
      agentInstance.agent.position.z || 0
    );

    const target = {
      position: agentPosition,
      target: agentPosition,
      distance: 8,
    };

    return this.spatialNavigation.focusOnTarget(target);
  }

  /**
   * Get agent under mouse cursor
   */
  getAgentUnderCursor(): string | null {
    const intersection = this.performRaycast();
    return intersection ? this.extractAgentIdFromIntersection(intersection) : null;
  }

  /**
   * Update tooltip position for screen-space rendering
   */
  updateTooltipPosition(agentId: string): void {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (!agentInstance || !this.camera || !this.container) return;

    const worldPosition = new THREE.Vector3(
      agentInstance.agent.position.x,
      agentInstance.agent.position.y,
      agentInstance.agent.position.z || 0
    );

    const screenPosition = this.worldToScreenPosition(worldPosition);
    
    this.interactionState.update(state => ({
      ...state,
      tooltipData: state.tooltipData ? {
        ...state.tooltipData,
        screenPosition,
        position: worldPosition,
        timestamp: Date.now(),
      } : null,
    }));
  }

  /**
   * Clear all interactions and selections
   */
  clearAllInteractions(): void {
    const currentState = this.interactionState();
    
    if (currentState.hoveredAgentId) {
      this.clearAgentHover(currentState.hoveredAgentId);
    }
    
    if (currentState.selectedAgentId) {
      this.clearAgentSelection(currentState.selectedAgentId);
    }

    this.interactionState.set({
      hoveredAgentId: null,
      selectedAgentId: null,
      tooltipData: null,
      lastInteractionTime: Date.now(),
      isDoubleClick: false,
    });
  }

  /**
   * Get interaction statistics for debugging
   */
  getInteractionStats() {
    return {
      isInitialized: this.isInitialized(),
      isInteracting: this.isInteracting(),
      currentState: this.interactionState(),
      raycastPerformance: {
        maxDistance: this.maxRaycastDistance,
        throttleMs: this.raycastThrottle,
        lastRaycastTime: this.lastRaycastTime,
      },
      config: this.config,
    };
  }

  /**
   * Clean up interaction service
   */
  cleanup(): void {
    this.clearAllInteractions();
    this.removeEventListeners();
    
    this.intersectionPool.length = 0;
    this.mouse.set(0, 0);
    this.isInitialized.set(false);
    
    console.log('AgentInteractionService cleaned up');
  }

  /**
   * Setup enhanced raycasting system
   */
  private setupRaycasting(): void {
    // Configure raycaster for optimal performance
    this.raycaster.far = this.maxRaycastDistance;
    this.raycaster.near = 0.1;
    
    // Pre-allocate intersection pool for performance
    this.intersectionPool = new Array(10).fill(null).map(() => ({})) as THREE.Intersection[];
    
    console.log('Enhanced raycasting system configured');
  }

  /**
   * Setup event listeners for mouse and touch
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    const onMouseMove = (event: MouseEvent) => {
      this.handlePointerEvent(event, 'move');
    };

    const onClick = (event: MouseEvent) => {
      this.handlePointerEvent(event, 'click');
    };

    const onDoubleClick = (event: MouseEvent) => {
      this.handlePointerEvent(event, 'dblclick');
    };

    // Touch event handlers
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        // Convert touch to mouse-like event
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        this.handlePointerEvent(mouseEvent, 'move');
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        const mouseEvent = new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        this.handlePointerEvent(mouseEvent, 'click');
      }
    };

    this.container.addEventListener('mousemove', onMouseMove);
    this.container.addEventListener('click', onClick);
    this.container.addEventListener('dblclick', onDoubleClick);
    this.container.addEventListener('touchmove', onTouchMove);
    this.container.addEventListener('touchend', onTouchEnd);

    console.log('Event listeners configured for enhanced interaction');
  }

  /**
   * Setup performance optimizations
   */
  private setupPerformanceOptimizations(): void {
    // Periodically clean up stale tooltip data
    setInterval(() => {
      const currentState = this.interactionState();
      if (currentState.tooltipData) {
        const age = Date.now() - currentState.tooltipData.timestamp;
        if (age > 5000) { // 5 seconds
          this.interactionState.update(state => ({
            ...state,
            tooltipData: null,
          }));
        }
      }
    }, 1000);
  }

  /**
   * Update mouse position from event
   */
  private updateMousePosition(event: MouseEvent | TouchEvent): void {
    if (!this.container) return;

    let clientX: number, clientY: number;
    
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Perform optimized raycasting
   */
  private performRaycast(): THREE.Intersection | null {
    if (!this.camera) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const sceneInstance = this.threeService.getScene(this.config!.sceneId);
    if (!sceneInstance) return null;

    // Get all agent meshes efficiently
    const agentMeshes: THREE.Object3D[] = [];
    sceneInstance.scene.traverse((child) => {
      if (child.userData['agentId']) {
        agentMeshes.push(child);
      }
    });

    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(agentMeshes, true);
    
    return intersects.length > 0 ? intersects[0] : null;
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(intersection: THREE.Intersection | null): void {
    if (!this.config?.enableHover) return;

    const currentState = this.interactionState();
    const agentId = intersection ? this.extractAgentIdFromIntersection(intersection) : null;

    if (currentState.hoveredAgentId !== agentId) {
      // Clear previous hover
      if (currentState.hoveredAgentId) {
        this.clearAgentHover(currentState.hoveredAgentId);
      }

      // Set new hover
      if (agentId) {
        this.setAgentHover(agentId);
        
        if (this.config.enableTooltips) {
          this.showTooltip(agentId);
        }
      } else {
        this.hideTooltip();
      }

      this.interactionState.update(state => ({
        ...state,
        hoveredAgentId: agentId,
      }));
    }

    // Update tooltip position if visible
    if (agentId && currentState.tooltipData?.visible) {
      this.updateTooltipPosition(agentId);
    }
  }

  /**
   * Handle mouse click events
   */
  private handleMouseClick(intersection: THREE.Intersection | null): void {
    if (!this.config?.enableSelection) return;

    const agentId = intersection ? this.extractAgentIdFromIntersection(intersection) : null;
    
    // Detect double-click
    const now = Date.now();
    const isDoubleClick = now - this.lastClickTime < this.doubleClickThreshold;
    this.lastClickTime = now;

    if (isDoubleClick && agentId && this.config.enableDoubleClickFocus) {
      this.handleDoubleClick(intersection);
      return;
    }

    this.selectAgent(agentId);
  }

  /**
   * Handle double-click events for agent focus
   */
  private handleDoubleClick(intersection: THREE.Intersection | null): void {
    if (!this.config?.enableDoubleClickFocus) return;

    const agentId = intersection ? this.extractAgentIdFromIntersection(intersection) : null;
    
    if (agentId) {
      this.selectAgent(agentId);
      this.focusOnAgent(agentId);
      
      this.interactionState.update(state => ({
        ...state,
        isDoubleClick: true,
      }));
    }
  }

  /**
   * Set agent hover state
   */
  private setAgentHover(agentId: string): void {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (agentInstance) {
      agentInstance.component.instance.onHover(true);
    }
  }

  /**
   * Clear agent hover state
   */
  private clearAgentHover(agentId: string): void {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (agentInstance) {
      agentInstance.component.instance.onHover(false);
    }
  }

  /**
   * Set agent selection state
   */
  private setAgentSelection(agentId: string): void {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (agentInstance) {
      agentInstance.component.instance.onSelect(true);
    }
  }

  /**
   * Clear agent selection state
   */
  private clearAgentSelection(agentId: string): void {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (agentInstance) {
      agentInstance.component.instance.onSelect(false);
    }
  }

  /**
   * Show tooltip for agent
   */
  private showTooltip(agentId: string): void {
    const agentInstance = this.agentVisualizer.getAgentInstance(agentId);
    if (!agentInstance) return;

    const worldPosition = new THREE.Vector3(
      agentInstance.agent.position.x,
      agentInstance.agent.position.y,
      agentInstance.agent.position.z || 0
    );

    const screenPosition = this.worldToScreenPosition(worldPosition);

    const tooltipData: TooltipData = {
      agentId,
      position: worldPosition,
      screenPosition,
      agent: agentInstance.agent,
      visible: true,
      timestamp: Date.now(),
    };

    this.interactionState.update(state => ({
      ...state,
      tooltipData,
    }));
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    this.interactionState.update(state => ({
      ...state,
      tooltipData: state.tooltipData ? { ...state.tooltipData, visible: false } : null,
    }));
  }

  /**
   * Convert world position to screen coordinates
   */
  private worldToScreenPosition(worldPosition: THREE.Vector3): { x: number; y: number } {
    if (!this.camera || !this.container) {
      return { x: 0, y: 0 };
    }

    const vector = worldPosition.clone();
    vector.project(this.camera);

    const rect = this.container.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (vector.y * -0.5 + 0.5) * rect.height + rect.top;

    return { x, y };
  }

  /**
   * Extract agent ID from raycasting intersection
   */
  private extractAgentIdFromIntersection(intersection: THREE.Intersection): string | null {
    let current: THREE.Object3D | null = intersection.object;
    
    while (current) {
      if (current.userData['agentId']) {
        return current.userData['agentId'];
      }
      current = current.parent;
    }
    
    return null;
  }

  /**
   * Update interaction state with timestamp
   */
  private updateInteractionState(timestamp: number): void {
    this.interactionState.update(state => ({
      ...state,
      lastInteractionTime: timestamp,
      isDoubleClick: false, // Reset double-click flag
    }));
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    if (this.container) {
      this.container.removeEventListener('mousemove', () => {});
      this.container.removeEventListener('click', () => {});
      this.container.removeEventListener('dblclick', () => {});
      this.container.removeEventListener('touchmove', () => {});
      this.container.removeEventListener('touchend', () => {});
    }
  }
}