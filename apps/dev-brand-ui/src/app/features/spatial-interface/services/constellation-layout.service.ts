import {
  Injectable,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { AgentState, AgentPosition } from '../../../core/interfaces/agent-state.interface';
import { AgentCommunicationService } from '../../../core/services/agent-communication.service';

export interface ConstellationConfig {
  centerRadius: number;
  orbitalRadius: number;
  verticalSpread: number;
  coordinatorCenter: boolean;
  animationDuration: number;
  collisionAvoidance: boolean;
  hierarchicalLayout: boolean;
}

export interface LayoutPosition extends AgentPosition {
  targetX: number;
  targetY: number;
  targetZ: number;
  isAnimating: boolean;
  animationProgress: number;
}

/**
 * Constellation Layout Service
 * Manages intelligent spatial arrangement of agents in the 3D constellation
 * Provides hierarchical positioning with collision avoidance and smooth transitions
 */
@Injectable({
  providedIn: 'root',
})
export class ConstellationLayoutService {
  private readonly agentCommunication = inject(AgentCommunicationService);
  private readonly destroyRef = inject(DestroyRef);

  // Service state
  private readonly agentPositions = signal<Map<string, LayoutPosition>>(new Map());
  private readonly isLayoutActive = signal(false);
  private readonly layoutConfig = signal<ConstellationConfig>({
    centerRadius: 2.0,
    orbitalRadius: 6.0,
    verticalSpread: 4.0,
    coordinatorCenter: true,
    animationDuration: 2000, // milliseconds
    collisionAvoidance: true,
    hierarchicalLayout: true,
  });

  // Animation state
  private animationRequestId: number | null = null;
  private lastUpdateTime = 0;

  // Public reactive state
  readonly positions = this.agentPositions.asReadonly();
  readonly config = this.layoutConfig.asReadonly();
  readonly activePositionCount = computed(() => this.agentPositions().size);

  constructor() {
    this.setupAgentSubscriptions();
  }

  /**
   * Initialize the constellation layout system
   */
  initialize(config?: Partial<ConstellationConfig>): void {
    if (config) {
      this.updateConfig(config);
    }

    this.isLayoutActive.set(true);
    this.startAnimationLoop();
    
    // Initial layout calculation
    this.recalculateLayout();
    
    console.log('ConstellationLayoutService initialized');
  }

  /**
   * Update layout configuration
   */
  updateConfig(config: Partial<ConstellationConfig>): void {
    const currentConfig = this.layoutConfig();
    this.layoutConfig.set({ ...currentConfig, ...config });
    
    if (this.isLayoutActive()) {
      this.recalculateLayout();
    }
  }

  /**
   * Add or update agent position in constellation
   */
  positionAgent(agent: AgentState): void {
    if (!this.isLayoutActive()) return;

    const currentPositions = this.agentPositions();
    const existingPosition = currentPositions.get(agent.id);
    
    if (existingPosition) {
      // Update existing agent
      this.updateAgentPosition(agent, existingPosition);
    } else {
      // Add new agent
      this.addNewAgent(agent);
    }
  }

  /**
   * Remove agent from constellation
   */
  removeAgent(agentId: string): void {
    const currentPositions = this.agentPositions();
    if (currentPositions.has(agentId)) {
      const newPositions = new Map(currentPositions);
      newPositions.delete(agentId);
      this.agentPositions.set(newPositions);
      
      // Recalculate layout to fill gaps
      this.recalculateLayout();
    }
  }

  /**
   * Get agent position by ID
   */
  getAgentPosition(agentId: string): LayoutPosition | null {
    return this.agentPositions().get(agentId) || null;
  }

  /**
   * Get all agents of a specific type with their positions
   */
  getAgentsByType(type: AgentState['type']): Array<{ agentId: string; position: LayoutPosition }> {
    const agents = this.agentCommunication.getAgentsByType(type);
    const result: Array<{ agentId: string; position: LayoutPosition }> = [];
    
    agents.forEach(agent => {
      const position = this.agentPositions().get(agent.id);
      if (position) {
        result.push({ agentId: agent.id, position });
      }
    });
    
    return result;
  }

  /**
   * Force immediate layout recalculation
   */
  recalculateLayout(): void {
    const agents = this.agentCommunication.availableAgents();
    const config = this.layoutConfig();
    
    if (agents.length === 0) return;

    const newPositions = new Map(this.agentPositions());
    
    if (config.hierarchicalLayout) {
      this.calculateHierarchicalLayout(agents, newPositions);
    } else {
      this.calculateCircularLayout(agents, newPositions);
    }

    this.agentPositions.set(newPositions);
  }

  /**
   * Get constellation center point
   */
  getConstellationCenter(): THREE.Vector3 {
    const positions = Array.from(this.agentPositions().values());
    
    if (positions.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    const center = positions.reduce(
      (acc, pos) => {
        acc.x += pos.x;
        acc.y += pos.y;
        acc.z += pos.z || 0;
        return acc;
      },
      { x: 0, y: 0, z: 0 }
    );

    return new THREE.Vector3(
      center.x / positions.length,
      center.y / positions.length,
      center.z / positions.length
    );
  }

  /**
   * Get constellation bounding sphere
   */
  getConstellationBounds(): { center: THREE.Vector3; radius: number } {
    const center = this.getConstellationCenter();
    const positions = Array.from(this.agentPositions().values());
    
    let maxDistance = 0;
    positions.forEach(pos => {
      const distance = center.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z || 0));
      maxDistance = Math.max(maxDistance, distance);
    });

    return { center, radius: maxDistance };
  }

  /**
   * Clean up and stop layout system
   */
  cleanup(): void {
    this.isLayoutActive.set(false);
    this.stopAnimationLoop();
    this.agentPositions.set(new Map());
    
    console.log('ConstellationLayoutService cleaned up');
  }

  /**
   * Setup agent state subscriptions
   */
  private setupAgentSubscriptions(): void {
    // Subscribe to agent updates
    this.agentCommunication.agentUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((agent) => {
        this.positionAgent(agent);
      });

    // Handle initial agents
    const existingAgents = this.agentCommunication.availableAgents();
    existingAgents.forEach(agent => {
      this.positionAgent(agent);
    });
  }

  /**
   * Calculate hierarchical layout (coordinators in center, others in orbits)
   */
  private calculateHierarchicalLayout(
    agents: AgentState[],
    positions: Map<string, LayoutPosition>
  ): void {
    const config = this.layoutConfig();
    
    // Separate agents by type
    const coordinators = agents.filter(a => a.type === 'coordinator');
    const specialists = agents.filter(a => a.type === 'specialist');
    const analysts = agents.filter(a => a.type === 'analyst');
    const creators = agents.filter(a => a.type === 'creator');

    // Position coordinators at center
    if (coordinators.length > 0) {
      this.positionAgentsInRing(coordinators, positions, 0, config.centerRadius, 0);
    }

    // Position specialists in first orbit
    if (specialists.length > 0) {
      this.positionAgentsInRing(
        specialists,
        positions,
        config.orbitalRadius,
        config.orbitalRadius * 1.2,
        1
      );
    }

    // Position analysts in second orbit
    if (analysts.length > 0) {
      this.positionAgentsInRing(
        analysts,
        positions,
        config.orbitalRadius * 1.5,
        config.orbitalRadius * 1.7,
        -0.5
      );
    }

    // Position creators in third orbit
    if (creators.length > 0) {
      this.positionAgentsInRing(
        creators,
        positions,
        config.orbitalRadius * 2,
        config.orbitalRadius * 2.2,
        0.5
      );
    }
  }

  /**
   * Calculate simple circular layout
   */
  private calculateCircularLayout(
    agents: AgentState[],
    positions: Map<string, LayoutPosition>
  ): void {
    const config = this.layoutConfig();
    this.positionAgentsInRing(agents, positions, config.orbitalRadius, config.orbitalRadius * 1.2, 0);
  }

  /**
   * Position agents in a ring formation
   */
  private positionAgentsInRing(
    agents: AgentState[],
    positions: Map<string, LayoutPosition>,
    minRadius: number,
    maxRadius: number,
    heightOffset: number
  ): void {
    const config = this.layoutConfig();
    const agentCount = agents.length;
    
    if (agentCount === 0) return;

    agents.forEach((agent, index) => {
      const angle = (index / agentCount) * Math.PI * 2;
      const radius = minRadius + (maxRadius - minRadius) * Math.random();
      
      // Add some randomness for natural look
      const radiusVariation = radius * 0.2 * (Math.random() - 0.5);
      const finalRadius = radius + radiusVariation;
      
      const targetX = Math.cos(angle) * finalRadius;
      const targetZ = Math.sin(angle) * finalRadius;
      const targetY = heightOffset + (Math.random() - 0.5) * config.verticalSpread;

      const existingPosition = positions.get(agent.id);
      
      if (existingPosition) {
        // Update existing position
        existingPosition.targetX = targetX;
        existingPosition.targetY = targetY;
        existingPosition.targetZ = targetZ;
        
        if (!existingPosition.isAnimating) {
          this.startPositionAnimation(existingPosition);
        }
      } else {
        // Create new position
        const newPosition: LayoutPosition = {
          x: targetX,
          y: targetY,
          z: targetZ,
          targetX,
          targetY,
          targetZ,
          isAnimating: false,
          animationProgress: 1,
        };
        
        positions.set(agent.id, newPosition);
      }
    });

    // Apply collision avoidance if enabled
    if (config.collisionAvoidance) {
      this.applyCollisionAvoidance(agents, positions);
    }
  }

  /**
   * Apply collision avoidance between agents
   */
  private applyCollisionAvoidance(
    agents: AgentState[],
    positions: Map<string, LayoutPosition>
  ): void {
    const minDistance = 1.5; // Minimum distance between agents
    const iterations = 3; // Number of collision resolution iterations

    for (let iter = 0; iter < iterations; iter++) {
      const agentPositions = agents
        .map(agent => ({
          agent,
          position: positions.get(agent.id)!,
        }))
        .filter(item => item.position);

      for (let i = 0; i < agentPositions.length; i++) {
        for (let j = i + 1; j < agentPositions.length; j++) {
          const pos1 = agentPositions[i].position;
          const pos2 = agentPositions[j].position;

          const distance = Math.sqrt(
            Math.pow(pos1.targetX - pos2.targetX, 2) +
            Math.pow(pos1.targetY - pos2.targetY, 2) +
            Math.pow(pos1.targetZ - pos2.targetZ, 2)
          );

          if (distance < minDistance) {
            // Calculate separation vector
            const dx = pos1.targetX - pos2.targetX;
            const dy = pos1.targetY - pos2.targetY;
            const dz = pos1.targetZ - pos2.targetZ;

            const normalizedDistance = Math.max(distance, 0.01);
            const separationForce = (minDistance - distance) / normalizedDistance * 0.5;

            // Apply separation
            pos1.targetX += dx * separationForce;
            pos1.targetY += dy * separationForce;
            pos1.targetZ += dz * separationForce;

            pos2.targetX -= dx * separationForce;
            pos2.targetY -= dy * separationForce;
            pos2.targetZ -= dz * separationForce;
          }
        }
      }
    }
  }

  /**
   * Start position animation for an agent
   */
  private startPositionAnimation(position: LayoutPosition): void {
    position.isAnimating = true;
    position.animationProgress = 0;
  }

  /**
   * Update existing agent position
   */
  private updateAgentPosition(agent: AgentState, position: LayoutPosition): void {
    // Check if agent properties that affect positioning have changed
    // For now, we'll recalculate layout on any agent update
    this.recalculateLayout();
  }

  /**
   * Add new agent to constellation
   */
  private addNewAgent(agent: AgentState): void {
    // Calculate position for new agent
    const config = this.layoutConfig();
    const existingAgents = this.agentCommunication.availableAgents();
    
    // For now, add to appropriate orbit based on type
    let radius = config.orbitalRadius;
    let height = 0;
    
    switch (agent.type) {
      case 'coordinator':
        radius = config.centerRadius;
        height = 0;
        break;
      case 'specialist':
        radius = config.orbitalRadius;
        height = 1;
        break;
      case 'analyst':
        radius = config.orbitalRadius * 1.5;
        height = -0.5;
        break;
      case 'creator':
        radius = config.orbitalRadius * 2;
        height = 0.5;
        break;
    }

    // Find a good angle that doesn't conflict with existing agents
    const angle = this.findOptimalAngle(radius, existingAgents);
    
    const targetX = Math.cos(angle) * radius;
    const targetZ = Math.sin(angle) * radius;
    const targetY = height + (Math.random() - 0.5) * config.verticalSpread * 0.5;

    const newPosition: LayoutPosition = {
      x: targetX + (Math.random() - 0.5) * 2, // Start slightly offset for animation
      y: targetY + (Math.random() - 0.5) * 2,
      z: targetZ + (Math.random() - 0.5) * 2,
      targetX,
      targetY,
      targetZ,
      isAnimating: true,
      animationProgress: 0,
    };

    const currentPositions = this.agentPositions();
    const newPositions = new Map(currentPositions);
    newPositions.set(agent.id, newPosition);
    this.agentPositions.set(newPositions);
  }

  /**
   * Find optimal angle for placing new agent
   */
  private findOptimalAngle(radius: number, existingAgents: AgentState[]): number {
    const existingPositions = existingAgents
      .map(agent => this.agentPositions().get(agent.id))
      .filter(pos => pos && Math.abs(Math.sqrt(pos.x * pos.x + (pos.z || 0) * (pos.z || 0)) - radius) < 1)
      .map(pos => Math.atan2(pos!.z || 0, pos!.x));

    if (existingPositions.length === 0) {
      return Math.random() * Math.PI * 2;
    }

    // Find the largest gap between existing positions
    existingPositions.sort((a, b) => a - b);
    
    let maxGap = 0;
    let bestAngle = 0;
    
    for (let i = 0; i < existingPositions.length; i++) {
      const current = existingPositions[i];
      const next = existingPositions[(i + 1) % existingPositions.length];
      
      let gap = next - current;
      if (gap < 0) gap += Math.PI * 2;
      
      if (gap > maxGap) {
        maxGap = gap;
        bestAngle = current + gap / 2;
      }
    }

    return bestAngle;
  }

  /**
   * Start animation loop for smooth position transitions
   */
  private startAnimationLoop(): void {
    if (this.animationRequestId !== null) return;

    const animate = (currentTime: number) => {
      if (!this.isLayoutActive()) return;

      const deltaTime = currentTime - this.lastUpdateTime;
      this.lastUpdateTime = currentTime;

      this.updateAnimations(deltaTime);
      this.animationRequestId = requestAnimationFrame(animate);
    };

    this.animationRequestId = requestAnimationFrame(animate);
  }

  /**
   * Stop animation loop
   */
  private stopAnimationLoop(): void {
    if (this.animationRequestId !== null) {
      cancelAnimationFrame(this.animationRequestId);
      this.animationRequestId = null;
    }
  }

  /**
   * Update position animations
   */
  private updateAnimations(deltaTime: number): void {
    const config = this.layoutConfig();
    const positions = this.agentPositions();
    let hasAnimations = false;

    positions.forEach((position) => {
      if (position.isAnimating) {
        hasAnimations = true;
        
        // Update animation progress
        position.animationProgress += deltaTime / config.animationDuration;
        position.animationProgress = Math.min(position.animationProgress, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - position.animationProgress, 3);

        // Interpolate position
        position.x = this.lerp(position.x, position.targetX, easeOut);
        position.y = this.lerp(position.y, position.targetY, easeOut);
        position.z = this.lerp(position.z || 0, position.targetZ, easeOut);

        // Check if animation is complete
        if (position.animationProgress >= 1) {
          position.isAnimating = false;
          position.x = position.targetX;
          position.y = position.targetY;
          position.z = position.targetZ;
        }
      }
    });

    // Update agent communication service with new positions
    if (hasAnimations) {
      this.updateAgentPositions();
    }
  }

  /**
   * Linear interpolation
   */
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  /**
   * Update agent positions in communication service
   */
  private updateAgentPositions(): void {
    this.agentPositions().forEach((position, agentId) => {
      const agent = this.agentCommunication.getAgent(agentId);
      if (agent) {
        // Update agent position
        agent.position = {
          x: position.x,
          y: position.y,
          z: position.z,
        };
      }
    });
  }
}