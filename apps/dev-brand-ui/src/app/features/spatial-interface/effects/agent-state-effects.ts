import * as THREE from 'three';
import type {
  ToolExecution,
  MemoryContext,
  AgentState,
} from '../../../core/interfaces/agent-state.interface';

export interface MemoryAccessIndicator {
  id: string;
  type: 'chromadb' | 'neo4j' | 'workflow';
  intensity: number; // 0-1
  duration: number; // milliseconds
  startTime: number;
  position: THREE.Vector3;
  color: THREE.Color;
}

export interface ToolProgressRing {
  id: string;
  toolName: string;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'completed' | 'error';
  startAngle: number;
  endAngle: number;
  color: THREE.Color;
  thickness: number;
}

export interface CommunicationStream {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'data' | 'command' | 'response';
  particles: THREE.Vector3[];
  speed: number;
  color: THREE.Color;
  intensity: number;
  startTime: number;
  duration: number;
}

/**
 * Agent State Effects Manager
 * Handles advanced visual feedback for agent states, memory access, tool execution, and communication
 */
export class AgentStateEffects {
  private clock = new THREE.Clock();
  private memoryIndicators: Map<string, MemoryAccessIndicator> = new Map();
  private toolRings: Map<string, ToolProgressRing> = new Map();
  private communicationStreams: Map<string, CommunicationStream> = new Map();

  // Three.js objects for rendering
  private memoryIndicatorMeshes: Map<string, THREE.Mesh> = new Map();
  private toolRingMeshes: Map<string, THREE.Mesh> = new Map();
  private communicationMeshes: Map<string, THREE.Points> = new Map();

  // Color schemes for different states
  private readonly memoryColors = {
    chromadb: new THREE.Color(0x4caf50), // Green for vector database
    neo4j: new THREE.Color(0x2196f3), // Blue for graph database
    workflow: new THREE.Color(0xff9800), // Orange for workflow operations
  };

  private readonly toolColors = {
    pending: new THREE.Color(0x9e9e9e), // Gray
    running: new THREE.Color(0x2196f3), // Blue
    completed: new THREE.Color(0x4caf50), // Green
    error: new THREE.Color(0xf44336), // Red
  };

  private readonly communicationColors = {
    data: new THREE.Color(0x3f51b5), // Indigo for data flow
    command: new THREE.Color(0xff5722), // Deep orange for commands
    response: new THREE.Color(0x4caf50), // Green for responses
  };

  constructor(private scene: THREE.Scene) {
    this.clock.start();
  }

  /**
   * Create memory access indicator for database queries
   */
  createMemoryAccessIndicator(
    agentId: string,
    memoryType: 'chromadb' | 'neo4j' | 'workflow',
    position: THREE.Vector3,
    intensity = 1.0,
    duration = 2000
  ): void {
    const id = `${agentId}-memory-${Date.now()}`;

    const indicator: MemoryAccessIndicator = {
      id,
      type: memoryType,
      intensity,
      duration,
      startTime: this.clock.getElapsedTime() * 1000,
      position: position.clone(),
      color: this.memoryColors[memoryType].clone(),
    };

    this.memoryIndicators.set(id, indicator);
    this.createMemoryIndicatorMesh(indicator);
  }

  /**
   * Update tool execution progress ring
   */
  updateToolProgressRing(
    agentId: string,
    toolExecution: ToolExecution,
    position: THREE.Vector3,
    radius = 1.0
  ): void {
    const id = `${agentId}-tool-${toolExecution.id}`;

    const progressAngle = (toolExecution.progress / 100) * Math.PI * 2;

    const ring: ToolProgressRing = {
      id,
      toolName: toolExecution.toolName,
      progress: toolExecution.progress,
      status: toolExecution.status,
      startAngle: -Math.PI / 2, // Start at top
      endAngle: -Math.PI / 2 + progressAngle,
      color: this.toolColors[toolExecution.status].clone(),
      thickness: 0.1,
    };

    this.toolRings.set(id, ring);
    this.createToolProgressMesh(ring, position, radius);
  }

  /**
   * Create communication stream between agents
   */
  createCommunicationStream(
    fromAgentId: string,
    toAgentId: string,
    fromPosition: THREE.Vector3,
    toPosition: THREE.Vector3,
    type: 'data' | 'command' | 'response' = 'data',
    duration = 1500
  ): void {
    const id = `${fromAgentId}-to-${toAgentId}-${Date.now()}`;

    // Create particle path from source to destination
    const particleCount = 20;
    const particles: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1);
      const position = new THREE.Vector3().lerpVectors(
        fromPosition,
        toPosition,
        t
      );
      // Add some curve to the path
      position.y += Math.sin(t * Math.PI) * 0.5;
      particles.push(position);
    }

    const stream: CommunicationStream = {
      id,
      fromAgentId,
      toAgentId,
      type,
      particles,
      speed: 2.0,
      color: this.communicationColors[type].clone(),
      intensity: 1.0,
      startTime: this.clock.getElapsedTime() * 1000,
      duration,
    };

    this.communicationStreams.set(id, stream);
    this.createCommunicationMesh(stream);
  }

  /**
   * Update all visual effects (called from render loop)
   */
  updateEffects(): void {
    const currentTime = this.clock.getElapsedTime() * 1000;

    this.updateMemoryIndicators(currentTime);
    this.updateToolRings(currentTime);
    this.updateCommunicationStreams(currentTime);
    this.cleanupExpiredEffects(currentTime);
  }

  /**
   * Handle agent memory context updates
   */
  handleMemoryUpdate(
    agentId: string,
    contexts: MemoryContext[],
    position: THREE.Vector3
  ): void {
    contexts.forEach((context) => {
      if (context.isActive) {
        this.createMemoryAccessIndicator(
          agentId,
          context.source,
          position,
          context.relevanceScore,
          1500
        );
      }
    });
  }

  /**
   * Handle tool execution updates
   */
  handleToolUpdate(
    agentId: string,
    toolExecution: ToolExecution,
    position: THREE.Vector3
  ): void {
    this.updateToolProgressRing(agentId, toolExecution, position);
  }

  /**
   * Handle inter-agent communication
   */
  handleAgentCommunication(
    fromAgent: AgentState,
    toAgent: AgentState,
    messageType: 'data' | 'command' | 'response' = 'data'
  ): void {
    const fromPos = new THREE.Vector3(
      fromAgent.position.x,
      fromAgent.position.y,
      fromAgent.position.z || 0
    );
    const toPos = new THREE.Vector3(
      toAgent.position.x,
      toAgent.position.y,
      toAgent.position.z || 0
    );

    this.createCommunicationStream(
      fromAgent.id,
      toAgent.id,
      fromPos,
      toPos,
      messageType
    );
  }

  /**
   * Clean up all effects
   */
  dispose(): void {
    // Dispose memory indicator meshes
    this.memoryIndicatorMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.memoryIndicatorMeshes.clear();

    // Dispose tool ring meshes
    this.toolRingMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.toolRingMeshes.clear();

    // Dispose communication meshes
    this.communicationMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.communicationMeshes.clear();

    // Clear data structures
    this.memoryIndicators.clear();
    this.toolRings.clear();
    this.communicationStreams.clear();
  }

  /**
   * Create memory indicator mesh with pulsing effect
   */
  private createMemoryIndicatorMesh(indicator: MemoryAccessIndicator): void {
    const geometry = new THREE.RingGeometry(0.2, 0.4, 16);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: indicator.color },
        intensity: { value: indicator.intensity },
        startTime: { value: indicator.startTime / 1000 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float intensity;
        uniform float startTime;
        varying vec2 vUv;
        
        void main() {
          float elapsed = time - startTime;
          float pulse = sin(elapsed * 8.0) * 0.5 + 0.5;
          float fade = 1.0 - min(elapsed / 2.0, 1.0);
          
          float dist = length(vUv - 0.5) * 2.0;
          float ring = 1.0 - smoothstep(0.3, 0.5, dist) - smoothstep(0.8, 1.0, dist);
          
          float alpha = ring * pulse * fade * intensity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(indicator.position);
    mesh.position.y += 1.0; // Slightly above the agent
    mesh.rotation.x = -Math.PI / 2; // Horizontal ring

    this.memoryIndicatorMeshes.set(indicator.id, mesh);
    this.scene.add(mesh);
  }

  /**
   * Create tool progress ring mesh
   */
  private createToolProgressMesh(
    ring: ToolProgressRing,
    position: THREE.Vector3,
    radius: number
  ): void {
    // Remove existing mesh if it exists
    const existingMesh = this.toolRingMeshes.get(ring.id);
    if (existingMesh) {
      this.scene.remove(existingMesh);
      existingMesh.geometry.dispose();
      if (existingMesh.material instanceof THREE.Material) {
        existingMesh.material.dispose();
      }
    }

    // Create arc geometry for progress ring
    const segments = 64;
    const geometry = new THREE.RingGeometry(
      radius * 1.2,
      radius * 1.3,
      segments,
      1,
      ring.startAngle,
      ring.endAngle - ring.startAngle
    );

    const material = new THREE.MeshBasicMaterial({
      color: ring.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.x = -Math.PI / 2; // Horizontal ring

    this.toolRingMeshes.set(ring.id, mesh);
    this.scene.add(mesh);
  }

  /**
   * Create communication stream mesh with animated particles
   */
  private createCommunicationMesh(stream: CommunicationStream): void {
    const particleCount = stream.particles.length;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const particle = stream.particles[i];
      const i3 = i * 3;

      positions[i3] = particle.x;
      positions[i3 + 1] = particle.y;
      positions[i3 + 2] = particle.z;

      colors[i3] = stream.color.r;
      colors[i3 + 1] = stream.color.g;
      colors[i3 + 2] = stream.color.b;

      sizes[i] = 0.05;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        startTime: { value: stream.startTime / 1000 },
        duration: { value: stream.duration / 1000 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        uniform float startTime;
        uniform float duration;
        
        void main() {
          vColor = color;
          
          float elapsed = time - startTime;
          float progress = elapsed / duration;
          float alpha = 1.0 - progress;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z) * alpha;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - (dist * 2.0);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const mesh = new THREE.Points(geometry, material);
    this.communicationMeshes.set(stream.id, mesh);
    this.scene.add(mesh);
  }

  /**
   * Update memory indicator animations
   */
  private updateMemoryIndicators(currentTime: number): void {
    this.memoryIndicatorMeshes.forEach((mesh, id) => {
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material.uniforms['time'].value = currentTime / 1000;
      }
    });
  }

  /**
   * Update tool ring animations
   */
  private updateToolRings(currentTime: number): void {
    // Tool rings are static progress indicators, no animation needed
    // They are updated when tool progress changes
  }

  /**
   * Update communication stream animations
   */
  private updateCommunicationStreams(currentTime: number): void {
    this.communicationMeshes.forEach((mesh, id) => {
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material.uniforms['time'].value = currentTime / 1000;
      }
    });
  }

  /**
   * Clean up expired effects
   */
  private cleanupExpiredEffects(currentTime: number): void {
    // Clean up expired memory indicators
    const expiredMemoryIndicators: string[] = [];
    this.memoryIndicators.forEach((indicator, id) => {
      if (currentTime - indicator.startTime > indicator.duration) {
        expiredMemoryIndicators.push(id);
      }
    });

    expiredMemoryIndicators.forEach((id) => {
      const mesh = this.memoryIndicatorMeshes.get(id);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        this.memoryIndicatorMeshes.delete(id);
      }
      this.memoryIndicators.delete(id);
    });

    // Clean up expired communication streams
    const expiredStreams: string[] = [];
    this.communicationStreams.forEach((stream, id) => {
      if (currentTime - stream.startTime > stream.duration) {
        expiredStreams.push(id);
      }
    });

    expiredStreams.forEach((id) => {
      const mesh = this.communicationMeshes.get(id);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        this.communicationMeshes.delete(id);
      }
      this.communicationStreams.delete(id);
    });

    // Clean up completed tool rings
    const expiredToolRings: string[] = [];
    this.toolRings.forEach((ring, id) => {
      if (ring.status === 'completed' || ring.status === 'error') {
        // Keep completed/error rings visible for a short time
        const indicator = this.memoryIndicators.get(
          id.replace('tool', 'memory')
        );
        if (!indicator || currentTime - (indicator.startTime + 2000) > 0) {
          expiredToolRings.push(id);
        }
      }
    });

    expiredToolRings.forEach((id) => {
      const mesh = this.toolRingMeshes.get(id);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        this.toolRingMeshes.delete(id);
      }
      this.toolRings.delete(id);
    });
  }
}
