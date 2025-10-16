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
  selector: 'brand-platform-pillars',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full h-screen relative bg-gradient-to-br from-gray-900/95 to-indigo-900/90 overflow-hidden"
    >
      <div class="text-center pt-12 pb-8 px-8 z-10 relative">
        <h2
          class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-blue-400 to-pink-400 bg-[length:200%_200%] bg-clip-text text-transparent animate-[gradientShift_3s_ease-in-out_infinite]"
        >
          Platform Pillars
        </h2>
        <p
          class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
        >
          Five core capabilities that power intelligent AI workflows
        </p>
      </div>

      <div class="absolute inset-0 top-16" #sceneContainer></div>

      <!-- Instructions overlay -->
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div
          class="bg-black/40 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20"
        >
          <p class="text-white/70 text-sm text-center">
            Move mouse to explore • Click pillars to focus
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
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
  private cardMeshes: Map<string, THREE.Group> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private ambientParticles?: THREE.Points;
  private cardTextures: Map<string, THREE.CanvasTexture> = new Map();

  readonly activePillar = signal<string | null>(null);
  readonly isSceneReady = signal(false);

  readonly pillars: PlatformPillar[] = [
    {
      id: 'orchestration',
      title: 'Orchestration',
      description:
        'Intelligent workflow coordination across multiple AI agents',
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

  trackPillar(pillar: PlatformPillar): string {
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

      // Setup camera position for better card visibility
      this.sceneInstance.camera.position.set(0, 6, 25);
      this.sceneInstance.camera.lookAt(0, 2, -2);

      // Add lighting
      this.setupLighting();

      // Create pillar 3D objects
      this.createPillarMeshes();

      // Create 3D cards
      this.create3DCards();

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

    // Clean ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.sceneInstance.scene.add(ambientLight);

    // Main directional light - softer
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.sceneInstance.scene.add(directionalLight);

    // Subtle fill light
    const fillLight = new THREE.DirectionalLight(0x6060ff, 0.2);
    fillLight.position.set(-5, 8, -3);
    this.sceneInstance.scene.add(fillLight);

    // Minimal point lights for each pillar - much subtler
    this.pillars.forEach((pillar, index) => {
      const pointLight = new THREE.PointLight(pillar.color, 0.3, 8);
      pointLight.position.set(...pillar.position);
      pointLight.position.y = 4;
      this.sceneInstance!.scene.add(pointLight);
    });
  }

  private createPillarMeshes(): void {
    if (!this.sceneInstance) return;

    this.pillars.forEach((pillar, index) => {
      // Create subtle, secondary geometric shapes - SMALLER and more transparent
      let geometry: THREE.BufferGeometry;

      // Smaller, more subtle shapes that support the content
      switch (index) {
        case 0: // Orchestration - Crystalline structure
          geometry = new THREE.IcosahedronGeometry(0.8, 1);
          break;
        case 1: // Streaming - Flowing sphere
          geometry = new THREE.SphereGeometry(0.7, 32, 32);
          break;
        case 2: // Durability - Robust dodecahedron (center)
          geometry = new THREE.DodecahedronGeometry(0.9, 0);
          break;
        case 3: // Memory - Brain-like torus
          geometry = new THREE.TorusGeometry(0.6, 0.3, 16, 32);
          break;
        case 4: // Safety - Protective octahedron
          geometry = new THREE.OctahedronGeometry(0.8, 1);
          break;
        default:
          geometry = new THREE.SphereGeometry(0.7, 32, 32);
      }

      // Subtle, secondary material - much more transparent
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(pillar.color),
        metalness: 0.1,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.4, // Much more transparent
        emissive: new THREE.Color(pillar.color),
        emissiveIntensity: 0.05,
        transmission: 0.4,
        thickness: 0.5,
        ior: 1.4,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pillar.position);
      mesh.position.y = 4; // Higher to avoid conflicting with cards
      mesh.castShadow = false; // No shadow to keep subtle
      mesh.receiveShadow = false;
      mesh.userData = { pillarId: pillar.id };

      // Very subtle glow effect
      const glowGeometry = geometry.clone();
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pillar.color),
        transparent: true,
        opacity: 0.03, // Very subtle
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(mesh.position);
      glowMesh.scale.setScalar(1.2);
      this.sceneInstance!.scene.add(glowMesh);
      this.glowEffects.set(pillar.id, glowMesh);

      // Tiny status indicator
      const indicatorGeometry = new THREE.SphereGeometry(0.08, 12, 12);
      const indicatorMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pillar.color).multiplyScalar(1.5),
        emissive: new THREE.Color(pillar.color),
        emissiveIntensity: 0.2,
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.position.set(...pillar.position);
      indicator.position.y = 5;
      this.sceneInstance!.scene.add(indicator);
      this.statusIndicators.set(pillar.id, indicator);

      this.sceneInstance!.scene.add(mesh);
      this.pillarMeshes.set(pillar.id, mesh);
    });
  }

  private addAmbientEffects(): void {
    if (!this.sceneInstance) return;

    // Clean ambient atmosphere - minimal particles for subtle depth
    const particleCount = 50; // Dramatically reduced
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Sparse, elegant particle distribution
      const radius = 20 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      const height = 5 + Math.random() * 10;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * radius;

      // Subtle white/blue particles
      const intensity = 0.3 + Math.random() * 0.4;
      colors[i3] = intensity;
      colors[i3 + 1] = intensity;
      colors[i3 + 2] = intensity * 1.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    this.ambientParticles = new THREE.Points(particles, particleMaterial);
    this.sceneInstance.scene.add(this.ambientParticles);
  }

  private createCardTexture(pillar: PlatformPillar): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 800;
    const height = 1000;
    canvas.width = width;
    canvas.height = height;

    // Create sophisticated gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const pillarColor = new THREE.Color(pillar.color);
    gradient.addColorStop(0, `rgba(15, 15, 35, 0.95)`);
    gradient.addColorStop(
      0.3,
      `rgba(${Math.floor(pillarColor.r * 60)}, ${Math.floor(
        pillarColor.g * 60
      )}, ${Math.floor(pillarColor.b * 60)}, 0.9)`
    );
    gradient.addColorStop(1, `rgba(10, 10, 20, 0.95)`);

    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle grid pattern
    ctx.strokeStyle = `rgba(${Math.floor(pillarColor.r * 255)}, ${Math.floor(
      pillarColor.g * 255
    )}, ${Math.floor(pillarColor.b * 255)}, 0.1)`;
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Add elegant border with rounded corners effect
    ctx.strokeStyle = pillarColor.getStyle();
    ctx.lineWidth = 6;
    ctx.setLineDash([]);
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Add inner glow border
    ctx.strokeStyle = `rgba(${Math.floor(pillarColor.r * 255)}, ${Math.floor(
      pillarColor.g * 255
    )}, ${Math.floor(pillarColor.b * 255)}, 0.3)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Header section with enhanced styling
    const headerHeight = 200;
    const headerGradient = ctx.createLinearGradient(0, 20, 0, headerHeight);
    headerGradient.addColorStop(
      0,
      `rgba(${Math.floor(pillarColor.r * 100)}, ${Math.floor(
        pillarColor.g * 100
      )}, ${Math.floor(pillarColor.b * 100)}, 0.3)`
    );
    headerGradient.addColorStop(
      1,
      `rgba(${Math.floor(pillarColor.r * 50)}, ${Math.floor(
        pillarColor.g * 50
      )}, ${Math.floor(pillarColor.b * 50)}, 0.1)`
    );
    ctx.fillStyle = headerGradient;
    ctx.fillRect(20, 20, width - 40, headerHeight);

    // Add icon with enhanced styling
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = pillarColor.getStyle();
    ctx.shadowBlur = 20;
    ctx.fillText(pillar.icon, width / 2, 150);
    ctx.shadowBlur = 0;

    // Add title with enhanced typography
    ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = pillarColor.getStyle();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(pillar.title, width / 2, 250);
    ctx.shadowBlur = 0;

    // Add description with better typography
    ctx.font = '28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';

    // Enhanced word wrap with better spacing
    const words = pillar.description.split(' ');
    let line = '';
    let y = 320;
    const lineHeight = 40;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > width - 80 && n > 0) {
        ctx.fillText(line, width / 2, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, y);

    // Features section with enhanced styling
    const featuresStartY = y + 80;

    // Features header
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Key Features', width / 2, featuresStartY);

    // Features list with enhanced design
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#c0c0c0';
    ctx.textAlign = 'left';

    let featureY = featuresStartY + 60;
    pillar.features.forEach((feature, index) => {
      if (featureY < height - 80) {
        // Feature bullet point with pillar color
        ctx.fillStyle = pillarColor.getStyle();
        ctx.fillRect(60, featureY - 12, 8, 8);

        // Feature text
        ctx.fillStyle = '#c0c0c0';
        ctx.fillText(feature, 90, featureY);
        featureY += 40;
      }
    });

    // Add bottom accent line
    ctx.strokeStyle = pillarColor.getStyle();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(60, height - 40);
    ctx.lineTo(width - 60, height - 40);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private create3DCards(): void {
    if (!this.sceneInstance) return;

    this.pillars.forEach((pillar, index) => {
      // Create card texture
      const cardTexture = this.createCardTexture(pillar);
      this.cardTextures.set(pillar.id, cardTexture);

      // Create LARGE, PRIMARY card geometry - Cards are the main focus!
      const cardWidth = 8;
      const cardHeight = 10;
      const cardGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);

      // Create premium card material - high visibility and quality
      const cardMaterial = new THREE.MeshPhysicalMaterial({
        map: cardTexture,
        transparent: true,
        opacity: 0.98,
        roughness: 0.02,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide,
        envMapIntensity: 1.0,
        transmission: 0.02,
        thickness: 0.05,
      });

      // Create card mesh
      const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);

      // Position cards as PRIMARY elements
      const cardGroup = new THREE.Group();
      cardMesh.position.set(0, 0, 0);
      cardMesh.userData = { pillarId: pillar.id, isCard: true };

      // Position cards prominently in front
      cardGroup.position.set(
        pillar.position[0],
        pillar.position[1] + 1, // Lower, more accessible
        pillar.position[2] - 3 // Closer to camera - CARDS ARE PRIMARY
      );

      // Optimal rotation for readability
      cardGroup.rotation.x = -Math.PI / 12; // Subtle tilt for readability
      cardGroup.rotation.y = index * 0.1; // Gentle spread

      cardGroup.add(cardMesh);

      // Enhanced glow/border effect with multiple layers
      const borderGeometry = new THREE.PlaneGeometry(
        cardWidth + 0.4,
        cardHeight + 0.4
      );
      const borderMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pillar.color),
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
      borderMesh.position.z = -0.02;
      cardGroup.add(borderMesh);

      // Add subtle outer glow
      const outerGlowGeometry = new THREE.PlaneGeometry(
        cardWidth + 0.8,
        cardHeight + 0.8
      );
      const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pillar.color),
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const outerGlowMesh = new THREE.Mesh(
        outerGlowGeometry,
        outerGlowMaterial
      );
      outerGlowMesh.position.z = -0.04;
      cardGroup.add(outerGlowMesh);

      this.sceneInstance!.scene.add(cardGroup);
      this.cardMeshes.set(pillar.id, cardGroup);
    });
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

    // Check both pillars and cards for interaction
    const interactableObjects: THREE.Object3D[] = [
      ...Array.from(this.pillarMeshes.values()),
    ];

    // Add card meshes to interactable objects
    this.cardMeshes.forEach((cardGroup) => {
      cardGroup.children.forEach((child) => {
        if (child.userData['isCard']) {
          interactableObjects.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(interactableObjects);

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

    // Check both pillars and cards for click interaction
    const interactableObjects: THREE.Object3D[] = [
      ...Array.from(this.pillarMeshes.values()),
    ];

    // Add card meshes to interactable objects
    this.cardMeshes.forEach((cardGroup) => {
      cardGroup.children.forEach((child) => {
        if (child.userData['isCard']) {
          interactableObjects.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0) {
      const pillarId = intersects[0].object.userData['pillarId'];
      this.onPillarClick(pillarId);
    }
  }

  private animatePillars(): void {
    const time = performance.now() * 0.001;

    this.pillarMeshes.forEach((mesh, pillarId) => {
      const pillarIndex = this.pillars.findIndex((p) => p.id === pillarId);

      // Gentle floating animation
      mesh.position.y = 3 + Math.sin(time * 0.8 + pillarIndex * 0.5) * 0.3;

      // Slow elegant rotation
      mesh.rotation.y = time * 0.1 + pillarIndex * 0.2;
      mesh.rotation.x = Math.sin(time * 0.5 + pillarIndex) * 0.1;
      mesh.rotation.z = Math.cos(time * 0.3 + pillarIndex) * 0.05;

      // Subtle scaling on hover
      if (this.activePillar() === pillarId) {
        const scale = 1.1 + Math.sin(time * 2) * 0.05;
        mesh.scale.setScalar(scale);

        // Enhanced glow on selection
        const glow = this.glowEffects.get(pillarId);
        if (glow) {
          (glow.material as THREE.MeshBasicMaterial).opacity =
            0.15 + Math.sin(time * 3) * 0.05;
          glow.scale.setScalar(1.4 + Math.sin(time * 2) * 0.1);
        }
      } else {
        mesh.scale.setScalar(1);
        const glow = this.glowEffects.get(pillarId);
        if (glow) {
          (glow.material as THREE.MeshBasicMaterial).opacity = 0.08;
          glow.scale.setScalar(1.3);
        }
      }

      // Gentle status indicator animation
      const indicator = this.statusIndicators.get(pillarId);
      if (indicator) {
        indicator.position.y = 5.5 + Math.sin(time * 1.5 + pillarIndex) * 0.1;
        (indicator.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.3 + Math.sin(time * 2 + pillarIndex) * 0.1;
      }
    });

    // Animate 3D cards
    this.cardMeshes.forEach((cardGroup, pillarId) => {
      const pillarIndex = this.pillars.findIndex((p) => p.id === pillarId);

      // Gentle floating for cards
      cardGroup.position.y = 1 + Math.sin(time * 0.6 + pillarIndex * 0.3) * 0.2;

      // Subtle rotation
      cardGroup.rotation.z = Math.sin(time * 0.4 + pillarIndex) * 0.02;

      // Enhanced effects when pillar is active
      if (this.activePillar() === pillarId) {
        // Bring card forward and scale slightly
        cardGroup.position.z = -4 + Math.sin(time * 2) * 0.8;
        cardGroup.scale.setScalar(1.15 + Math.sin(time * 3) * 0.05);

        // Enhanced glow on all border layers
        const borderMesh = cardGroup.children[1] as THREE.Mesh;
        const outerGlowMesh = cardGroup.children[2] as THREE.Mesh;

        if (borderMesh) {
          (borderMesh.material as THREE.MeshBasicMaterial).opacity =
            0.7 + Math.sin(time * 4) * 0.2;
        }
        if (outerGlowMesh) {
          (outerGlowMesh.material as THREE.MeshBasicMaterial).opacity =
            0.3 + Math.sin(time * 5) * 0.15;
        }
      } else {
        cardGroup.position.z = -6;
        cardGroup.scale.setScalar(1);

        const borderMesh = cardGroup.children[1] as THREE.Mesh;
        const outerGlowMesh = cardGroup.children[2] as THREE.Mesh;

        if (borderMesh) {
          (borderMesh.material as THREE.MeshBasicMaterial).opacity = 0.4;
        }
        if (outerGlowMesh) {
          (outerGlowMesh.material as THREE.MeshBasicMaterial).opacity = 0.15;
        }
      }

      // Mouse-responsive movement
      if (this.mouse.x !== 0 || this.mouse.y !== 0) {
        const mouseInfluence = 0.5;
        cardGroup.rotation.y =
          pillarIndex * 0.1 + this.mouse.x * mouseInfluence * 0.3;
        cardGroup.rotation.x =
          -Math.PI / 12 + this.mouse.y * mouseInfluence * 0.2;
      }
    });

    // Gentle ambient particle rotation for subtle movement
    if (this.ambientParticles) {
      this.ambientParticles.rotation.y += 0.002;

      // Subtle opacity animation for breathing effect
      const particleMaterial = this.ambientParticles
        .material as THREE.PointsMaterial;
      particleMaterial.opacity = 0.3 + Math.sin(time * 0.5) * 0.1;
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
        ease: 'power2.out',
      });
      gsap.to(glow.scale, {
        duration: 0.4,
        x: 1.3,
        y: 1.3,
        z: 1.3,
        ease: 'power2.out',
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
            ease: 'power2.out',
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
          ease: 'power2.out',
        });
        gsap.to(glow.scale, {
          duration: 0.4,
          x: 1,
          y: 1,
          z: 1,
          ease: 'power2.out',
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
    this.cardMeshes.clear();

    // Dispose card textures
    this.cardTextures.forEach((texture) => {
      texture.dispose();
    });
    this.cardTextures.clear();

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
