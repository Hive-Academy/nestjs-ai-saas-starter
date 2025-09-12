import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { AgentState } from '../../../core/interfaces/agent-state.interface';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';
import { AgentShaderFactory } from '../shaders/agent-state.shader';

export interface Agent3DConfig {
  geometryType: 'sphere' | 'octahedron' | 'dodecahedron' | 'icosahedron';
  baseColor: string;
  size: number;
  glowIntensity: number;
  animationSpeed: number;
}

/**
 * Agent3D Component
 * Renders individual AI agents as interactive 3D objects in the constellation
 * Provides real-time visual feedback for agent states and activities
 */
@Component({
  selector: 'brand-agent-3d',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Agent 3D visualization is handled through Three.js, no DOM template needed -->
  `,
})
export class Agent3DComponent implements OnInit, OnDestroy {
  private readonly threeService = inject(ThreeIntegrationService);

  // Input properties
  @Input({ required: true }) agent!: AgentState;
  @Input({ required: true }) sceneId!: string;
  @Input() config?: Partial<Agent3DConfig>;

  // Three.js objects
  private agentMesh: THREE.Group | null = null;
  private coreMesh: THREE.Mesh | null = null;
  private glowMesh: THREE.Mesh | null = null;
  private ringMesh: THREE.Mesh | null = null;
  private particleSystem: THREE.Points | null = null;

  // Animation properties
  private clock = new THREE.Clock();

  // Enhanced materials for state visualization
  private enhancedCoreMaterial: THREE.ShaderMaterial | null = null;
  private memoryActivityVector = new THREE.Vector3(0, 0, 0);

  // Component state
  private readonly isInitialized = signal(false);
  private readonly isHovered = signal(false);
  private readonly isSelected = signal(false);

  // Computed configuration
  private readonly agentConfig = computed(() => {
    const defaults: Agent3DConfig = {
      geometryType: this.getGeometryTypeByAgentType(this.agent.type),
      baseColor: this.agent.personality.color,
      size: this.getSizeByAgentType(this.agent.type),
      glowIntensity: 0.5,
      animationSpeed: 1.0,
    };
    return { ...defaults, ...this.config };
  });

  // Status-based visual effects
  private readonly statusEffects = computed(() => {
    const status = this.agent.status;
    switch (status) {
      case 'idle':
        return {
          coreOpacity: 0.8,
          glowIntensity: 0.3,
          pulseDuration: 3.0,
          particleCount: 0,
          ringSpeed: 0.5,
        };
      case 'thinking':
        return {
          coreOpacity: 0.9,
          glowIntensity: 0.7,
          pulseDuration: 1.5,
          particleCount: 50,
          ringSpeed: 1.5,
        };
      case 'executing':
        return {
          coreOpacity: 1.0,
          glowIntensity: 1.0,
          pulseDuration: 0.8,
          particleCount: 100,
          ringSpeed: 2.0,
        };
      case 'waiting':
        return {
          coreOpacity: 0.6,
          glowIntensity: 0.2,
          pulseDuration: 4.0,
          particleCount: 0,
          ringSpeed: 0.3,
        };
      case 'error':
        return {
          coreOpacity: 0.9,
          glowIntensity: 0.8,
          pulseDuration: 0.5,
          particleCount: 30,
          ringSpeed: 3.0,
          errorColor: '#ff4444',
        };
      default:
        return {
          coreOpacity: 0.8,
          glowIntensity: 0.5,
          pulseDuration: 2.0,
          particleCount: 0,
          ringSpeed: 1.0,
        };
    }
  });

  constructor() {
    // Update visual effects when agent state changes
    effect(() => {
      if (this.isInitialized()) {
        this.updateVisualEffects();
      }
    });

    // Update agent position when it changes
    effect(() => {
      if (this.isInitialized() && this.agentMesh) {
        const pos = this.agent.position;
        this.agentMesh.position.set(pos.x, pos.y, pos.z || 0);
      }
    });
  }

  ngOnInit(): void {
    this.initializeAgent3D();
  }

  ngOnDestroy(): void {
    this.disposeAgent3D();
  }

  /**
   * Initialize 3D representation of the agent
   */
  private initializeAgent3D(): void {
    const sceneInstance = this.threeService.getScene(this.sceneId);
    if (!sceneInstance) {
      console.error(
        `Scene ${this.sceneId} not found for agent ${this.agent.id}`
      );
      return;
    }

    // Create main agent group
    this.agentMesh = new THREE.Group();
    this.agentMesh.name = `agent-${this.agent.id}`;
    this.agentMesh.userData = { agentId: this.agent.id, component: this };

    // Create core geometry
    this.createCoreGeometry();

    // Create glow effect
    this.createGlowEffect();

    // Create activity ring
    this.createActivityRing();

    // Create particle system for state effects
    this.createParticleSystem();

    // Position the agent
    const pos = this.agent.position;
    this.agentMesh.position.set(pos.x, pos.y, pos.z || 0);

    // Add to scene
    sceneInstance.scene.add(this.agentMesh);

    this.isInitialized.set(true);
    console.log(`Agent 3D initialized: ${this.agent.name} (${this.agent.id})`);
  }

  /**
   * Create the core geometry based on agent type
   */
  private createCoreGeometry(): void {
    if (!this.agentMesh) return;

    const config = this.agentConfig();
    let geometry: THREE.BufferGeometry;

    switch (config.geometryType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(config.size, 32, 16);
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(config.size);
        break;
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(config.size);
        break;
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(config.size);
        break;
      default:
        geometry = new THREE.SphereGeometry(config.size, 32, 16);
    }

    // Create enhanced shader material for better visual feedback
    this.enhancedCoreMaterial =
      AgentShaderFactory.createEnhancedAgentCoreMaterial({
        baseColor: { value: new THREE.Color(config.baseColor) },
        opacity: { value: 0.9 },
        agentStatus: { value: this.getStatusIndex(this.agent.status) },
        memoryActivity: { value: this.memoryActivityVector },
      });

    this.coreMesh = new THREE.Mesh(geometry, this.enhancedCoreMaterial);
    this.coreMesh.castShadow = true;
    this.coreMesh.receiveShadow = true;

    this.agentMesh.add(this.coreMesh);
  }

  /**
   * Create glow effect around the agent
   */
  private createGlowEffect(): void {
    if (!this.agentMesh || !this.coreMesh) return;

    const config = this.agentConfig();
    const glowGeometry = this.coreMesh.geometry.clone();

    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(config.baseColor) },
        intensity: { value: config.glowIntensity },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float glow = pow(0.8 - dot(vNormal, normalize(vPosition)), 2.0);
          float pulse = 0.5 + 0.5 * sin(time * 2.0);
          gl_FragColor = vec4(color, glow * intensity * pulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });

    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.scale.setScalar(1.2);
    this.agentMesh.add(this.glowMesh);
  }

  /**
   * Create activity ring for tool execution visualization
   */
  private createActivityRing(): void {
    if (!this.agentMesh) return;

    const config = this.agentConfig();
    const ringGeometry = new THREE.RingGeometry(
      config.size * 1.5,
      config.size * 1.7,
      32
    );

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: config.baseColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    this.ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ringMesh.rotation.x = Math.PI / 2; // Horizontal ring
    this.agentMesh.add(this.ringMesh);
  }

  /**
   * Create particle system for state effects
   */
  private createParticleSystem(): void {
    if (!this.agentMesh) return;

    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color(this.agentConfig().baseColor);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random positions around the agent
      positions[i3] = (Math.random() - 0.5) * 4;
      positions[i3 + 1] = (Math.random() - 0.5) * 4;
      positions[i3 + 2] = (Math.random() - 0.5) * 4;

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.particleSystem.visible = false; // Initially hidden
    this.agentMesh.add(this.particleSystem);
  }

  /**
   * Update visual effects based on agent status
   */
  private updateVisualEffects(): void {
    const effects = this.statusEffects();

    // Update enhanced shader material
    if (this.enhancedCoreMaterial) {
      this.enhancedCoreMaterial.uniforms['opacity'].value = effects.coreOpacity;
      this.enhancedCoreMaterial.uniforms['agentStatus'].value =
        this.getStatusIndex(this.agent.status);

      // Update memory activity indicators
      this.updateMemoryActivity();
      this.enhancedCoreMaterial.uniforms['memoryActivity'].value =
        this.memoryActivityVector;
    }

    if (this.glowMesh?.material instanceof THREE.ShaderMaterial) {
      this.glowMesh.material.uniforms['intensity'].value =
        effects.glowIntensity;
    }

    if (this.particleSystem) {
      this.particleSystem.visible = effects.particleCount > 0;
    }

    // Update ring animation speed
    if (this.ringMesh) {
      this.ringMesh.userData['rotationSpeed'] = effects.ringSpeed;
    }
  }

  /**
   * Animation update method (called from render loop)
   */
  public updateAnimation(): void {
    if (!this.isInitialized()) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update enhanced core material
    if (this.enhancedCoreMaterial) {
      this.enhancedCoreMaterial.uniforms['time'].value = elapsed;
    }

    // Update glow animation
    if (this.glowMesh?.material instanceof THREE.ShaderMaterial) {
      this.glowMesh.material.uniforms['time'].value = elapsed;
    }

    // Update ring rotation
    if (this.ringMesh) {
      const speed = this.ringMesh.userData['rotationSpeed'] || 1.0;
      this.ringMesh.rotation.z += delta * speed;
    }

    // Update particle animation for active states
    if (this.particleSystem && this.particleSystem.visible) {
      this.animateParticles(elapsed);
    }

    // Update core mesh subtle rotation
    if (this.coreMesh) {
      this.coreMesh.rotation.y += delta * 0.2;
    }
  }

  /**
   * Animate particle system
   */
  private animateParticles(elapsed: number): void {
    if (!this.particleSystem) return;

    const positions = this.particleSystem.geometry.attributes['position']
      .array as Float32Array;
    const particleCount = positions.length / 3;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Orbital motion around the agent
      const radius = 2 + Math.sin(elapsed + i) * 0.5;
      const angle = elapsed * 0.5 + i * 0.1;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(elapsed + i) * 0.5;
      positions[i3 + 2] = Math.sin(angle) * radius;
    }

    this.particleSystem.geometry.attributes['position'].needsUpdate = true;
  }

  /**
   * Handle mouse hover events
   */
  public onHover(isHovering: boolean): void {
    this.isHovered.set(isHovering);

    if (this.enhancedCoreMaterial) {
      const targetOpacity = isHovering ? 1.0 : this.statusEffects().coreOpacity;
      this.enhancedCoreMaterial.uniforms['opacity'].value = targetOpacity;
    }

    if (this.glowMesh?.material instanceof THREE.ShaderMaterial) {
      const baseIntensity = this.statusEffects().glowIntensity;
      const targetIntensity = isHovering ? baseIntensity * 1.5 : baseIntensity;
      this.glowMesh.material.uniforms['intensity'].value = targetIntensity;
    }
  }

  /**
   * Handle selection events
   */
  public onSelect(isSelected: boolean): void {
    this.isSelected.set(isSelected);

    if (this.ringMesh?.material instanceof THREE.MeshBasicMaterial) {
      this.ringMesh.material.opacity = isSelected ? 1.0 : 0.6;
      this.ringMesh.userData['rotationSpeed'] = isSelected
        ? 2.0
        : this.statusEffects().ringSpeed;
    }
  }

  /**
   * Get geometry type based on agent type
   */
  private getGeometryTypeByAgentType(
    type: AgentState['type']
  ): Agent3DConfig['geometryType'] {
    switch (type) {
      case 'coordinator':
        return 'icosahedron';
      case 'specialist':
        return 'octahedron';
      case 'analyst':
        return 'dodecahedron';
      case 'creator':
        return 'sphere';
      default:
        return 'sphere';
    }
  }

  /**
   * Get size based on agent type
   */
  private getSizeByAgentType(type: AgentState['type']): number {
    switch (type) {
      case 'coordinator':
        return 0.6; // Largest
      case 'specialist':
        return 0.4;
      case 'analyst':
        return 0.4;
      case 'creator':
        return 0.5;
      default:
        return 0.4;
    }
  }

  /**
   * Get status index for shader uniforms
   */
  private getStatusIndex(status: AgentState['status']): number {
    switch (status) {
      case 'idle':
        return 0;
      case 'thinking':
        return 1;
      case 'executing':
        return 2;
      case 'waiting':
        return 3;
      case 'error':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Update memory activity indicators for shader
   */
  private updateMemoryActivity(): void {
    // Reset memory activity
    this.memoryActivityVector.set(0, 0, 0);

    // Check for current tool executions that might indicate memory access
    this.agent.currentTools.forEach((tool) => {
      if (tool.status === 'running') {
        // Simulate memory activity based on tool type
        if (
          tool.toolName.toLowerCase().includes('search') ||
          tool.toolName.toLowerCase().includes('vector')
        ) {
          this.memoryActivityVector.x = Math.max(
            this.memoryActivityVector.x,
            tool.progress / 100
          ); // ChromaDB
        }
        if (
          tool.toolName.toLowerCase().includes('graph') ||
          tool.toolName.toLowerCase().includes('relationship')
        ) {
          this.memoryActivityVector.y = Math.max(
            this.memoryActivityVector.y,
            tool.progress / 100
          ); // Neo4j
        }
        if (
          tool.toolName.toLowerCase().includes('workflow') ||
          tool.toolName.toLowerCase().includes('agent')
        ) {
          this.memoryActivityVector.z = Math.max(
            this.memoryActivityVector.z,
            tool.progress / 100
          ); // Workflow
        }
      }
    });

    // Add status-based memory activity
    if (this.agent.status === 'thinking') {
      this.memoryActivityVector.z = Math.max(this.memoryActivityVector.z, 0.6);
    } else if (this.agent.status === 'executing') {
      this.memoryActivityVector.x = Math.max(this.memoryActivityVector.x, 0.8);
      this.memoryActivityVector.y = Math.max(this.memoryActivityVector.y, 0.6);
    }
  }

  /**
   * Clean up 3D objects
   */
  private disposeAgent3D(): void {
    if (this.agentMesh) {
      const sceneInstance = this.threeService.getScene(this.sceneId);
      if (sceneInstance) {
        sceneInstance.scene.remove(this.agentMesh);
      }

      // Dispose of all geometries and materials
      this.agentMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      this.agentMesh = null;
    }

    this.coreMesh = null;
    this.glowMesh = null;
    this.ringMesh = null;
    this.particleSystem = null;
    this.enhancedCoreMaterial = null;
  }
}
