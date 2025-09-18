import * as THREE from 'three';
import { gsap } from 'gsap';
import type { ToolExecutionStatus } from '../../../core/interfaces/agent-state.interface';

export interface ToolExecutionConfig {
  agentMesh: THREE.Group;
  toolName: string;
  progress: number; // 0-100
  status: ToolExecutionStatus;
  color: string;
}

/**
 * Tool Execution Ring Effect
 * Creates dynamic progress rings around agents during tool execution
 * Shows incremental progress updates with tool-specific color coding
 */
export class ToolExecutionRing {
  private config: ToolExecutionConfig;
  private isActive = false;
  private isCompleted = false;

  // Three.js objects
  private progressRing: THREE.Mesh | null = null;
  private backgroundRing: THREE.Mesh | null = null;
  private statusIcon: THREE.Sprite | null = null;

  // Animation properties
  private targetProgress = 0;
  private progressTween: gsap.core.Tween | null = null;
  private statusTween: gsap.core.Tween | null = null;

  // Shader uniforms for optimized rendering
  private progressUniforms = {
    time: { value: 0 },
    progress: { value: 0 }, // 0-1
    color: { value: new THREE.Color() },
    opacity: { value: 1 },
    status: { value: 0 }, // 0=pending, 1=running, 2=completed, 3=error
  };

  private backgroundUniforms = {
    opacity: { value: 0.3 },
    color: { value: new THREE.Color(0x444444) },
  };

  constructor(config: ToolExecutionConfig) {
    this.config = config;
    this.targetProgress = config.progress / 100;
    this.setupVisualElements();
  }

  /**
   * Setup visual elements for tool execution ring
   */
  private setupVisualElements(): void {
    this.createBackgroundRing();
    this.createProgressRing();
    this.createStatusIndicator();
  }

  /**
   * Create background ring (static)
   */
  private createBackgroundRing(): void {
    const agentSize = this.getAgentSize();
    const ringGeometry = new THREE.RingGeometry(
      agentSize * 1.8,
      agentSize * 2.1,
      64
    );

    const backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: this.backgroundUniforms,
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        uniform vec3 color;
        varying vec2 vUv;
        
        void main() {
          float distance = length(vUv - 0.5) * 2.0;
          float ringMask = smoothstep(0.6, 0.8, distance) * smoothstep(1.0, 0.9, distance);
          gl_FragColor = vec4(color, ringMask * opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.backgroundRing = new THREE.Mesh(ringGeometry, backgroundMaterial);
    this.backgroundRing.rotation.x = Math.PI / 2; // Horizontal ring
    this.backgroundRing.position.set(0, -0.1, 0); // Slightly below agent

    this.config.agentMesh.add(this.backgroundRing);
  }

  /**
   * Create animated progress ring
   */
  private createProgressRing(): void {
    const agentSize = this.getAgentSize();
    const ringGeometry = new THREE.RingGeometry(
      agentSize * 1.8,
      agentSize * 2.1,
      64
    );

    // Shader material for animated progress
    const progressMaterial = new THREE.ShaderMaterial({
      uniforms: this.progressUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying float vAngle;
        
        void main() {
          vUv = uv;
          
          // Calculate angle for progress arc
          vec2 center = vec2(0.5);
          vec2 pos = uv - center;
          vAngle = atan(pos.y, pos.x) / (2.0 * 3.14159) + 0.5;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform vec3 color;
        uniform float opacity;
        uniform float status;
        varying vec2 vUv;
        varying float vAngle;
        
        void main() {
          float distance = length(vUv - 0.5) * 2.0;
          float ringMask = smoothstep(0.6, 0.8, distance) * smoothstep(1.0, 0.9, distance);
          
          // Progress arc (starts from top, goes clockwise)
          float adjustedAngle = mod(vAngle + 0.75, 1.0); // Start from top
          float progressMask = step(adjustedAngle, progress);
          
          // Animated effects based on status
          float pulse = 1.0;
          vec3 finalColor = color;
          
          if (status == 0.0) { // pending
            pulse = 0.5 + 0.3 * sin(time * 3.0);
            finalColor = mix(color, vec3(0.8), 0.3);
          } else if (status == 1.0) { // running
            pulse = 0.7 + 0.3 * sin(time * 5.0);
            
            // Add moving glow at progress edge
            float edgeGlow = smoothstep(0.02, 0.0, abs(adjustedAngle - progress));
            finalColor = mix(color, vec3(1.0), edgeGlow * 0.5);
          } else if (status == 2.0) { // completed
            pulse = 1.0;
            finalColor = mix(color, vec3(0.0, 1.0, 0.0), 0.3);
          } else if (status == 3.0) { // error
            pulse = 0.8 + 0.4 * sin(time * 8.0);
            finalColor = vec3(1.0, 0.2, 0.2);
          }
          
          float alpha = ringMask * progressMask * opacity * pulse;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.progressRing = new THREE.Mesh(ringGeometry, progressMaterial);
    this.progressRing.rotation.x = Math.PI / 2; // Horizontal ring
    this.progressRing.position.set(0, 0, 0);

    // Set initial color
    this.progressUniforms.color.value.setHex(
      parseInt(this.config.color.replace('#', ''), 16)
    );

    this.config.agentMesh.add(this.progressRing);
  }

  /**
   * Create status indicator sprite
   */
  private createStatusIndicator(): void {
    // Create canvas for text rendering
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
    });

    this.statusIcon = new THREE.Sprite(spriteMaterial);
    this.statusIcon.scale.set(0.5, 0.5, 1);
    this.statusIcon.position.set(0, this.getAgentSize() * 2.5, 0);

    this.config.agentMesh.add(this.statusIcon);

    // Update the icon based on current status
    this.updateStatusIcon();
  }

  /**
   * Update status icon based on current state
   */
  private updateStatusIcon(): void {
    if (!this.statusIcon?.material.map) return;

    const canvas = (this.statusIcon.material.map as THREE.CanvasTexture)
      .image as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const size = canvas.width;

    // Clear canvas
    context.clearRect(0, 0, size, size);

    // Set common properties
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw based on status
    switch (this.config.status) {
      case 'pending':
        this.drawPendingIcon(context, size);
        break;
      case 'running':
        this.drawRunningIcon(context, size);
        break;
      case 'completed':
        this.drawCompletedIcon(context, size);
        break;
      case 'error':
        this.drawErrorIcon(context, size);
        break;
    }

    // Update texture
    (this.statusIcon.material.map as THREE.CanvasTexture).needsUpdate = true;
  }

  /**
   * Draw pending status icon
   */
  private drawPendingIcon(
    context: CanvasRenderingContext2D,
    size: number
  ): void {
    const center = size / 2;

    // Draw clock icon
    context.strokeStyle = '#888888';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(center, center, center * 0.6, 0, Math.PI * 2);
    context.stroke();

    // Clock hands
    context.beginPath();
    context.moveTo(center, center);
    context.lineTo(center, center * 0.6);
    context.moveTo(center, center);
    context.lineTo(center + center * 0.3, center);
    context.stroke();
  }

  /**
   * Draw running status icon
   */
  private drawRunningIcon(
    context: CanvasRenderingContext2D,
    size: number
  ): void {
    const center = size / 2;

    // Draw progress percentage
    context.fillStyle = this.config.color;
    context.font = `bold ${size * 0.25}px Arial`;
    context.fillText(`${Math.round(this.config.progress)}%`, center, center);

    // Tool name below
    context.fillStyle = '#ffffff';
    context.font = `${size * 0.15}px Arial`;
    context.fillText(
      this.config.toolName.slice(0, 8),
      center,
      center + size * 0.3
    );
  }

  /**
   * Draw completed status icon
   */
  private drawCompletedIcon(
    context: CanvasRenderingContext2D,
    size: number
  ): void {
    const center = size / 2;

    // Draw checkmark
    context.strokeStyle = '#00ff00';
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(center * 0.7, center);
    context.lineTo(center * 0.9, center * 1.2);
    context.lineTo(center * 1.4, center * 0.8);
    context.stroke();
  }

  /**
   * Draw error status icon
   */
  private drawErrorIcon(context: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;

    // Draw X mark
    context.strokeStyle = '#ff0000';
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(center * 0.7, center * 0.7);
    context.lineTo(center * 1.3, center * 1.3);
    context.moveTo(center * 1.3, center * 0.7);
    context.lineTo(center * 0.7, center * 1.3);
    context.stroke();
  }

  /**
   * Start the tool execution ring effect
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.isCompleted = false;

    // Set initial status uniform
    this.progressUniforms.status.value = this.getStatusValue();

    // Show ring with fade-in
    if (this.progressRing) {
      gsap.fromTo(
        this.progressUniforms.opacity,
        { value: 0 },
        {
          value: 1,
          duration: 0.3,
          ease: 'power2.out',
        }
      );
    }

    // Animate progress to current value
    this.animateProgressTo(this.targetProgress);

    console.log(
      `Tool execution ring started: ${this.config.toolName} at ${this.config.progress}%`
    );
  }

  /**
   * Update progress and status
   */
  updateProgress(newProgress: number, newStatus: ToolExecutionStatus): void {
    this.config.progress = newProgress;
    this.config.status = newStatus;
    this.targetProgress = newProgress / 100;

    // Update status uniform
    this.progressUniforms.status.value = this.getStatusValue();

    // Animate to new progress
    this.animateProgressTo(this.targetProgress);

    // Update status icon
    this.updateStatusIcon();

    // Handle completion
    if (newStatus === 'completed' || newStatus === 'error') {
      setTimeout(() => {
        this.complete();
      }, 2000); // Show completed state for 2 seconds
    }
  }

  /**
   * Animate progress to target value
   */
  private animateProgressTo(target: number): void {
    if (this.progressTween) {
      this.progressTween.kill();
    }

    this.progressTween = gsap.to(this.progressUniforms.progress, {
      value: target,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        // Progress tracking handled by uniforms
      },
    });
  }

  /**
   * Update the effect (called from render loop)
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    // Update time for animations
    this.progressUniforms.time.value += deltaTime;
  }

  /**
   * Complete the effect
   */
  private complete(): void {
    if (this.isCompleted) return;

    this.isCompleted = true;

    // Fade out effect
    gsap.to(this.progressUniforms.opacity, {
      value: 0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        this.isActive = false;
      },
    });

    if (this.statusIcon) {
      gsap.to(this.statusIcon.material, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      });
    }

    console.log(`Tool execution ring completed: ${this.config.toolName}`);
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

    // Kill animations
    if (this.progressTween) {
      this.progressTween.kill();
      this.progressTween = null;
    }
    if (this.statusTween) {
      this.statusTween.kill();
      this.statusTween = null;
    }

    // Remove and dispose elements
    if (this.progressRing) {
      this.config.agentMesh.remove(this.progressRing);
      this.progressRing.geometry.dispose();
      if (this.progressRing.material instanceof THREE.Material) {
        this.progressRing.material.dispose();
      }
      this.progressRing = null;
    }

    if (this.backgroundRing) {
      this.config.agentMesh.remove(this.backgroundRing);
      this.backgroundRing.geometry.dispose();
      if (this.backgroundRing.material instanceof THREE.Material) {
        this.backgroundRing.material.dispose();
      }
      this.backgroundRing = null;
    }

    if (this.statusIcon) {
      this.config.agentMesh.remove(this.statusIcon);
      if (this.statusIcon.material.map) {
        this.statusIcon.material.map.dispose();
      }
      this.statusIcon.material.dispose();
      this.statusIcon = null;
    }
  }

  /**
   * Get numeric value for status uniform
   */
  private getStatusValue(): number {
    switch (this.config.status) {
      case 'pending':
        return 0;
      case 'running':
        return 1;
      case 'completed':
        return 2;
      case 'error':
        return 3;
      default:
        return 0;
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
