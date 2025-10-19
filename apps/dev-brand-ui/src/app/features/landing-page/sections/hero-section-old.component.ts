import {
  Component,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { gsap } from 'gsap';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [],
  template: `
    <div
      class="relative w-full h-screen overflow-auto bg-gradient-to-br from-black via-purple-900 to-black"
      [class.loaded]="isLoaded()"
    >
      <!-- 3D Scene Container -->
      <div class="absolute inset-0 z-10" #sceneContainer></div>

      <!-- Hero Content Overlay -->
      <div
        class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      >
        <div
          class="text-center max-w-4xl px-8 opacity-0 transform translate-y-8 transition-all duration-1000 ease-out pointer-events-auto"
          [class.opacity-100]="contentVisible()"
          [class.translate-y-0]="contentVisible()"
        >
          <h1
            class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            <span
              class="block bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent"
              >Enterprise AI</span
            >
            <span
              class="block bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 bg-clip-text text-transparent animate-pulse"
              >SaaS Starter</span
            >
          </h1>
          <p
            class="text-lg md:text-xl lg:text-2xl leading-relaxed text-white text-opacity-85 mb-8 max-w-2xl mx-auto"
          >
            Production-ready foundation for AI-powered applications combining
            <span
              class="text-purple-500 font-semibold"
              style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)"
              >vector search</span
            >,
            <span
              class="text-purple-500 font-semibold"
              style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)"
              >graph relationships</span
            >, and
            <span
              class="text-purple-500 font-semibold"
              style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)"
              >intelligent workflows</span
            >
          </p>
          <div class="flex justify-center gap-4 my-8 flex-wrap">
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5"
            >
              <span class="text-xl">🧠</span>
              <span>Semantic Intelligence</span>
            </div>
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5"
            >
              <span class="text-xl">🕸️</span>
              <span>Relationship Mapping</span>
            </div>
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5"
            >
              <span class="text-xl">⚡</span>
              <span>Intelligent Workflows</span>
            </div>
          </div>
          <div class="flex justify-center gap-4 mt-10 flex-wrap">
            <button
              class="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300 backdrop-blur-lg hover:-translate-y-1"
              style="box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4)"
              (click)="exploreDemo()"
              onmouseover="this.style.boxShadow='0 8px 30px rgba(138, 43, 226, 0.6)'"
              onmouseout="this.style.boxShadow='0 4px 20px rgba(138, 43, 226, 0.4)'"
            >
              <span>Explore Live Demo</span>
              <span class="text-xl">🚀</span>
            </button>
            <button
              class="flex items-center gap-2 px-8 py-4 bg-white bg-opacity-10 text-white border border-white border-opacity-30 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300 backdrop-blur-lg hover:bg-opacity-20 hover:-translate-y-0.5"
              (click)="viewArchitecture()"
            >
              <span>View Architecture</span>
              <span class="text-xl">🏗️</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Performance Indicator -->
      @if (showPerformanceDebug()) {
      <div
        class="absolute top-5 right-5 bg-black bg-opacity-70 text-green-400 px-2 py-2 rounded text-xs font-mono z-30"
      >
        FPS: {{ currentFPS() }} | Circles: {{ heroCircles().length }}
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host,
      .hero-container {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: linear-gradient(
          135deg,
          #000000 0%,
          #1a0033 50%,
          #000000 100%
        );
      }

      .scene-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      }

      /* Canvas styling for Three.js integration */
      .scene-container canvas {
        width: 100% !important;
        height: 100% !important;
      }

      .hero-content {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
        pointer-events: none;
      }

      .hero-text {
        text-align: center;
        max-width: 800px;
        padding: 2rem;
        opacity: 0;
        transform: translateY(30px);
        transition: all 1.2s ease-out;
        pointer-events: auto;
      }

      .hero-text.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .hero-title {
        font-size: clamp(2.5rem, 5vw, 4rem);
        font-weight: 700;
        margin: 0 0 1.5rem 0;
        line-height: 1.1;
      }

      .title-line {
        display: block;
        background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .title-line.highlight {
        background: linear-gradient(
          135deg,
          #8a2be2 0%,
          #ff69b4 50%,
          #00bfff 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%,
        100% {
          filter: brightness(1);
        }
        50% {
          filter: brightness(1.3);
        }
      }

      .hero-subtitle {
        font-size: clamp(1.1rem, 2.5vw, 1.4rem);
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.85);
        margin: 0 0 2rem 0;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      .tech-highlight {
        color: #8a2be2;
        font-weight: 600;
        text-shadow: 0 0 10px rgba(138, 43, 226, 0.5);
      }

      .hero-features {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin: 2rem 0;
        flex-wrap: wrap;
      }

      .feature-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 25px;
        backdrop-filter: blur(10px);
        font-size: 0.9rem;
        color: #ffffff;
        transition: all 0.3s ease;
      }

      .feature-badge:hover {
        background: rgba(138, 43, 226, 0.2);
        border-color: rgba(138, 43, 226, 0.5);
        transform: translateY(-2px);
      }

      .badge-icon {
        font-size: 1.2rem;
      }

      .hero-actions {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 2.5rem;
        flex-wrap: wrap;
      }

      .primary-btn,
      .secondary-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 2rem;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .primary-btn {
        background: linear-gradient(135deg, #8a2be2 0%, #ff69b4 100%);
        color: #ffffff;
        box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
      }

      .primary-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
      }

      .secondary-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .secondary-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      .btn-icon {
        font-size: 1.2rem;
      }

      .performance-indicator {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: #00ff00;
        padding: 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.8rem;
        z-index: 3;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .hero-text {
          padding: 1rem;
        }

        .hero-features {
          flex-direction: column;
          align-items: center;
        }

        .hero-actions {
          flex-direction: column;
          align-items: center;
        }

        .primary-btn,
        .secondary-btn {
          width: 100%;
          max-width: 280px;
          justify-content: center;
        }
      }

      /* Animation delays for staggered entrance */
      .hero-text.visible .hero-title {
        animation: slideUp 0.8s ease-out 0.2s both;
      }

      .hero-text.visible .hero-subtitle {
        animation: slideUp 0.8s ease-out 0.4s both;
      }

      .hero-text.visible .hero-features {
        animation: slideUp 0.8s ease-out 0.6s both;
      }

      .hero-text.visible .hero-actions {
        animation: slideUp 0.8s ease-out 0.8s both;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  @ViewChild('sceneContainer', { static: true }) sceneContainer!: ElementRef;

  // Three.js 3D Scene
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private agentMeshes: THREE.Mesh[] = [];
  private particleSystem!: THREE.Points;
  private animationFrame?: number;
  private clock = new THREE.Clock();

  // Component state
  readonly isLoaded = signal(false);
  readonly contentVisible = signal(false);
  readonly sceneWidth = signal(window.innerWidth);
  readonly sceneHeight = signal(window.innerHeight);
  readonly currentFPS = signal(60);
  readonly showPerformanceDebug = signal(false); // Set to true for development

  // Mouse tracking for interactive animation
  private mousePosition = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };

  // Hero-specific agent configuration for 3D positioning
  // Restored floating circles positioned around hero text area
  readonly heroCircles = signal([
    {
      id: 'circle-1',
      name: 'Floating Circle 1',
      type: 'sphere',
      position: { x: -6, y: 2, z: -1 },
      scale: 1.2,
      isActive: true,
      color: '#8a2be2',
    },
    {
      id: 'circle-2',
      name: 'Floating Circle 2',
      type: 'sphere',
      position: { x: 6, y: -1, z: -2 },
      scale: 0.9,
      isActive: true,
      color: '#ff69b4',
    },
    {
      id: 'circle-3',
      name: 'Floating Circle 3',
      type: 'sphere',
      position: { x: -4, y: -3, z: 1 },
      scale: 1.0,
      isActive: true,
      color: '#00bfff',
    },
    {
      id: 'circle-4',
      name: 'Floating Circle 4',
      type: 'sphere',
      position: { x: 5, y: 3, z: 0 },
      scale: 0.8,
      isActive: true,
      color: '#32cd32',
    },
    {
      id: 'circle-5',
      name: 'Floating Circle 5',
      type: 'sphere',
      position: { x: -7, y: 0, z: 2 },
      scale: 1.1,
      isActive: true,
      color: '#ffd700',
    },
  ]);

  ngOnInit(): void {
    this.initializeHeroSection();
    this.setupResponsiveHandling();
    this.setupMouseTracking();
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private async initializeHeroSection(): Promise<void> {
    try {
      await this.init3DScene();
      this.createAgentConstellation();
      this.createParticleSystem();
      this.setupLighting();
      this.startRenderLoop();

      // Mark as loaded
      this.isLoaded.set(true);

      // Cinematic entrance animation
      this.cinematicEntrance();
    } catch (error) {
      console.error('Failed to initialize hero section:', error);
      this.isLoaded.set(true);
      this.contentVisible.set(true);
    }
  }

  private setupResponsiveHandling(): void {
    const handleResize = () => {
      this.sceneWidth.set(window.innerWidth);
      this.sceneHeight.set(window.innerHeight);
      this.updateShapePositions();
    };

    window.addEventListener('resize', handleResize);
  }

  private setupMouseTracking(): void {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse position to -1 to 1 range
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Calculate target rotation based on mouse position - more aggressive response
      this.targetRotation.y = this.mousePosition.x * 0.4; // 4x more aggressive
      this.targetRotation.x = this.mousePosition.y * 0.2; // 4x more aggressive
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
  }

  private updateShapePositions(): void {
    // Update 3D camera and renderer on resize
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  private async init3DScene(): Promise<void> {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);

    // Create camera with cinematic perspective
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);

    // Create renderer with advanced settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Add to DOM
    this.sceneContainer.nativeElement.appendChild(this.renderer.domElement);
  }

  private createAgentConstellation(): void {
    const circles = this.heroCircles();

    circles.forEach((circle, index) => {
      // Create sphere geometry with high detail for smooth circles
      const geometry = new THREE.SphereGeometry(0.8, 32, 32);

      // Create material with proper 3D shading and lighting
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(circle.color),
        metalness: 0.3,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.1,
        ior: 1.5,
        thickness: 0.5,
        emissive: new THREE.Color(circle.color).multiplyScalar(0.2),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(
        new THREE.Vector3(
          circle.position.x,
          circle.position.y,
          circle.position.z
        )
      );
      mesh.scale.setScalar(circle.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Add glow effect for circles
      const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(circle.color),
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      mesh.add(glowMesh);

      this.scene.add(mesh);
      this.agentMeshes.push(mesh);

      // Store original position for mouse interaction
      mesh.userData['originalPosition'] = {
        x: circle.position.x,
        y: circle.position.y,
        z: circle.position.z,
      };

      // Initial animation setup
      gsap.set(mesh.scale, { x: 0, y: 0, z: 0 });
      gsap.set(mesh.position, { y: mesh.position.y - 5 });
    });
  }

  private createParticleSystem(): void {
    // Create 3D cubes as background shapes with proper lighting
    this.createBackgroundCubes();

    // Much reduced particle density, keeping them away from center text
    const particleCount = 200; // Even fewer particles
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorChoices = [
      new THREE.Color('#4a1d6b'), // Darker purple
      new THREE.Color('#2d1b47'), // Dark purple
      new THREE.Color('#1a0d2e'), // Very dark purple
      new THREE.Color('#261242'), // Dark violet
      new THREE.Color('#1e1139'), // Dark navy
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Create a larger "exclusion zone" around the text - push particles to edges
      let x, y, z;
      do {
        const radius = 12 + Math.random() * 25; // Start further from center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.PI / 2 + (Math.random() - 0.5) * 1.4;

        x = radius * Math.sin(phi) * Math.cos(theta);
        y = (Math.random() - 0.5) * 15; // Wider vertical spread
        z = radius * Math.cos(phi) * 0.3; // Shallow depth
      } while (Math.abs(x) < 8 && Math.abs(y) < 4); // Larger exclusion zone

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Random color from our palette
      const chosenColor =
        colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;

      sizes[i] = Math.random() * 1.5 + 0.3;
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

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.8, // Smaller particles
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.5, // Much lower opacity
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  private createBackgroundCubes(): void {
    // Create fewer 3D background cubes positioned at edges and higher/lower areas
    const cubeCount = 35;

    // Darker, more subtle colors that won't compete with text
    const cubeColors = [
      '#2d1b47', // Dark purple
      '#1a0d2e', // Very dark purple
      '#0f0a1c', // Nearly black purple
      '#1e1139', // Dark navy purple
      '#261242', // Dark violet
      '#0a0a15', // Deep dark
    ];

    for (let i = 0; i < cubeCount; i++) {
      // Smaller, more varied cube sizes
      const size = 0.8 + Math.random() * 1.8;
      const geometry = new THREE.BoxGeometry(size, size, size);

      // Darker material with lower opacity for subtle presence
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(
          cubeColors[Math.floor(Math.random() * cubeColors.length)]
        ),
        transparent: true,
        opacity: 0.6, // Much lower opacity
      });

      const cube = new THREE.Mesh(geometry, material);

      // Position cubes around edges and away from center text area
      let x = 0;
      let y = 0;
      let z = 0;

      // Create distinct zones: top, bottom, left, right edges
      const zone = Math.floor(Math.random() * 4);

      switch (zone) {
        case 0: // Top area
          x = (Math.random() - 0.5) * 50;
          y = 8 + Math.random() * 15; // High up
          z = -8 + Math.random() * -20;
          break;
        case 1: // Bottom area
          x = (Math.random() - 0.5) * 50;
          y = -8 - Math.random() * 15; // Down low
          z = -8 + Math.random() * -20;
          break;
        case 2: // Left side
          x = -15 - Math.random() * 25; // Far left
          y = (Math.random() - 0.5) * 30;
          z = -8 + Math.random() * -20;
          break;
        case 3: // Right side
          x = 15 + Math.random() * 25; // Far right
          y = (Math.random() - 0.5) * 30;
          z = -8 + Math.random() * -20;
          break;
      }

      // Ensure we stay away from the central text area (-10 to 10 x, -6 to 6 y)
      if (Math.abs(x) < 12 && Math.abs(y) < 8) {
        // Push further out if too close to center
        if (Math.abs(x) > Math.abs(y)) {
          x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
        } else {
          y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
        }
      }

      cube.position.set(x, y, z);
      cube.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      cube.castShadow = true;
      cube.receiveShadow = true;

      // Store original position and rotation for animation
      cube.userData['originalPosition'] = { x, y, z };
      cube.userData['originalRotation'] = {
        x: cube.rotation.x,
        y: cube.rotation.y,
        z: cube.rotation.z,
      };

      this.scene.add(cube);
      this.agentMeshes.push(cube);
    }
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Colored accent lights
    const light1 = new THREE.PointLight(0x8a2be2, 0.8, 50);
    light1.position.set(-10, 5, 5);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0x00bfff, 0.8, 50);
    light2.position.set(10, -5, 5);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0xff69b4, 0.6, 40);
    light3.position.set(0, 10, -5);
    this.scene.add(light3);
  }

  private cinematicEntrance(): void {
    // Camera entrance animation - closer positioning
    gsap.fromTo(
      this.camera.position,
      { z: 30, y: -5 },
      {
        z: 12,
        y: 0,
        duration: 2.5,
        ease: 'power2.out',
      }
    );

    // Cube meshes entrance with staggered timing
    this.agentMeshes.forEach((mesh, index) => {
      gsap.to(mesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.2,
        delay: index * 0.2,
        ease: 'back.out(1.4)',
      });

      gsap.to(mesh.position, {
        y: mesh.userData['originalPosition']?.y || mesh.position.y + 5,
        duration: 1.5,
        delay: index * 0.2,
        ease: 'power2.out',
      });
    });

    // Particle system fade in - lower opacity
    gsap.fromTo(
      this.particleSystem.material,
      { opacity: 0 },
      {
        opacity: 0.6,
        duration: 3,
        delay: 0.8,
      }
    );

    // Content visibility with enhanced timing
    setTimeout(() => {
      this.contentVisible.set(true);
    }, 1500);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      // Faster, more responsive interpolation to mouse movement
      this.currentRotation.x +=
        (this.targetRotation.x - this.currentRotation.x) * deltaTime * 5; // 2.5x faster response
      this.currentRotation.y +=
        (this.targetRotation.y - this.currentRotation.y) * deltaTime * 5; // 2.5x faster response

      // Apply mouse-based rotation to camera - more dramatic movement
      this.camera.position.x = Math.sin(this.currentRotation.y) * 12;
      this.camera.position.z = Math.cos(this.currentRotation.y) * 12;
      this.camera.position.y = this.currentRotation.x * 6; // 2x more camera movement
      this.camera.lookAt(0, 0, 0);

      // Separate animation for floating circles vs background cubes
      this.agentMeshes.forEach((mesh, index) => {
        const originalPos = mesh.userData['originalPosition'];
        if (originalPos) {
          // Floating circles (first 5 meshes) - mouse responsive with gentle floating
          if (index < 5) {
            // Subtle floating motion for circles
            mesh.position.y =
              originalPos.y + Math.sin(elapsedTime * 1.5 + index) * 0.3;

            // More aggressive mouse-responsive rotation for circles
            mesh.rotation.x = elapsedTime * 0.01 + this.currentRotation.x * 0.6; // 3x more rotation
            mesh.rotation.y = elapsedTime * 0.02 + this.currentRotation.y * 0.8; // More rotation

            // More dramatic position offset based on mouse for circles
            mesh.position.x = originalPos.x + this.currentRotation.y * 2.0; // 2.5x more movement
            mesh.position.z = originalPos.z + this.currentRotation.x * 1.2; // More depth movement
          } else {
            // Background cubes - slow continuous rotation with mouse influence
            const originalRot = mesh.userData['originalRotation'];
            if (originalRot) {
              mesh.rotation.x =
                originalRot.x +
                elapsedTime * 0.02 +
                this.currentRotation.x * 0.3; // 3x more rotation
              mesh.rotation.y =
                originalRot.y +
                elapsedTime * 0.03 +
                this.currentRotation.y * 0.4; // 4x more rotation
              mesh.rotation.z =
                originalRot.z +
                elapsedTime * 0.01 +
                this.currentRotation.x * 0.2; // Added Z rotation

              // More noticeable position shift for background cubes
              mesh.position.x = originalPos.x + this.currentRotation.y * 0.8; // 4x more movement
              mesh.position.y =
                originalPos.y +
                Math.sin(elapsedTime * 0.5 + index) * 0.1 +
                this.currentRotation.x * 0.3;
              mesh.position.z = originalPos.z + this.currentRotation.x * 0.4; // 4x more depth movement
            }
          }
        }
      });

      // Particle system responds more aggressively to mouse movement
      if (this.particleSystem) {
        this.particleSystem.rotation.y = this.currentRotation.y * 0.3; // 3x more rotation
        this.particleSystem.rotation.x = this.currentRotation.x * 0.15; // 3x more rotation
        // Add subtle position shift for particles too
        this.particleSystem.position.x = this.currentRotation.y * 0.5;
        this.particleSystem.position.y = this.currentRotation.x * 0.3;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  trackByAgentId(index: number, agent: any): string {
    return agent.id;
  }

  exploreDemo(): void {
    // Scroll to demo theater section
    document.getElementById('demo-theater')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  viewArchitecture(): void {
    // Scroll to architecture diagram section
    document.getElementById('architecture-diagram')?.scrollIntoView({
      behavior: 'smooth',
    });
  }
}
