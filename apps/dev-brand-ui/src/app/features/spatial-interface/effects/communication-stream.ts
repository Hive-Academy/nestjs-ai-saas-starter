import * as THREE from 'three';
import { gsap } from 'gsap';

export interface CommunicationConfig {
  fromAgentMesh: THREE.Group;
  toAgentMesh: THREE.Group;
  communicationType: 'coordination' | 'data_sharing' | 'error_reporting';
  intensity: number; // 0-1
  duration: number; // milliseconds
}

/**
 * Communication Stream Effect
 * Creates particle streams visualizing agent-to-agent communication flows
 * Uses THREE.Points for performance-optimized particle rendering
 */
export class CommunicationStream {
  private config: CommunicationConfig;
  private isActive = false;
  private isCompleted = false;

  // Three.js objects
  private particleSystem: THREE.Points | null = null;
  private streamCurve: THREE.CatmullRomCurve3 | null = null;
  private parentGroup: THREE.Group | null = null;

  // Animation properties
  private startTime = 0;
  private particles: {
    progress: number;
    speed: number;
    size: number;
    opacity: number;
  }[] = [];

  // Particle system properties
  private readonly particleCount: number;
  private positionAttribute: THREE.BufferAttribute | null = null;
  private colorAttribute: THREE.BufferAttribute | null = null;
  private sizeAttribute: THREE.BufferAttribute | null = null;
  private opacityAttribute: THREE.BufferAttribute | null = null;

  constructor(config: CommunicationConfig) {
    this.config = config;
    this.particleCount = Math.floor(20 + config.intensity * 30); // 20-50 particles
    this.setupParticles();
    this.setupStreamPath();
    this.setupParticleSystem();
  }

  /**
   * Setup individual particle properties
   */
  private setupParticles(): void {
    this.particles = [];

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        progress: -Math.random() * 0.5, // Stagger start times
        speed: 0.5 + Math.random() * 0.5, // Variable speeds
        size: 0.02 + Math.random() * 0.03,
        opacity: 0.8 + Math.random() * 0.2,
      });
    }
  }

  /**
   * Setup the 3D curve path between agents
   */
  private setupStreamPath(): void {
    const fromPos = this.getAgentPosition(this.config.fromAgentMesh);
    const toPos = this.getAgentPosition(this.config.toAgentMesh);

    // Create a curved path between agents
    const direction = new THREE.Vector3().subVectors(toPos, fromPos);
    const distance = direction.length();

    // Add curve points for natural arc
    const midPoint1 = new THREE.Vector3().addVectors(
      fromPos,
      direction.clone().multiplyScalar(0.3)
    );
    midPoint1.y += distance * 0.2; // Arc upward

    const midPoint2 = new THREE.Vector3().addVectors(
      fromPos,
      direction.clone().multiplyScalar(0.7)
    );
    midPoint2.y += distance * 0.15; // Gentle descent

    this.streamCurve = new THREE.CatmullRomCurve3([
      fromPos,
      midPoint1,
      midPoint2,
      toPos,
    ]);
  }

  /**
   * Setup Three.js particle system
   */
  private setupParticleSystem(): void {
    if (!this.streamCurve) return;

    // Create geometry with buffer attributes
    const geometry = new THREE.BufferGeometry();

    // Initialize attribute arrays
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const opacities = new Float32Array(this.particleCount);

    // Set initial positions along the curve
    const color = this.getCommunicationColor();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const particle = this.particles[i];

      // Initial position at start of curve
      const position = this.streamCurve.getPoint(
        Math.max(0, particle.progress)
      );
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      // Color
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Size and opacity
      sizes[i] = particle.size;
      opacities[i] = 0; // Start invisible
    }

    // Create buffer attributes
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.opacityAttribute = new THREE.BufferAttribute(opacities, 1);

    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('color', this.colorAttribute);
    geometry.setAttribute('size', this.sizeAttribute);
    geometry.setAttribute('customOpacity', this.opacityAttribute);

    // Create shader material for enhanced visual effects
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: this.config.intensity },
        streamType: { value: this.getCommunicationTypeValue() },
      },
      vertexShader: `
        attribute float size;
        attribute float customOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        varying float vSize;
        uniform float intensity;
        
        void main() {
          vColor = color;
          vOpacity = customOpacity * intensity;
          vSize = size;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = vSize * (300.0 / -mvPosition.z) * intensity;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float streamType;
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          // Create different particle shapes based on communication type
          float alpha = 1.0 - distance * 2.0;
          
          if (streamType == 0.0) { // coordination - solid circles
            alpha *= alpha;
          } else if (streamType == 1.0) { // data_sharing - rings
            alpha = smoothstep(0.2, 0.3, distance) * smoothstep(0.5, 0.4, distance);
          } else if (streamType == 2.0) { // error_reporting - pulsing
            float pulse = sin(time * 10.0) * 0.3 + 0.7;
            alpha *= pulse;
          }
          
          gl_FragColor = vec4(vColor, alpha * vOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);

    // Add to a parent group for proper positioning
    this.parentGroup = new THREE.Group();
    this.parentGroup.add(this.particleSystem);

    // Add to the scene (we'll use the from agent's parent scene)
    let sceneParent = this.config.fromAgentMesh.parent;
    while (sceneParent && !(sceneParent instanceof THREE.Scene)) {
      sceneParent = sceneParent.parent;
    }

    if (sceneParent) {
      sceneParent.add(this.parentGroup);
    }
  }

  /**
   * Start the communication stream effect
   */
  start(): void {
    if (this.isActive || !this.particleSystem) return;

    this.isActive = true;
    this.startTime = Date.now();
    this.isCompleted = false;

    // Fade in the particle system
    const shaderMaterial = this.particleSystem.material as THREE.ShaderMaterial;
    gsap.fromTo(
      shaderMaterial.uniforms['intensity'],
      { value: 0 },
      {
        value: this.config.intensity,
        duration: 0.3,
        ease: 'power2.out',
      }
    );

    console.log(
      `Communication stream started: ${this.config.communicationType}`
    );
  }

  /**
   * Update the effect (called from render loop)
   */
  update(deltaTime: number): void {
    if (
      !this.isActive ||
      !this.streamCurve ||
      !this.positionAttribute ||
      !this.opacityAttribute
    )
      return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const positions = this.positionAttribute.array as Float32Array;
    const opacities = this.opacityAttribute.array as Float32Array;

    // Update shader time
    if (this.particleSystem?.material instanceof THREE.ShaderMaterial) {
      this.particleSystem.material.uniforms['time'].value = elapsed;
    }

    // Update each particle
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      const i3 = i * 3;

      // Update progress along curve
      particle.progress += deltaTime * particle.speed;

      // Check if particle completed the journey
      if (particle.progress > 1.0) {
        // Reset particle to beginning with slight delay
        particle.progress = -0.1 - Math.random() * 0.2;
      }

      // Get position along curve
      if (particle.progress >= 0 && particle.progress <= 1.0) {
        const position = this.streamCurve.getPoint(particle.progress);
        positions[i3] = position.x;
        positions[i3 + 1] = position.y;
        positions[i3 + 2] = position.z;

        // Fade in/out based on progress
        let opacity = particle.opacity;
        if (particle.progress < 0.1) {
          opacity *= particle.progress / 0.1; // Fade in
        } else if (particle.progress > 0.9) {
          opacity *= (1.0 - particle.progress) / 0.1; // Fade out
        }

        opacities[i] = opacity;
      } else {
        opacities[i] = 0; // Hide particle when not in valid range
      }
    }

    // Mark attributes for update
    this.positionAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;

    // Check for completion
    if (elapsed > this.config.duration / 1000) {
      this.complete();
    }
  }

  /**
   * Complete the effect
   */
  private complete(): void {
    if (this.isCompleted) return;

    this.isCompleted = true;

    // Fade out particles
    if (this.particleSystem?.material instanceof THREE.ShaderMaterial) {
      gsap.to(this.particleSystem.material.uniforms['intensity'], {
        value: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          this.isActive = false;
        },
      });
    }

    console.log(
      `Communication stream completed: ${this.config.communicationType}`
    );
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

    if (this.particleSystem) {
      // Remove from parent
      if (this.parentGroup) {
        this.parentGroup.remove(this.particleSystem);

        // Remove parent group from scene
        if (this.parentGroup.parent) {
          this.parentGroup.parent.remove(this.parentGroup);
        }
      }

      // Dispose geometry and material
      this.particleSystem.geometry.dispose();
      if (this.particleSystem.material instanceof THREE.Material) {
        this.particleSystem.material.dispose();
      }

      this.particleSystem = null;
    }

    this.parentGroup = null;
    this.streamCurve = null;
    this.positionAttribute = null;
    this.colorAttribute = null;
    this.sizeAttribute = null;
    this.opacityAttribute = null;
  }

  /**
   * Get agent world position
   */
  private getAgentPosition(agentMesh: THREE.Group): THREE.Vector3 {
    const position = new THREE.Vector3();
    agentMesh.getWorldPosition(position);
    return position;
  }

  /**
   * Get color based on communication type
   */
  private getCommunicationColor(): THREE.Color {
    switch (this.config.communicationType) {
      case 'coordination':
        return new THREE.Color(0x4a90e2); // Blue
      case 'data_sharing':
        return new THREE.Color(0x7ed321); // Green
      case 'error_reporting':
        return new THREE.Color(0xff4444); // Red
      default:
        return new THREE.Color(0x50e3c2); // Teal
    }
  }

  /**
   * Get numeric value for communication type (for shader)
   */
  private getCommunicationTypeValue(): number {
    switch (this.config.communicationType) {
      case 'coordination':
        return 0;
      case 'data_sharing':
        return 1;
      case 'error_reporting':
        return 2;
      default:
        return 0;
    }
  }
}
