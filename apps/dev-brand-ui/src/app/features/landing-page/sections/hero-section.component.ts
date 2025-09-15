import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { gsap } from 'gsap';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-screen overflow-hidden bg-gradient-to-br from-black via-purple-900 to-black" [class.loaded]="isLoaded()">
      <!-- 3D Scene Container -->
      <div class="absolute inset-0 z-10" #sceneContainer></div>

      <!-- Hero Content Overlay -->
      <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div class="text-center max-w-4xl px-8 opacity-0 transform translate-y-8 transition-all duration-1000 ease-out pointer-events-auto" [class.opacity-100]="contentVisible()" [class.translate-y-0]="contentVisible()">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span class="block bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent">Enterprise AI</span>
            <span class="block bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 bg-clip-text text-transparent animate-pulse">SaaS Starter</span>
          </h1>
          <p class="text-lg md:text-xl lg:text-2xl leading-relaxed text-white text-opacity-85 mb-8 max-w-2xl mx-auto">
            Production-ready foundation for AI-powered applications combining
            <span class="text-purple-500 font-semibold" style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)">vector search</span>,
            <span class="text-purple-500 font-semibold" style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)">graph relationships</span>, and
            <span class="text-purple-500 font-semibold" style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)">intelligent workflows</span>
          </p>
          <div class="flex justify-center gap-4 my-8 flex-wrap">
            <div class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5">
              <span class="text-xl">🧠</span>
              <span>Semantic Intelligence</span>
            </div>
            <div class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5">
              <span class="text-xl">🕸️</span>
              <span>Relationship Mapping</span>
            </div>
            <div class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5">
              <span class="text-xl">⚡</span>
              <span>Intelligent Workflows</span>
            </div>
          </div>
          <div class="flex justify-center gap-4 mt-10 flex-wrap">
            <button class="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300 backdrop-blur-lg hover:-translate-y-1" style="box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4)" (click)="exploreDemo()" onmouseover="this.style.boxShadow='0 8px 30px rgba(138, 43, 226, 0.6)'" onmouseout="this.style.boxShadow='0 4px 20px rgba(138, 43, 226, 0.4)'">
              <span>Explore Live Demo</span>
              <span class="text-xl">🚀</span>
            </button>
            <button class="flex items-center gap-2 px-8 py-4 bg-white bg-opacity-10 text-white border border-white border-opacity-30 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300 backdrop-blur-lg hover:bg-opacity-20 hover:-translate-y-0.5" (click)="viewArchitecture()">
              <span>View Architecture</span>
              <span class="text-xl">🏗️</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Performance Indicator -->
      <div class="absolute top-5 right-5 bg-black bg-opacity-70 text-green-400 px-2 py-2 rounded text-xs font-mono z-30" *ngIf="showPerformanceDebug()">
        FPS: {{currentFPS()}} | Agents: {{heroAgents().length}}
      </div>
    </div>
  `,
  styles: [`
  :host,
    .hero-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: linear-gradient(135deg, #000000 0%, #1a0033 50%, #000000 100%);
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
      background: linear-gradient(135deg, #8a2be2 0%, #ff69b4 50%, #00bfff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes shimmer {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
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

    .primary-btn, .secondary-btn {
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

      .primary-btn, .secondary-btn {
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
  `]
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

  // Hero-specific agent configuration for 3D positioning
  readonly heroAgents = signal([
    {
      id: 'hero-central',
      name: 'Central Intelligence',
      type: 'coordinator',
      position: { x: 0, y: 0, z: 0 },
      scale: 1.5,
      isActive: true,
      color: '#8a2be2'
    },
    {
      id: 'hero-memory',
      name: 'Memory Agent',
      type: 'memory',
      position: { x: -4, y: 3, z: -2 },
      scale: 1.0,
      isActive: true,
      color: '#ff69b4'
    },
    {
      id: 'hero-workflow',
      name: 'Workflow Agent',
      type: 'workflow',
      position: { x: 4, y: -2, z: -3 },
      scale: 1.0,
      isActive: true,
      color: '#00bfff'
    },
    {
      id: 'hero-analytics',
      name: 'Analytics Agent',
      type: 'analytics',
      position: { x: -3, y: -3, z: 2 },
      scale: 1.0,
      isActive: true,
      color: '#32cd32'
    },
    {
      id: 'hero-integration',
      name: 'Integration Agent',
      type: 'integration',
      position: { x: 3, y: 4, z: 1 },
      scale: 1.0,
      isActive: true,
      color: '#ffd700'
    }
  ]);

  ngOnInit(): void {
    this.initializeHeroSection();
    this.setupResponsiveHandling();
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
      this.updateAgentPositions();
    };

    window.addEventListener('resize', handleResize);
  }

  private updateAgentPositions(): void {
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
      powerPreference: 'high-performance'
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
    const agents = this.heroAgents();
    
    agents.forEach((agent, index) => {
      // Create sphere geometry with enhanced detail
      const geometry = new THREE.SphereGeometry(0.8, 32, 32);
      
      // Create material with agent-specific color and effects
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(agent.color),
        metalness: 0.3,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.1,
        ior: 1.5,
        thickness: 0.5,
        emissive: new THREE.Color(agent.color).multiplyScalar(0.2)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(new THREE.Vector3(agent.position.x, agent.position.y, agent.position.z));
      mesh.scale.setScalar(agent.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(agent.color),
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      mesh.add(glowMesh);
      
      this.scene.add(mesh);
      this.agentMeshes.push(mesh);
      
      // Initial animation setup
      gsap.set(mesh.scale, { x: 0, y: 0, z: 0 });
      gsap.set(mesh.position, { y: mesh.position.y - 5 });
    });
  }

  private createParticleSystem(): void {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // const color = new THREE.Color();
    const colorChoices = [
      new THREE.Color('#8a2be2'),
      new THREE.Color('#ff69b4'),
      new THREE.Color('#00bfff'),
      new THREE.Color('#32cd32'),
      new THREE.Color('#ffd700')
    ];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in a sphere around the constellation
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Random color from our palette
      const chosenColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;
      
      sizes[i] = Math.random() * 3 + 1;
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);
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
    // Camera entrance animation
    gsap.fromTo(this.camera.position, 
      { z: 50, y: -10 },
      { 
        z: 15,
        y: 0,
        duration: 3,
        ease: 'power2.out'
      }
    );
    
    // Agent meshes entrance with staggered timing
    this.agentMeshes.forEach((mesh, index) => {
      gsap.to(mesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.5,
        delay: index * 0.3,
        ease: 'back.out(1.7)'
      });
      
      gsap.to(mesh.position, {
        y: mesh.userData['originalY'] || mesh.position.y + 5,
        duration: 2,
        delay: index * 0.3,
        ease: 'power2.out'
      });
    });
    
    // Particle system fade in
    gsap.fromTo(this.particleSystem.material, 
      { opacity: 0 },
      { 
        opacity: 0.8,
        duration: 4,
        delay: 1
      }
    );
    
    // Content visibility with enhanced timing
    setTimeout(() => {
      this.contentVisible.set(true);
    }, 2000);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      
      // const deltaTime = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();
      
      // Animate agent meshes with floating motion
      this.agentMeshes.forEach((mesh, index) => {
        mesh.rotation.y += 0.01;
        mesh.position.y += Math.sin(elapsedTime * 2 + index) * 0.01;
      });
      
      // Animate particle system
      if (this.particleSystem) {
        this.particleSystem.rotation.y += 0.001;
        this.particleSystem.rotation.x += 0.0005;
      }
      
      // Gentle camera movement for depth
      this.camera.position.x = Math.sin(elapsedTime * 0.1) * 0.5;
      this.camera.position.y = Math.cos(elapsedTime * 0.15) * 0.3;
      this.camera.lookAt(0, 0, 0);
      
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
      behavior: 'smooth'
    });
  }

  viewArchitecture(): void {
    // Scroll to architecture diagram section
    document.getElementById('architecture-diagram')?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}
