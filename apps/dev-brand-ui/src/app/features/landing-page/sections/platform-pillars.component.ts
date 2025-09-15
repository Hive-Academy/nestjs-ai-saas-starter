import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  inject,
  // DestroyRef, // Removed as not used
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Removed as not used
import * as THREE from 'three';
import { gsap } from 'gsap';
import {
  ThreeIntegrationService,
  SceneInstance,
} from '../../../core/services/three-integration.service';

interface PlatformPillar {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: number;
  position: [number, number, number];
  features: string[];
}

@Component({
  selector: 'app-platform-pillars',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="platform-pillars-container">
      <div class="content-header">
        <h2 class="section-title">Platform Pillars</h2>
        <p class="section-subtitle">
          Five core capabilities that power intelligent AI workflows
        </p>
      </div>

      <div class="pillars-scene" #sceneContainer></div>

      <div class="pillars-interface">
        <div class="pillar-cards">
          <div
            *ngFor="let pillar of pillars; trackBy: trackPillar"
            class="pillar-card"
            [class.active]="activePillar() === pillar.id"
            (mouseenter)="onPillarHover(pillar.id)"
            (mouseleave)="onPillarLeave()"
            (click)="onPillarClick(pillar.id)"
          >
            <div class="card-icon">{{ pillar.icon }}</div>
            <div class="card-content">
              <h3 class="card-title">{{ pillar.title }}</h3>
              <p class="card-description">{{ pillar.description }}</p>
              <div class="card-features" *ngIf="activePillar() === pillar.id">
                <div
                  *ngFor="let feature of pillar.features"
                  class="feature-item"
                >
                  {{ feature }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .platform-pillars-container {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
        background: linear-gradient(
          135deg,
          rgba(10, 10, 10, 0.95) 0%,
          rgba(20, 20, 40, 0.9) 100%
        );
        overflow: hidden;
      }

      .content-header {
        text-align: center;
        padding: 3rem 2rem 1rem;
        z-index: 10;
        position: relative;
      }

      .section-title {
        font-size: 3.5rem;
        font-weight: 700;
        margin: 0 0 1rem;
        background: linear-gradient(135deg, #ff69b4, #00bfff, #ff69b4);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradientShift 3s ease-in-out infinite;
      }

      .section-subtitle {
        font-size: 1.3rem;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.5;
      }

      .pillars-scene {
        flex: 1;
        position: relative;
        min-height: 400px;
        max-height: 500px;
      }

      .pillars-interface {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10;
        padding: 2rem;
        background: linear-gradient(
          to top,
          rgba(10, 10, 10, 0.95) 0%,
          transparent 100%
        );
      }

      .pillar-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .pillar-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
      }

      .pillar-card:hover {
        transform: translateY(-4px);
        border-color: #ff69b4;
        box-shadow: 0 8px 32px rgba(255, 105, 180, 0.3);
      }

      .pillar-card.active {
        border-color: #00bfff;
        box-shadow: 0 8px 32px rgba(0, 191, 255, 0.4);
        background: rgba(0, 191, 255, 0.1);
      }

      .card-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        display: block;
      }

      .card-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 0.5rem;
      }

      .card-description {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0 0 1rem;
        line-height: 1.4;
      }

      .card-features {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        animation: slideIn 0.3s ease-out;
      }

      .feature-item {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
        padding: 0.3rem 0;
        border-left: 2px solid #00bfff;
        padding-left: 0.8rem;
      }

      @keyframes gradientShift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 768px) {
        .content-header {
          padding: 2rem 1rem 1rem;
        }

        .section-title {
          font-size: 2.5rem;
        }

        .section-subtitle {
          font-size: 1.1rem;
        }

        .pillars-interface {
          padding: 1rem;
        }

        .pillar-cards {
          grid-template-columns: 1fr;
        }

        .pillar-card {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class PlatformPillarsComponent implements OnInit, OnDestroy {
  private readonly threeService = inject(ThreeIntegrationService);
  // private readonly destroyRef = inject(DestroyRef); // Removed as not used

  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  private sceneInstance: SceneInstance | null = null;
  private pillarMeshes: Map<string, THREE.Mesh> = new Map();
  private statusIndicators: Map<string, THREE.Mesh> = new Map();
  private glowEffects: Map<string, THREE.Mesh> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private ambientParticles?: THREE.Points;

  readonly activePillar = signal<string | null>(null);
  readonly isSceneReady = signal(false);

  readonly pillars: PlatformPillar[] = [
    {
      id: 'orchestration',
      title: 'Orchestration',
      description: 'Intelligent workflow coordination across multiple AI agents',
      icon: '🎼',
      color: 0xff69b4,
      position: [-8, 0, 0],
      features: [
        'Multi-agent coordination',
        'Workflow state management',
        'Dynamic task routing',
        'Error recovery & retry logic',
      ],
    },
    {
      id: 'streaming',
      title: 'Streaming',
      description: 'Real-time data flow and progressive result delivery',
      icon: '🌊',
      color: 0x00bfff,
      position: [-4, 0, 0],
      features: [
        'Real-time progress updates',
        'Chunked data processing',
        'WebSocket integration',
        'Backpressure handling',
      ],
    },
    {
      id: 'durability',
      title: 'Durability',
      description: 'Persistent state and reliable execution guarantees',
      icon: '🛡️',
      color: 0x32cd32,
      position: [0, 0, 0],
      features: [
        'Checkpoint persistence',
        'State recovery',
        'Transaction guarantees',
        'Failure resilience',
      ],
    },
    {
      id: 'memory',
      title: 'Memory Fusion',
      description: 'Hybrid vector and graph memory for intelligent context',
      icon: '🧠',
      color: 0xffa500,
      position: [4, 0, 0],
      features: [
        'Vector similarity search',
        'Graph relationship traversal',
        'Context fusion',
        'Semantic understanding',
      ],
    },
    {
      id: 'safety',
      title: 'Safety Gates',
      description: 'Human-in-the-loop controls and validation checkpoints',
      icon: '⚡',
      color: 0xff4500,
      position: [8, 0, 0],
      features: [
        'Human approval workflows',
        'Content validation',
        'Risk assessment',
        'Compliance monitoring',
      ],
    },
  ];

  ngOnInit(): void {
    this.initializeScene();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  trackPillar(_index: number, pillar: PlatformPillar): string {
    return pillar.id;
  }

  onPillarHover(pillarId: string): void {
    this.activePillar.set(pillarId);
    this.highlightPillar(pillarId);
  }

  onPillarLeave(): void {
    this.activePillar.set(null);
    this.resetPillarHighlights();
  }

  onPillarClick(pillarId: string): void {
    this.activePillar.set(pillarId);
    this.focusOnPillar(pillarId);
  }

  private async initializeScene(): Promise<void> {
    try {
      // Create Three.js scene
      this.sceneInstance = this.threeService.createScene(
        'platform-pillars',
        this.sceneContainer.nativeElement,
        {
          backgroundColor: 0x0a0a0a,
          enableShadows: true,
          cameraFov: 75,
          cameraNear: 0.1,
          cameraFar: 1000,
        }
      );

      if (!this.sceneInstance) {
        throw new Error('Failed to create platform pillars scene');
      }

      // Setup camera position
      this.sceneInstance.camera.position.set(0, 8, 20);
      this.sceneInstance.camera.lookAt(0, 0, 0);

      // Add lighting
      this.setupLighting();

      // Create pillar 3D objects
      this.createPillarMeshes();

      // Add ambient effects
      this.addAmbientEffects();

      // Setup interaction
      this.setupInteractions();

      // Start render loop with custom animation
      this.threeService.activateScene('platform-pillars', () => {
        this.animatePillars();
      });

      this.isSceneReady.set(true);
    } catch (error) {
      console.error('Failed to initialize platform pillars scene:', error);
    }
  }

  private setupLighting(): void {
    if (!this.sceneInstance) return;

    // Enhanced ambient light with warmer tone
    const ambientLight = new THREE.AmbientLight(0x2a2a4a, 0.4);
    this.sceneInstance.scene.add(ambientLight);

    // Main directional light with enhanced shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(15, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.0001;
    this.sceneInstance.scene.add(directionalLight);

    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0x4a4aff, 0.3);
    fillLight.position.set(-10, 10, -5);
    this.sceneInstance.scene.add(fillLight);

    // Enhanced point lights for each pillar with dynamic intensity
    this.pillars.forEach((pillar, index) => {
      const pointLight = new THREE.PointLight(pillar.color, 0.8, 15);
      pointLight.position.set(...pillar.position);
      pointLight.position.y = 5;
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 1024;
      pointLight.shadow.mapSize.height = 1024;
      this.sceneInstance!.scene.add(pointLight);
      
      // Add rim light for dramatic effect
      const rimLight = new THREE.PointLight(pillar.color, 0.4, 8);
      rimLight.position.set(pillar.position[0], pillar.position[1] + 6, pillar.position[2] - 3);
      this.sceneInstance!.scene.add(rimLight);
    });
    
    // Add atmospheric spotlight
    const spotlight = new THREE.SpotLight(0x8a2be2, 0.5, 30, Math.PI / 6, 0.3);
    spotlight.position.set(0, 25, 0);
    spotlight.target.position.set(0, 0, 0);
    spotlight.castShadow = true;
    this.sceneInstance.scene.add(spotlight);
    this.sceneInstance.scene.add(spotlight.target);
  }

  private createPillarMeshes(): void {
    if (!this.sceneInstance) return;

    this.pillars.forEach((pillar, index) => {
      // Create enhanced pillar geometry with more detail
      const geometry = new THREE.BoxGeometry(2.5, 5, 2.5, 4, 8, 4);
      
      // Create advanced material with PBR properties
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(pillar.color),
        metalness: 0.7,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(pillar.color),
        emissiveIntensity: 0.15,
        envMapIntensity: 1.0,
        transmission: 0.1,
        thickness: 0.5,
        ior: 1.5
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pillar.position);
      mesh.position.y = 2.5; // Raise the pillars
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { pillarId: pillar.id };

      // Add enhanced glow effect
      const glowGeometry = new THREE.BoxGeometry(3.2, 6, 3.2);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pillar.color),
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(mesh.position);
      this.sceneInstance!.scene.add(glowMesh);
      this.glowEffects.set(pillar.id, glowMesh);

      // Add dynamic status indicator on top
      const indicatorGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const indicatorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Green for active status
        emissive: 0x004400,
        emissiveIntensity: 0.5
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.position.set(...pillar.position);
      indicator.position.y = 6;
      this.sceneInstance!.scene.add(indicator);
      this.statusIndicators.set(pillar.id, indicator);

      // Add enhanced wireframe with multiple layers
      const wireframeGeometry = new THREE.EdgesGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(pillar.color).multiplyScalar(1.5),
        transparent: true,
        opacity: 0.6,
        linewidth: 2
      });
      const wireframe = new THREE.LineSegments(
        wireframeGeometry,
        wireframeMaterial
      );
      mesh.add(wireframe);

      // Add base platform
      const platformGeometry = new THREE.CylinderGeometry(2, 2.5, 0.3, 12);
      const platformMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(pillar.color).multiplyScalar(0.7),
        metalness: 0.9,
        roughness: 0.1,
        emissive: new THREE.Color(pillar.color),
        emissiveIntensity: 0.1
      });
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.set(...pillar.position);
      platform.position.y = -0.15;
      platform.castShadow = true;
      platform.receiveShadow = true;
      this.sceneInstance!.scene.add(platform);

      this.sceneInstance!.scene.add(mesh);
      this.pillarMeshes.set(pillar.id, mesh);
    });
  }

  private addAmbientEffects(): void {
    if (!this.sceneInstance) return;

    // Enhanced particle system with multiple layers
    const particleCount = 800;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    const pillarColors = this.pillars.map(p => new THREE.Color(p.color));

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in cylindrical volume around pillars
      const radius = 15 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 15;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * radius;

      // Choose color based on nearest pillar
      const color = pillarColors[Math.floor(Math.random() * pillarColors.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = Math.random() * 2 + 0.5;
      
      // Add gentle movement
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = Math.random() * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particles.userData = { velocities };

    const particleMaterial = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.ambientParticles = new THREE.Points(particles, particleMaterial);
    this.sceneInstance.scene.add(this.ambientParticles);
    
    // Add floating geometric elements
    for (let i = 0; i < 20; i++) {
      const geometry = Math.random() > 0.5 
        ? new THREE.TetrahedronGeometry(0.2)
        : new THREE.OctahedronGeometry(0.2);
        
      const material = new THREE.MeshBasicMaterial({
        color: pillarColors[Math.floor(Math.random() * pillarColors.length)],
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 40,
        Math.random() * 20,
        (Math.random() - 0.5) * 40
      );
      
      this.sceneInstance.scene.add(mesh);
    }
  }

  private setupInteractions(): void {
    if (!this.sceneContainer) return;

    this.sceneContainer.nativeElement.addEventListener(
      'mousemove',
      this.onMouseMove.bind(this)
    );
    this.sceneContainer.nativeElement.addEventListener(
      'click',
      this.onMouseClick.bind(this)
    );
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.sceneInstance) return;

    const rect = this.sceneContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneInstance.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.pillarMeshes.values())
    );

    if (intersects.length > 0) {
      const pillarId = intersects[0].object.userData['pillarId'];
      if (this.activePillar() !== pillarId) {
        this.onPillarHover(pillarId);
      }
    } else if (this.activePillar()) {
      this.onPillarLeave();
    }
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.sceneInstance) return;

    const rect = this.sceneContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneInstance.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.pillarMeshes.values())
    );

    if (intersects.length > 0) {
      const pillarId = intersects[0].object.userData['pillarId'];
      this.onPillarClick(pillarId);
    }
  }

  private animatePillars(): void {
    const time = performance.now() * 0.001;

    this.pillarMeshes.forEach((mesh, pillarId) => {
      // const baseY = mesh.position.y;
      
      // Enhanced floating animation with different frequencies
      mesh.position.y = 2.5 + Math.sin(time * 1.5 + pillarId.length) * 0.4;
      mesh.rotation.y = time * 0.3;
      mesh.rotation.x = Math.sin(time * 0.8) * 0.05;

      // Dynamic scaling and pulsing
      if (this.activePillar() === pillarId) {
        const scale = 1 + Math.sin(time * 4) * 0.15;
        mesh.scale.setScalar(scale);
        
        // Enhanced glow effect
        const glow = this.glowEffects.get(pillarId);
        if (glow) {
          (glow.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 5) * 0.1;
          glow.scale.setScalar(1.1 + Math.sin(time * 3) * 0.2);
        }
      } else {
        mesh.scale.setScalar(1);
        const glow = this.glowEffects.get(pillarId);
        if (glow) {
          (glow.material as THREE.MeshBasicMaterial).opacity = 0.15;
          glow.scale.setScalar(1);
        }
      }
      
      // Animate status indicators
      const indicator = this.statusIndicators.get(pillarId);
      if (indicator) {
        indicator.position.y = 6 + Math.sin(time * 2 + pillarId.length) * 0.2;
        (indicator.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(time * 6) * 0.3;
        
        // Change color based on activity
        if (this.activePillar() === pillarId) {
          (indicator.material as THREE.MeshStandardMaterial).color.setHex(0xffaa00); // Orange for selected
          (indicator.material as THREE.MeshStandardMaterial).emissive.setHex(0x442200);
        } else {
          (indicator.material as THREE.MeshStandardMaterial).color.setHex(0x00ff00); // Green for active
          (indicator.material as THREE.MeshStandardMaterial).emissive.setHex(0x004400);
        }
      }
    });
    
    // Animate ambient particles
    if (this.ambientParticles) {
      const positions = this.ambientParticles.geometry.attributes['position'] as THREE.BufferAttribute;
      const velocities = this.ambientParticles.userData['velocities'];
      
      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;
        positions.array[i3] += velocities[i3];
        positions.array[i3 + 1] += velocities[i3 + 1];
        positions.array[i3 + 2] += velocities[i3 + 2];
        
        // Reset particles that drift too far
        if (Math.abs(positions.array[i3]) > 50 || positions.array[i3 + 1] > 20) {
          const radius = 15 + Math.random() * 10;
          const angle = Math.random() * Math.PI * 2;
          positions.array[i3] = Math.cos(angle) * radius;
          positions.array[i3 + 1] = 0;
          positions.array[i3 + 2] = Math.sin(angle) * radius;
        }
      }
      
      positions.needsUpdate = true;
      this.ambientParticles.rotation.y += 0.001;
    }
  }

  private highlightPillar(pillarId: string): void {
    const mesh = this.pillarMeshes.get(pillarId);
    if (!mesh) return;

    // Enhanced highlight animation
    gsap.to(mesh.material, {
      duration: 0.4,
      opacity: 1,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.1,
      ease: 'power2.out',
    });
    
    // Enhanced glow effect
    const glow = this.glowEffects.get(pillarId);
    if (glow) {
      gsap.to(glow.material, {
        duration: 0.4,
        opacity: 0.4,
        ease: 'power2.out'
      });
      gsap.to(glow.scale, {
        duration: 0.4,
        x: 1.3,
        y: 1.3,
        z: 1.3,
        ease: 'power2.out'
      });
    }

    // Dim other pillars with more dramatic effect
    this.pillarMeshes.forEach((otherMesh, otherId) => {
      if (otherId !== pillarId) {
        gsap.to(otherMesh.material, {
          duration: 0.4,
          opacity: 0.3,
          emissiveIntensity: 0.05,
          metalness: 0.5,
          ease: 'power2.out',
        });
        
        const otherGlow = this.glowEffects.get(otherId);
        if (otherGlow) {
          gsap.to(otherGlow.material, {
            duration: 0.4,
            opacity: 0.05,
            ease: 'power2.out'
          });
        }
      }
    });
  }

  private resetPillarHighlights(): void {
    this.pillarMeshes.forEach((mesh, pillarId) => {
      gsap.to(mesh.material, {
        duration: 0.4,
        opacity: 0.9,
        emissiveIntensity: 0.15,
        metalness: 0.7,
        roughness: 0.2,
        ease: 'power2.out',
      });
      
      const glow = this.glowEffects.get(pillarId);
      if (glow) {
        gsap.to(glow.material, {
          duration: 0.4,
          opacity: 0.15,
          ease: 'power2.out'
        });
        gsap.to(glow.scale, {
          duration: 0.4,
          x: 1,
          y: 1,
          z: 1,
          ease: 'power2.out'
        });
      }
    });
  }

  private focusOnPillar(pillarId: string): void {
    if (!this.sceneInstance) return;

    const pillar = this.pillars.find((p) => p.id === pillarId);
    if (!pillar) return;

    // Animate camera to focus on pillar
    const targetPosition = new THREE.Vector3(
      pillar.position[0],
      pillar.position[1] + 2,
      pillar.position[2] + 10
    );

    gsap.to(this.sceneInstance.camera.position, {
      duration: 1,
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.sceneInstance!.camera.lookAt(
          pillar.position[0],
          pillar.position[1],
          pillar.position[2]
        );
      },
    });
  }

  private cleanup(): void {
    if (this.sceneInstance) {
      this.threeService.removeScene('platform-pillars');
      this.sceneInstance = null;
    }

    this.pillarMeshes.clear();
    this.statusIndicators.clear();
    this.glowEffects.clear();

    if (this.sceneContainer?.nativeElement) {
      this.sceneContainer.nativeElement.removeEventListener(
        'mousemove',
        this.onMouseMove
      );
      this.sceneContainer.nativeElement.removeEventListener(
        'click',
        this.onMouseClick
      );
    }
  }
}