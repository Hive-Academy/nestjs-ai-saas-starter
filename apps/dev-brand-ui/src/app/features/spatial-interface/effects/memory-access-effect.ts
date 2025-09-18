import * as THREE from 'three';
import { gsap } from 'gsap';

export interface MemoryAccessConfig {
  agentMesh: THREE.Group;
  memoryType: 'chromadb' | 'neo4j' | 'workflow';
  duration: number; // milliseconds
  intensity: number; // 0-1
}

/**
 * Memory Access Effect
 * Creates pulsing visual effects around agents during memory operations
 * ChromaDB operations: Blue pulse
 * Neo4j operations: Green pulse
 * Workflow operations: Purple pulse
 */
export class MemoryAccessEffect {
  private config: MemoryAccessConfig;
  private isActive = false;
  private isCompleted = false;

  // Three.js objects
  private pulseRing: THREE.Mesh | null = null;
  private glowSphere: THREE.Mesh | null = null;
  private particleSystem: THREE.Points | null = null;

  // Animation properties
  private startTime = 0;
  private pulseTween: gsap.core.Tween | null = null;
  private glowTween: gsap.core.Tween | null = null;

  // Shader uniforms for optimized rendering
  private pulseUniforms = {
    time: { value: 0 },
    intensity: { value: 0 },
    color: { value: new THREE.Color() },
    opacity: { value: 0 },
  };

  constructor(config: MemoryAccessConfig) {
    this.config = config;
    this.setupVisualElements();
  }

  /**
   * Setup visual elements for memory access effect
   */
  private setupVisualElements(): void {
    this.createPulseRing();
    this.createGlowSphere();
    this.createMemoryParticles();
  }

  /**
   * Create pulsing ring effect
   */
  private createPulseRing(): void {
    const agentSize = this.getAgentSize();
    const ringGeometry = new THREE.RingGeometry(
      agentSize * 1.2,
      agentSize * 2.0,
      32
    );

    // Shader material for optimized pulsing effect
    const ringMaterial = new THREE.ShaderMaterial({
      uniforms: this.pulseUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          float distance = length(vUv - 0.5) * 2.0;
          float pulse = sin(time * 8.0) * 0.5 + 0.5;
          float alpha = (1.0 - distance) * intensity * pulse * opacity;
          
          // Create ring effect
          float ringMask = smoothstep(0.3, 0.5, distance) * smoothstep(1.0, 0.8, distance);
          alpha *= ringMask;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.pulseRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.pulseRing.rotation.x = Math.PI / 2; // Horizontal ring
    this.pulseRing.position.set(0, 0, 0);
    this.pulseRing.visible = false;

    this.config.agentMesh.add(this.pulseRing);
  }

  /**
   * Create glow sphere effect
   */
  private createGlowSphere(): void {
    const agentSize = this.getAgentSize();
    const sphereGeometry = new THREE.SphereGeometry(agentSize * 1.5, 16, 8);

    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color() },
        intensity: { value: 0 },
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
          float fresnel = 1.0 - abs(dot(vNormal, normalize(vPosition)));
          float pulse = sin(time * 6.0) * 0.3 + 0.7;
          float glow = pow(fresnel, 2.0) * intensity * pulse;
          
          gl_FragColor = vec4(color, glow * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });

    this.glowSphere = new THREE.Mesh(sphereGeometry, glowMaterial);
    this.glowSphere.visible = false;

    this.config.agentMesh.add(this.glowSphere);
  }

  /**
   * Create particle system for memory type indication
   */
  private createMemoryParticles(): void {
    const particleCount = Math.floor(20 * this.config.intensity);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const color = this.getMemoryColor();
    const agentSize = this.getAgentSize();

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random positions around the agent in a sphere
      const radius = agentSize * (2.0 + Math.random() * 1.0);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.02 + Math.random() * 0.03;
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
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        uniform float intensity;
        
        void main() {
          vColor = color;
          vSize = size * intensity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = vSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          float alpha = 1.0 - distance * 2.0;
          float pulse = sin(time * 4.0) * 0.3 + 0.7;
          
          gl_FragColor = vec4(vColor, alpha * pulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.particleSystem.visible = false;

    this.config.agentMesh.add(this.particleSystem);
  }

  /**
   * Start the memory access effect
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = Date.now();
    this.isCompleted = false;

    // Set colors based on memory type
    const color = this.getMemoryColor();
    this.pulseUniforms.color.value.copy(color);

    if (this.glowSphere?.material instanceof THREE.ShaderMaterial) {
      this.glowSphere.material.uniforms['color'].value.copy(color);
    }

    // Show visual elements
    if (this.pulseRing) this.pulseRing.visible = true;
    if (this.glowSphere) this.glowSphere.visible = true;
    if (this.particleSystem) this.particleSystem.visible = true;

    // Animate pulse ring
    this.pulseTween = gsap.fromTo(
      this.pulseUniforms.opacity,
      { value: 0 },
      {
        value: 1,
        duration: (this.config.duration / 1000) * 0.2, // 20% of duration for fade in
        ease: 'power2.out',
        onComplete: () => {
          // Hold for middle 60% of duration
          gsap.to(this.pulseUniforms.opacity, {
            value: 0,
            duration: (this.config.duration / 1000) * 0.2, // 20% for fade out
            delay: (this.config.duration / 1000) * 0.6, // After 60% hold
            ease: 'power2.in',
            onComplete: () => {
              this.complete();
            },
          });
        },
      }
    );

    // Animate intensity
    gsap.fromTo(
      this.pulseUniforms.intensity,
      { value: 0 },
      {
        value: this.config.intensity,
        duration: (this.config.duration / 1000) * 0.3,
        ease: 'power2.out',
      }
    );

    console.log(`Memory access effect started: ${this.config.memoryType}`);
  }

  /**
   * Update the effect (called from render loop)
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    const elapsed = (Date.now() - this.startTime) / 1000;

    // Update shader time uniforms
    this.pulseUniforms.time.value = elapsed;

    if (this.glowSphere?.material instanceof THREE.ShaderMaterial) {
      this.glowSphere.material.uniforms['time'].value = elapsed;
    }

    if (this.particleSystem?.material instanceof THREE.ShaderMaterial) {
      this.particleSystem.material.uniforms['time'].value = elapsed;
      this.particleSystem.material.uniforms['intensity'].value =
        this.pulseUniforms.intensity.value;
    }

    // Auto-complete if duration exceeded (fallback)
    if (elapsed > this.config.duration / 1000 + 1) {
      this.complete();
    }
  }

  /**
   * Complete the effect
   */
  private complete(): void {
    if (this.isCompleted) return;

    this.isActive = false;
    this.isCompleted = true;

    // Hide visual elements
    if (this.pulseRing) this.pulseRing.visible = false;
    if (this.glowSphere) this.glowSphere.visible = false;
    if (this.particleSystem) this.particleSystem.visible = false;

    // Kill animations
    if (this.pulseTween) {
      this.pulseTween.kill();
      this.pulseTween = null;
    }
    if (this.glowTween) {
      this.glowTween.kill();
      this.glowTween = null;
    }

    console.log(`Memory access effect completed: ${this.config.memoryType}`);
  }

  /**
   * Check if effect is completed
   */
  getIsCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.complete();

    // Remove from agent mesh and dispose geometries/materials
    if (this.pulseRing) {
      this.config.agentMesh.remove(this.pulseRing);
      this.pulseRing.geometry.dispose();
      if (this.pulseRing.material instanceof THREE.Material) {
        this.pulseRing.material.dispose();
      }
      this.pulseRing = null;
    }

    if (this.glowSphere) {
      this.config.agentMesh.remove(this.glowSphere);
      this.glowSphere.geometry.dispose();
      if (this.glowSphere.material instanceof THREE.Material) {
        this.glowSphere.material.dispose();
      }
      this.glowSphere = null;
    }

    if (this.particleSystem) {
      this.config.agentMesh.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      if (this.particleSystem.material instanceof THREE.Material) {
        this.particleSystem.material.dispose();
      }
      this.particleSystem = null;
    }
  }

  /**
   * Get color based on memory type
   */
  private getMemoryColor(): THREE.Color {
    switch (this.config.memoryType) {
      case 'chromadb':
        return new THREE.Color(0x4a90e2); // Blue
      case 'neo4j':
        return new THREE.Color(0x7ed321); // Green
      case 'workflow':
        return new THREE.Color(0x9013fe); // Purple
      default:
        return new THREE.Color(0x50e3c2); // Teal
    }
  }

  /**
   * Get agent size for scaling effects
   */
  private getAgentSize(): number {
    // Find the core mesh to determine size
    let size = 0.5; // Default size

    this.config.agentMesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.BufferGeometry
      ) {
        const box = new THREE.Box3().setFromObject(child);
        const agentSize = box.getSize(new THREE.Vector3()).length() / 2;
        if (agentSize > 0.1) {
          // Reasonable size check
          size = agentSize;
        }
      }
    });

    return size;
  }
}
