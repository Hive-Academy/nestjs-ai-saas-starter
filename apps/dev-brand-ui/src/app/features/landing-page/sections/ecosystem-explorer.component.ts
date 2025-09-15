import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';

@Component({
  selector: 'app-ecosystem-explorer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ecosystem-explorer-section">
      <div class="section-header">
        <h2 class="section-title">Library Ecosystem</h2>
        <p class="section-description">Interactive 3D visualization of our modular architecture with {{ libraryCount }} specialized libraries</p>
      </div>
      
      <div class="ecosystem-container">
        <div #ecosystemCanvas class="ecosystem-canvas"></div>
        
        <div class="ecosystem-overlay">
          <div class="library-info" *ngIf="selectedLibrary">
            <h3>{{ selectedLibrary.name }}</h3>
            <p class="library-description">{{ selectedLibrary.description }}</p>
            <div class="library-stats">
              <span class="stat">{{ selectedLibrary.type }}</span>
              <span class="stat">{{ selectedLibrary.dependencies.length }} dependencies</span>
            </div>
            <div class="dependency-list">
              <h4>Connected Libraries:</h4>
              <ul>
                <li *ngFor="let dep of selectedLibrary.dependencies">{{ dep }}</li>
              </ul>
            </div>
          </div>
          
          <div class="ecosystem-controls">
            <button 
              class="control-btn" 
              [class.active]="currentView === 'grid'"
              (click)="switchView('grid')">
              Grid View
            </button>
            <button 
              class="control-btn" 
              [class.active]="currentView === 'dependency'"
              (click)="switchView('dependency')">
              Dependencies
            </button>
            <button 
              class="control-btn" 
              [class.active]="currentView === 'layers'"
              (click)="switchView('layers')">
              Layer View
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .ecosystem-explorer-section {
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .section-header {
      text-align: center;
      padding: 2rem 1rem;
      z-index: 10;
      position: relative;
    }

    .section-title {
      font-size: 3.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #32cd32 0%, #90ee90 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1rem;
      text-shadow: 0 0 30px rgba(50, 205, 50, 0.3);
    }

    .section-description {
      font-size: 1.3rem;
      color: rgba(255, 255, 255, 0.8);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .ecosystem-container {
      flex: 1;
      position: relative;
      display: flex;
    }

    .ecosystem-canvas {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .ecosystem-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 5;
    }

    .library-info {
      position: absolute;
      top: 2rem;
      right: 2rem;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(50, 205, 50, 0.3);
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 300px;
      color: white;
      pointer-events: auto;
      transition: all 0.3s ease;
    }

    .library-info h3 {
      color: #32cd32;
      margin-bottom: 0.5rem;
      font-size: 1.4rem;
    }

    .library-description {
      margin-bottom: 1rem;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.9);
    }

    .library-stats {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .stat {
      background: rgba(50, 205, 50, 0.2);
      color: #32cd32;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.9rem;
    }

    .dependency-list {
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 1rem;
    }

    .dependency-list h4 {
      margin-bottom: 0.5rem;
      color: #90ee90;
      font-size: 1rem;
    }

    .dependency-list ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .dependency-list li {
      padding: 0.2rem 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
    }

    .ecosystem-controls {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 1rem;
      pointer-events: auto;
    }

    .control-btn {
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(50, 205, 50, 0.3);
      color: rgba(255, 255, 255, 0.8);
      padding: 0.8rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      backdrop-filter: blur(5px);
    }

    .control-btn:hover {
      background: rgba(50, 205, 50, 0.1);
      border-color: #32cd32;
      color: #32cd32;
      transform: translateY(-2px);
    }

    .control-btn.active {
      background: rgba(50, 205, 50, 0.2);
      border-color: #32cd32;
      color: #32cd32;
      box-shadow: 0 0 20px rgba(50, 205, 50, 0.3);
    }

    @media (max-width: 768px) {
      .section-title {
        font-size: 2.5rem;
      }
      
      .library-info {
        top: 1rem;
        right: 1rem;
        left: 1rem;
        max-width: none;
      }
      
      .ecosystem-controls {
        bottom: 1rem;
        flex-direction: column;
        align-items: center;
      }
      
      .control-btn {
        width: 120px;
        text-align: center;
      }
    }
  `]
})
export class EcosystemExplorerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ecosystemCanvas', { static: true }) canvasRef!: ElementRef<HTMLElement>;
  
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly ngZone = inject(NgZone);
  
  private sceneId = 'ecosystem-explorer';
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  private libraryMeshes: THREE.Mesh[] = [];
  private dependencyLines: THREE.Line[] = [];
  private animationFrameId: number | null = null;
  
  // Component state
  currentView: 'grid' | 'dependency' | 'layers' = 'grid';
  selectedLibrary: any = null;
  libraryCount = 0;
  
  // Library data structure
  private libraries = [
    {
      name: 'nestjs-chromadb',
      type: 'Core Foundation',
      description: 'Vector database integration for semantic search and embeddings',
      color: '#32cd32',
      position: { x: -4, y: 2, z: 0 },
      dependencies: ['nestjs-langgraph']
    },
    {
      name: 'nestjs-neo4j',
      type: 'Core Foundation', 
      description: 'Graph database integration for complex relationships',
      color: '#4169e1',
      position: { x: 0, y: 2, z: 0 },
      dependencies: ['nestjs-langgraph']
    },
    {
      name: 'nestjs-langgraph',
      type: 'Core Foundation',
      description: 'AI workflow orchestration and agent coordination',
      color: '#ffd700',
      position: { x: 4, y: 2, z: 0 },
      dependencies: []
    },
    {
      name: 'core',
      type: 'Foundation',
      description: 'Core utilities and base functionality',
      color: '#ff6347',
      position: { x: -6, y: 0, z: 0 },
      dependencies: []
    },
    {
      name: 'functional-api',
      type: 'Foundation',
      description: 'Functional programming patterns and API utilities',
      color: '#ff6347',
      position: { x: 6, y: 0, z: 0 },
      dependencies: ['core']
    },
    {
      name: 'memory',
      type: 'Domain',
      description: 'Intelligent memory management and context retention',
      color: '#9370db',
      position: { x: -4, y: -1, z: 2 },
      dependencies: ['core', 'nestjs-chromadb']
    },
    {
      name: 'platform',
      type: 'Domain',
      description: 'Platform-specific integrations and abstractions',
      color: '#9370db',
      position: { x: 4, y: -1, z: 2 },
      dependencies: ['core']
    },
    {
      name: 'workflow-engine',
      type: 'Orchestration',
      description: 'Advanced workflow orchestration and execution',
      color: '#ff8c00',
      position: { x: -2, y: 0, z: -2 },
      dependencies: ['core', 'nestjs-langgraph']
    },
    {
      name: 'multi-agent',
      type: 'Orchestration',
      description: 'Multi-agent coordination and communication',
      color: '#ff8c00',
      position: { x: 2, y: 0, z: -2 },
      dependencies: ['core', 'nestjs-langgraph']
    },
    {
      name: 'streaming',
      type: 'Cross-Cutting',
      description: 'Real-time streaming and event processing',
      color: '#00ced1',
      position: { x: -3, y: -2, z: 1 },
      dependencies: ['core']
    },
    {
      name: 'checkpoint',
      type: 'Cross-Cutting',
      description: 'State persistence and recovery mechanisms',
      color: '#00ced1',
      position: { x: -1, y: -2, z: 1 },
      dependencies: ['core']
    },
    {
      name: 'hitl',
      type: 'Cross-Cutting',
      description: 'Human-in-the-loop interaction patterns',
      color: '#00ced1',
      position: { x: 1, y: -2, z: 1 },
      dependencies: ['core']
    },
    {
      name: 'monitoring',
      type: 'Cross-Cutting',
      description: 'Production observability and monitoring',
      color: '#00ced1',
      position: { x: 3, y: -2, z: 1 },
      dependencies: ['core']
    },
    {
      name: 'time-travel',
      type: 'Cross-Cutting',
      description: 'Time-travel debugging and state inspection',
      color: '#00ced1',
      position: { x: 0, y: -2, z: -1 },
      dependencies: ['core', 'checkpoint']
    }
  ];
  
  ngAfterViewInit(): void {
    this.libraryCount = this.libraries.length;
    this.initializeEcosystem();
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  private initializeEcosystem(): void {
    const sceneInstance = this.threeService.createScene(
      this.sceneId,
      this.canvasRef.nativeElement,
      {
        enableOrbitControls: true,
        backgroundColor: 0x0a0a1a,
        antialias: true,
        alpha: true
      }
    );
    
    if (!sceneInstance) {
      console.error('Failed to create ecosystem scene');
      return;
    }
    
    this.scene = sceneInstance.scene;
    this.camera = sceneInstance.camera;
    this.renderer = sceneInstance.renderer;
    
    this.setupScene();
    this.createLibraryGrid();
    this.setupInteractions();
    this.startAnimation();
    
    this.threeService.activateScene(this.sceneId, () => this.render());
  }
  
  private setupScene(): void {
    if (!this.scene || !this.camera) return;
    
    // Camera positioning
    this.camera.position.set(10, 8, 10);
    this.camera.lookAt(0, 0, 0);
    
    // Ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0x32cd32, 0.6, 20);
    pointLight1.position.set(-5, 5, 5);
    this.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x4169e1, 0.6, 20);
    pointLight2.position.set(5, 5, -5);
    this.scene.add(pointLight2);
    
    // Particle system for atmosphere
    this.createParticleSystem();
  }
  
  private createParticleSystem(): void {
    if (!this.scene) return;
    
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 40;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 40;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x32cd32,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    this.scene.add(particleSystem);
  }
  
  private createLibraryGrid(): void {
    if (!this.scene) return;
    
    this.libraries.forEach((library, index) => {
      const mesh = this.createLibraryMesh(library, index);
      this.libraryMeshes.push(mesh);
      this.scene!.add(mesh);
    });
    
    this.createDependencyConnections();
  }
  
  private createLibraryMesh(library: any, index: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: library.color,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(library.position.x, library.position.y, library.position.z);
    mesh.userData = { library, index };
    
    // Add wireframe overlay
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ 
      color: library.color,
      transparent: true,
      opacity: 0.3
    }));
    mesh.add(line);
    
    return mesh;
  }
  
  private createDependencyConnections(): void {
    if (!this.scene) return;
    
    this.libraries.forEach((library) => {
      library.dependencies.forEach((depName: string) => {
        const targetLibrary = this.libraries.find(lib => lib.name === depName);
        if (targetLibrary) {
          const line = this.createConnectionLine(library.position, targetLibrary.position);
          this.dependencyLines.push(line);
          this.scene!.add(line);
        }
      });
    });
  }
  
  private createConnectionLine(start: any, end: any): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(end.x, end.y, end.z)
    ]);
    
    const material = new THREE.LineBasicMaterial({
      color: 0x32cd32,
      transparent: true,
      opacity: 0.3
    });
    
    return new THREE.Line(geometry, material);
  }
  
  private setupInteractions(): void {
    if (!this.canvasRef?.nativeElement) return;
    
    this.canvasRef.nativeElement.addEventListener('mousemove', (event) => {
      this.onMouseMove(event);
    });
    
    this.canvasRef.nativeElement.addEventListener('click', (event) => {
      this.onMouseClick(event);
    });
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (!this.canvasRef?.nativeElement || !this.camera || !this.renderer) return;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.libraryMeshes);
    
    // Reset all materials
    this.libraryMeshes.forEach(mesh => {
      const material = mesh.material as THREE.MeshPhongMaterial;
      material.opacity = 0.8;
      mesh.scale.set(1, 1, 1);
    });
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const material = mesh.material as THREE.MeshPhongMaterial;
      material.opacity = 1.0;
      mesh.scale.set(1.2, 1.2, 1.2);
      
      this.canvasRef.nativeElement.style.cursor = 'pointer';
    } else {
      this.canvasRef.nativeElement.style.cursor = 'default';
    }
  }
  
  private onMouseClick(event: MouseEvent): void {
    if (!this.camera) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.libraryMeshes);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.selectedLibrary = mesh.userData.library;
      this.highlightLibraryAndDependencies(mesh.userData.library);
    } else {
      this.selectedLibrary = null;
      this.resetLibraryHighlights();
    }
  }
  
  private highlightLibraryAndDependencies(library: any): void {
    // Reset all
    this.resetLibraryHighlights();
    
    // Highlight selected library
    const selectedMesh = this.libraryMeshes.find(mesh => 
      mesh.userData.library.name === library.name
    );
    
    if (selectedMesh) {
      gsap.to(selectedMesh.scale, { 
        duration: 0.3, 
        x: 1.5, 
        y: 1.5, 
        z: 1.5,
        ease: 'back.out(1.7)'
      });
    }
    
    // Highlight dependencies
    library.dependencies.forEach((depName: string) => {
      const depMesh = this.libraryMeshes.find(mesh => 
        mesh.userData.library.name === depName
      );
      
      if (depMesh) {
        gsap.to(depMesh.scale, { 
          duration: 0.3, 
          x: 1.3, 
          y: 1.3, 
          z: 1.3,
          ease: 'back.out(1.7)'
        });
      }
    });
  }
  
  private resetLibraryHighlights(): void {
    this.libraryMeshes.forEach(mesh => {
      gsap.to(mesh.scale, { 
        duration: 0.3, 
        x: 1, 
        y: 1, 
        z: 1,
        ease: 'power2.out'
      });
    });
  }
  
  switchView(view: 'grid' | 'dependency' | 'layers'): void {
    this.currentView = view;
    
    switch (view) {
      case 'grid':
        this.animateToGridView();
        break;
      case 'dependency':
        this.animateToDependencyView();
        break;
      case 'layers':
        this.animateToLayersView();
        break;
    }
  }
  
  private animateToGridView(): void {
    this.libraries.forEach((library, index) => {
      const mesh = this.libraryMeshes[index];
      if (mesh) {
        gsap.to(mesh.position, {
          duration: 1,
          x: library.position.x,
          y: library.position.y,
          z: library.position.z,
          ease: 'power2.inOut'
        });
      }
    });
  }
  
  private animateToDependencyView(): void {
    // Rearrange based on dependency graph
    const layers = this.groupByDependencyLayers();
    
    layers.forEach((layer, layerIndex) => {
      layer.forEach((library, itemIndex) => {
        const mesh = this.libraryMeshes.find(m => 
          m.userData.library.name === library.name
        );
        
        if (mesh) {
          const angle = (itemIndex / layer.length) * Math.PI * 2;
          const radius = 3 + layerIndex * 2;
          
          gsap.to(mesh.position, {
            duration: 1,
            x: Math.cos(angle) * radius,
            y: layerIndex * 2 - 2,
            z: Math.sin(angle) * radius,
            ease: 'power2.inOut'
          });
        }
      });
    });
  }
  
  private animateToLayersView(): void {
    const typeGroups = this.groupByType();
    const types = Object.keys(typeGroups);
    
    types.forEach((type, typeIndex) => {
      typeGroups[type].forEach((library, itemIndex) => {
        const mesh = this.libraryMeshes.find(m => 
          m.userData.library.name === library.name
        );
        
        if (mesh) {
          gsap.to(mesh.position, {
            duration: 1,
            x: (itemIndex - typeGroups[type].length / 2) * 2,
            y: typeIndex * 3 - 3,
            z: 0,
            ease: 'power2.inOut'
          });
        }
      });
    });
  }
  
  private groupByDependencyLayers(): any[][] {
    const layers: any[][] = [];
    const processed = new Set<string>();
    
    // Start with libraries that have no dependencies
    let currentLayer = this.libraries.filter(lib => lib.dependencies.length === 0);
    
    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);
      currentLayer.forEach(lib => processed.add(lib.name));
      
      // Find next layer
      currentLayer = this.libraries.filter(lib => 
        !processed.has(lib.name) && 
        lib.dependencies.every(dep => processed.has(dep))
      );
    }
    
    return layers;
  }
  
  private groupByType(): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    this.libraries.forEach(library => {
      if (!groups[library.type]) {
        groups[library.type] = [];
      }
      groups[library.type].push(library);
    });
    
    return groups;
  }
  
  private startAnimation(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      // Rotate particle system
      if (this.scene) {
        const particleSystem = this.scene.children.find(child => 
          child instanceof THREE.Points
        ) as THREE.Points;
        
        if (particleSystem) {
          particleSystem.rotation.y += 0.002;
        }
      }
      
      // Gentle floating animation for library meshes
      this.libraryMeshes.forEach((mesh, index) => {
        mesh.rotation.y += 0.01;
        mesh.position.y += Math.sin(Date.now() * 0.001 + index) * 0.005;
      });
    };
    
    animate();
  }
  
  private render(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.threeService.removeScene(this.sceneId);
  }
}