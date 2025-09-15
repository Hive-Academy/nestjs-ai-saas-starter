import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  private sceneInstance: SceneInstance | null = null;
  private pillarMeshes: Map<string, THREE.Mesh> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

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

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.sceneInstance.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.sceneInstance.scene.add(directionalLight);

    // Point lights for each pillar
    this.pillars.forEach((pillar) => {
      const pointLight = new THREE.PointLight(pillar.color, 0.5, 10);
      pointLight.position.set(...pillar.position);
      pointLight.position.y = 3;
      this.sceneInstance!.scene.add(pointLight);
    });
  }

  private createPillarMeshes(): void {
    if (!this.sceneInstance) return;

    this.pillars.forEach((pillar) => {
      // Create pillar geometry
      const geometry = new THREE.BoxGeometry(2, 4, 2);
      const material = new THREE.MeshPhongMaterial({
        color: pillar.color,
        transparent: true,
        opacity: 0.8,
        emissive: pillar.color,
        emissiveIntensity: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pillar.position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { pillarId: pillar.id };

      // Add wireframe overlay
      const wireframeGeometry = new THREE.EdgesGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: pillar.color,
        transparent: true,
        opacity: 0.3,
      });
      const wireframe = new THREE.LineSegments(
        wireframeGeometry,
        wireframeMaterial
      );
      mesh.add(wireframe);

      this.sceneInstance!.scene.add(mesh);
      this.pillarMeshes.set(pillar.id, mesh);
    });
  }

  private addAmbientEffects(): void {
    if (!this.sceneInstance) return;

    // Add particle system
    const particleCount = 300;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = Math.random() * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;

      const color = new THREE.Color().setHSL(
        Math.random() * 0.3 + 0.5,
        0.7,
        0.5
      );
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    this.sceneInstance.scene.add(particleSystem);
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
      const pillarId = intersects[0].object.userData.pillarId;
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
      const pillarId = intersects[0].object.userData.pillarId;
      this.onPillarClick(pillarId);
    }
  }

  private animatePillars(): void {
    const time = performance.now() * 0.001;

    this.pillarMeshes.forEach((mesh, pillarId) => {
      // Gentle floating animation
      mesh.position.y = Math.sin(time + pillarId.length) * 0.3;
      mesh.rotation.y = time * 0.2;

      // Pulsing effect for active pillar
      if (this.activePillar() === pillarId) {
        const scale = 1 + Math.sin(time * 3) * 0.1;
        mesh.scale.setScalar(scale);
      } else {
        mesh.scale.setScalar(1);
      }
    });
  }

  private highlightPillar(pillarId: string): void {
    const mesh = this.pillarMeshes.get(pillarId);
    if (!mesh) return;

    // Animate highlight
    gsap.to(mesh.material, {
      duration: 0.3,
      opacity: 1,
      emissiveIntensity: 0.3,
      ease: 'power2.out',
    });

    // Dim other pillars
    this.pillarMeshes.forEach((otherMesh, otherId) => {
      if (otherId !== pillarId) {
        gsap.to(otherMesh.material, {
          duration: 0.3,
          opacity: 0.4,
          emissiveIntensity: 0.05,
          ease: 'power2.out',
        });
      }
    });
  }

  private resetPillarHighlights(): void {
    this.pillarMeshes.forEach((mesh) => {
      gsap.to(mesh.material, {
        duration: 0.3,
        opacity: 0.8,
        emissiveIntensity: 0.1,
        ease: 'power2.out',
      });
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