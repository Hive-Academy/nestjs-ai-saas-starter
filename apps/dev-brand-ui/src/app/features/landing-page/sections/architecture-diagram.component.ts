import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';

@Component({
  selector: 'app-architecture-diagram',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="architecture-diagram-section">
      <div class="section-header">
        <h2 class="section-title">Architecture Deep Dive</h2>
        <p class="section-description">Explore our {{ totalLayers }} layered dependency architecture with interactive 3D navigation</p>
      </div>
      
      <div class="architecture-container">
        <div #architectureCanvas class="architecture-canvas"></div>
        
        <div class="architecture-overlay">
          <div class="layer-info" *ngIf="selectedLayer" [class.enhanced]="selectedLayer">
            <div class="info-header">
              <h3>{{ selectedLayer.name }}</h3>
              <div class="layer-badge" [style.background-color]="selectedLayer.color + '40'" 
                   [style.border-color]="selectedLayer.color">
                Layer {{ selectedLayer.level }}
              </div>
            </div>
            <p class="layer-description">{{ selectedLayer.description }}</p>
            
            <div class="layer-metrics">
              <div class="metric">
                <span class="metric-label">Components</span>
                <span class="metric-value">{{ selectedLayer.components.length }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Dependencies</span>
                <span class="metric-value">{{ getDependencyCount(selectedLayer) }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Complexity</span>
                <span class="metric-value">{{ getComplexityRating(selectedLayer) }}</span>
              </div>
            </div>
            
            <div class="component-grid">
              <h4>
                <span class="grid-icon">🧩</span>
                Layer Components
              </h4>
              <div class="components-container">
                <div *ngFor="let component of selectedLayer.components" 
                     class="component-item"
                     [style.border-color]="component.color"
                     (click)="focusOnComponent(component)"
                     (mouseenter)="highlightComponent(component)"
                     (mouseleave)="resetComponentHighlight()">
                  <div class="component-icon" [style.background-color]="component.color + '20'">
                    {{ component.icon || '📦' }}
                  </div>
                  <div class="component-details">
                    <div class="component-name">{{ component.name }}</div>
                    <div class="component-type">{{ component.type || 'Component' }}</div>
                    <div class="component-description">{{ component.description || 'Core component' }}</div>
                  </div>
                  <div class="component-status" [class]="getComponentStatus(component)">
                    {{ getComponentStatusText(component) }}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="layer-relationships" *ngIf="selectedLayer.dependencies?.length > 0">
              <h4>
                <span class="relationship-icon">🔗</span>
                Layer Dependencies
              </h4>
              <div class="dependencies-flow">
                <div *ngFor="let dep of selectedLayer.dependencies" 
                     class="dependency-connection"
                     (click)="navigateToLayer(dep)">
                  <span class="dep-arrow">↓</span>
                  <span class="dep-name">{{ getLayerName(dep) }}</span>
                  <span class="dep-level">Level {{ dep }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="architecture-controls">
            <div class="view-controls">
              <button 
                class="control-btn" 
                [class.active]="currentView === 'layers'"
                (click)="switchView('layers')"
                title="Stacked layer visualization">
                <span class="btn-icon">📚</span>
                Layer View
              </button>
              <button 
                class="control-btn" 
                [class.active]="currentView === 'flow'"
                (click)="switchView('flow')"
                title="Data flow between layers">
                <span class="btn-icon">🌊</span>
                Data Flow
              </button>
              <button 
                class="control-btn" 
                [class.active]="currentView === 'exploded'"
                (click)="switchView('exploded')"
                title="Separated layer components">
                <span class="btn-icon">💥</span>
                Exploded View
              </button>
            </div>
            
            <div class="interaction-controls">
              <button class="control-btn" (click)="resetView()" title="Reset camera position">
                <span class="btn-icon">🏠</span>
                Reset View
              </button>
              <button class="control-btn" (click)="toggleAnimation()" title="Toggle layer animation">
                <span class="btn-icon">{{ isAnimating ? '⏸️' : '▶️' }}</span>
                {{ isAnimating ? 'Pause' : 'Animate' }}
              </button>
              <button class="control-btn" (click)="exportDiagram()" title="Export architecture diagram">
                <span class="btn-icon">📸</span>
                Export
              </button>
            </div>
          </div>
          
          <div class="navigation-help">
            <p>🖱️ Click and drag to rotate • 🔍 Scroll to zoom • 📱 Touch to explore</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .architecture-diagram-section {
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
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
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1rem;
      text-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    }

    .section-description {
      font-size: 1.3rem;
      color: rgba(255, 255, 255, 0.8);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .architecture-container {
      flex: 1;
      position: relative;
      display: flex;
    }

    .architecture-canvas {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .architecture-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 5;
    }

    .layer-info {
      position: absolute;
      top: 2rem;
      left: 2rem;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 350px;
      color: white;
      pointer-events: auto;
      transition: all 0.3s ease;
    }

    .layer-info h3 {
      color: #ffd700;
      margin-bottom: 0.5rem;
      font-size: 1.4rem;
    }

    .layer-description {
      margin-bottom: 1rem;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.9);
    }

    .layer-stats {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .stat {
      background: rgba(255, 215, 0, 0.2);
      color: #ffd700;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.9rem;
    }

    .component-list {
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 1rem;
    }

    .component-list h4 {
      margin-bottom: 0.5rem;
      color: #ffed4e;
      font-size: 1rem;
    }

    .component-list ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .component-list li {
      padding: 0.2rem 0;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .architecture-controls {
      position: absolute;
      bottom: 4rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 1rem;
      pointer-events: auto;
    }

    .control-btn {
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 215, 0, 0.3);
      color: rgba(255, 255, 255, 0.8);
      padding: 0.8rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      backdrop-filter: blur(5px);
    }

    .control-btn:hover {
      background: rgba(255, 215, 0, 0.1);
      border-color: #ffd700;
      color: #ffd700;
      transform: translateY(-2px);
    }

    .control-btn.active {
      background: rgba(255, 215, 0, 0.2);
      border-color: #ffd700;
      color: #ffd700;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    }

    .navigation-help {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: auto;
    }

    .navigation-help p {
      background: rgba(0, 0, 0, 0.6);
      color: rgba(255, 255, 255, 0.7);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.8rem;
      margin: 0;
      text-align: center;
      backdrop-filter: blur(5px);
    }

    @media (max-width: 768px) {
      .section-title {
        font-size: 2.5rem;
      }
      
      .layer-info {
        top: 1rem;
        left: 1rem;
        right: 1rem;
        max-width: none;
      }
      
      .architecture-controls {
        bottom: 3rem;
        flex-direction: column;
        align-items: center;
      }
      
      .control-btn {
        width: 120px;
        text-align: center;
      }
      
      .navigation-help {
        bottom: 0.5rem;
      }
      
      .navigation-help p {
        font-size: 0.7rem;
        padding: 0.3rem 0.8rem;
      }
    }
  `]
})
export class ArchitectureDiagramComponent implements AfterViewInit, OnDestroy {
  @ViewChild('architectureCanvas', { static: true }) canvasRef!: ElementRef<HTMLElement>;
  
  private readonly threeService = inject(ThreeIntegrationService);
  // private readonly ngZone = inject(NgZone); // Removed as not used
  
  private sceneId = 'architecture-diagram';
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  private layerMeshes: THREE.Group[] = [];
  private connectionLines: THREE.Line[] = [];
  private animationFrameId: number | null = null;
  
  // Component state
  currentView: 'layers' | 'flow' | 'exploded' = 'layers';
  selectedLayer: any = null;
  totalLayers = 0;
  isAnimating = true;
  // private highlightedComponent: any = null;
  
  // Architecture layers data
  private architectureLayers = [
    {
      name: 'Applications',
      level: 5,
      description: 'API and UI applications providing user-facing interfaces',
      color: '#ff6b6b',
      y: 10,
      components: [
        { name: 'dev-brand-api', color: '#ff6b6b' },
        { name: 'dev-brand-ui', color: '#ff8e8e' }
      ]
    },
    {
      name: 'Orchestration',
      level: 4,
      description: 'High-level workflow and agent coordination systems',
      color: '#4ecdc4',
      y: 7,
      components: [
        { name: 'workflow-engine', color: '#4ecdc4' },
        { name: 'multi-agent', color: '#6ee0d7' }
      ]
    },
    {
      name: 'Cross-Cutting',
      level: 3,
      description: 'Shared concerns spanning multiple domains and layers',
      color: '#45b7d1',
      y: 4,
      components: [
        { name: 'streaming', color: '#45b7d1' },
        { name: 'checkpoint', color: '#5bc2d9' },
        { name: 'hitl', color: '#71cde1' },
        { name: 'monitoring', color: '#87d8e9' },
        { name: 'time-travel', color: '#9de3f1' }
      ]
    },
    {
      name: 'Domains',
      level: 2,
      description: 'Specialized domain logic and business capabilities',
      color: '#96ceb4',
      y: 1,
      components: [
        { name: 'memory', color: '#96ceb4' },
        { name: 'platform', color: '#a6d4c2' }
      ]
    },
    {
      name: 'Persistence Adapters',
      level: 1,
      description: 'Database integrations and external service adapters',
      color: '#ffd93d',
      y: -2,
      components: [
        { name: 'nestjs-chromadb', color: '#ffd93d' },
        { name: 'nestjs-neo4j', color: '#ffe066' }
      ]
    },
    {
      name: 'Foundation',
      level: 0,
      description: 'Core utilities and fundamental building blocks',
      color: '#6c5ce7',
      y: -5,
      components: [
        { name: 'core', color: '#6c5ce7' },
        { name: 'functional-api', color: '#8b7ced' }
      ]
    }
  ];
  
  ngAfterViewInit(): void {
    this.totalLayers = this.architectureLayers.length;
    this.initializeArchitecture();
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  private initializeArchitecture(): void {
    const sceneInstance = this.threeService.createScene(
      this.sceneId,
      this.canvasRef.nativeElement,
      {
        // enableOrbitControls: true, // Property may not exist in config
        backgroundColor: 0x1a1a2e,
        antialias: true,
        // alpha: true // Property may not exist in config
      }
    );
    
    if (!sceneInstance) {
      console.error('Failed to create architecture scene');
      return;
    }
    
    this.scene = sceneInstance.scene;
    this.camera = sceneInstance.camera;
    this.renderer = sceneInstance.renderer;
    
    this.setupScene();
    this.createArchitectureLayers();
    this.setupInteractions();
    this.startAnimation();
    
    this.threeService.activateScene(this.sceneId, () => this.render());
  }
  
  private setupScene(): void {
    if (!this.scene || !this.camera) return;
    
    // Camera positioning for better layer view
    this.camera.position.set(15, 8, 15);
    this.camera.lookAt(0, 2, 0);
    
    // Ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light from top
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Colored accent lights
    const accentLight1 = new THREE.PointLight(0xffd700, 0.4, 30);
    accentLight1.position.set(-10, 10, -10);
    this.scene.add(accentLight1);
    
    const accentLight2 = new THREE.PointLight(0x4ecdc4, 0.4, 30);
    accentLight2.position.set(10, 10, 10);
    this.scene.add(accentLight2);
    
    // Grid helper for reference
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -6;
    this.scene.add(gridHelper);
    
    // Background particles
    this.createBackgroundElements();
  }
  
  private createBackgroundElements(): void {
    if (!this.scene) return;
    
    // Floating geometric shapes
    for (let i = 0; i < 20; i++) {
      const geometry = Math.random() > 0.5 
        ? new THREE.TetrahedronGeometry(0.2)
        : new THREE.OctahedronGeometry(0.15);
      
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 30
      );
      
      mesh.userData = { floatSpeed: Math.random() * 0.02 + 0.01 };
      this.scene.add(mesh);
    }
  }
  
  private createArchitectureLayers(): void {
    if (!this.scene) return;
    
    this.architectureLayers.forEach((layer, layerIndex) => {
      const layerGroup = this.createLayerGroup(layer, layerIndex);
      this.layerMeshes.push(layerGroup);
      this.scene!.add(layerGroup);
    });
    
    this.createDataFlowConnections();
  }
  
  private createLayerGroup(layer: any, layerIndex: number): THREE.Group {
    const group = new THREE.Group();
    group.userData = { layer, layerIndex };
    
    // Create layer platform
    const platformGeometry = new THREE.CylinderGeometry(6, 6, 0.5, 32);
    const platformMaterial = new THREE.MeshPhongMaterial({
      color: layer.color,
      transparent: true,
      opacity: 0.2,
      shininess: 100
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = layer.y;
    group.add(platform);
    
    // Create component boxes on the platform
    layer.components.forEach((component: any, index: number) => {
      const componentMesh = this.createComponentMesh(component, layer, index);
      componentMesh.position.y = layer.y + 1;
      
      // Arrange components in a circle on the platform
      const angle = (index / layer.components.length) * Math.PI * 2;
      const radius = 3;
      componentMesh.position.x = Math.cos(angle) * radius;
      componentMesh.position.z = Math.sin(angle) * radius;
      
      group.add(componentMesh);
    });
    
    // Add layer label
    this.addLayerLabel(group, layer);
    
    return group;
  }
  
  private createComponentMesh(component: any, layer: any, index: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1.2, 0.8, 1.2);
    const material = new THREE.MeshPhongMaterial({
      color: component.color,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { component, layer, index };
    
    // Add wireframe outline
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ 
      color: component.color,
      transparent: true,
      opacity: 0.6
    }));
    mesh.add(line);
    
    return mesh;
  }
  
  private addLayerLabel(group: THREE.Group, layer: any): void {
    // Create a simple text representation using geometry
    const labelGeometry = new THREE.RingGeometry(4, 4.2, 0, Math.PI * 2);
    const labelMaterial = new THREE.MeshBasicMaterial({
      color: layer.color,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.y = layer.y;
    labelMesh.rotation.x = -Math.PI / 2;
    group.add(labelMesh);
  }
  
  private createDataFlowConnections(): void {
    if (!this.scene) return;
    
    // Create connections between adjacent layers
    for (let i = 0; i < this.architectureLayers.length - 1; i++) {
      const upperLayer = this.architectureLayers[i];
      const lowerLayer = this.architectureLayers[i + 1];
      
      const line = this.createFlowLine(
        new THREE.Vector3(0, upperLayer.y, 0),
        new THREE.Vector3(0, lowerLayer.y + 1.5, 0)
      );
      
      this.connectionLines.push(line);
      this.scene.add(line);
    }
  }
  
  private createFlowLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.4,
      linewidth: 3
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
    
    // Get all meshes from all layer groups
    const allMeshes: THREE.Mesh[] = [];
    this.layerMeshes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.userData['component']) {
          allMeshes.push(child);
        }
      });
    });
    
    const intersects = this.raycaster.intersectObjects(allMeshes);
    
    // Reset all materials
    allMeshes.forEach(mesh => {
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
    
    // Check for layer platform clicks
    const platformMeshes: THREE.Mesh[] = [];
    this.layerMeshes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
          platformMeshes.push(child);
        }
      });
    });
    
    const platformIntersects = this.raycaster.intersectObjects(platformMeshes);
    
    if (platformIntersects.length > 0) {
      const platformMesh = platformIntersects[0].object as THREE.Mesh;
      const group = platformMesh.parent as THREE.Group;
      this.selectedLayer = group.userData['layer'];
      this.highlightLayer(group);
    } else {
      // Check for component clicks
      const allMeshes: THREE.Mesh[] = [];
      this.layerMeshes.forEach(group => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.userData['component']) {
            allMeshes.push(child);
          }
        });
      });
      
      const componentIntersects = this.raycaster.intersectObjects(allMeshes);
      
      if (componentIntersects.length > 0) {
        const componentMesh = componentIntersects[0].object as THREE.Mesh;
        this.selectedLayer = componentMesh.userData['layer'];
        const group = componentMesh.parent as THREE.Group;
        this.highlightLayer(group);
      } else {
        this.selectedLayer = null;
        this.resetLayerHighlights();
      }
    }
  }
  
  private highlightLayer(selectedGroup: THREE.Group): void {
    this.resetLayerHighlights();
    
    // Highlight the selected layer
    selectedGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        gsap.to(child.scale, {
          duration: 0.3,
          x: 1.2,
          y: 1.2,
          z: 1.2,
          ease: 'back.out(1.7)'
        });
      }
    });
  }
  
  private resetLayerHighlights(): void {
    this.layerMeshes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          gsap.to(child.scale, {
            duration: 0.3,
            x: 1,
            y: 1,
            z: 1,
            ease: 'power2.out'
          });
        }
      });
    });
  }
  
  switchView(view: 'layers' | 'flow' | 'exploded'): void {
    this.currentView = view;
    
    switch (view) {
      case 'layers':
        this.animateToLayersView();
        break;
      case 'flow':
        this.animateToFlowView();
        break;
      case 'exploded':
        this.animateToExplodedView();
        break;
    }
  }
  
  private animateToLayersView(): void {
    this.layerMeshes.forEach((group, index) => {
      // const targetY = this.architectureLayers[index].y; // Unused variable
      
      gsap.to(group.position, {
        duration: 1.5,
        y: 0,
        ease: 'power2.inOut'
      });
      
      gsap.to(group.rotation, {
        duration: 1.5,
        x: 0,
        y: 0,
        z: 0,
        ease: 'power2.inOut'
      });
    });
  }
  
  private animateToFlowView(): void {
    this.layerMeshes.forEach((group, index) => {
      gsap.to(group.position, {
        duration: 1.5,
        y: 0,
        ease: 'power2.inOut'
      });
      
      gsap.to(group.rotation, {
        duration: 1.5,
        x: Math.PI / 6,
        y: index * Math.PI / 4,
        z: 0,
        ease: 'power2.inOut'
      });
    });
  }
  
  private animateToExplodedView(): void {
    this.layerMeshes.forEach((group, index) => {
      const offset = (index - this.layerMeshes.length / 2) * 8;
      
      gsap.to(group.position, {
        duration: 1.5,
        y: offset,
        ease: 'power2.inOut'
      });
      
      gsap.to(group.rotation, {
        duration: 1.5,
        x: 0,
        y: index * Math.PI / 3,
        z: 0,
        ease: 'power2.inOut'
      });
    });
  }
  
  private startAnimation(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      // Gentle rotation for background elements
      if (this.scene) {
        this.scene.children.forEach(child => {
          if (child.userData['floatSpeed']) {
            child.rotation.x += child.userData['floatSpeed'];
            child.rotation.y += child.userData['floatSpeed'] * 0.7;
            child.position.y += Math.sin(Date.now() * 0.001) * 0.01;
          }
        });
      }
      
      // Subtle layer breathing animation
      this.layerMeshes.forEach((group, index) => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.userData['component']) {
            child.rotation.y += 0.005;
            const breathe = Math.sin(Date.now() * 0.002 + index) * 0.02;
            child.position.y += breathe;
          }
        });
      });
    };
    
    animate();
  }
  
  private render(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  // Enhanced methods for richer information display
  getDependencyCount(layer: any): number {
    return this.architectureLayers.filter(l => l.level < layer.level).length;
  }
  
  getComplexityRating(layer: any): string {
    const componentCount = layer.components.length;
    if (componentCount >= 4) return 'High';
    if (componentCount >= 2) return 'Medium';
    return 'Low';
  }
  
  getComponentStatus(component: any): string {
    // Simulate different component statuses
    const statuses = ['active', 'warning', 'error', 'idle'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
  
  getComponentStatusText(component: any): string {
    const status = this.getComponentStatus(component);
    switch (status) {
      case 'active': return 'Running';
      case 'warning': return 'Warning';
      case 'error': return 'Error';
      case 'idle': return 'Idle';
      default: return 'Unknown';
    }
  }
  
  getLayerName(level: number): string {
    const layer = this.architectureLayers.find(l => l.level === level);
    return layer ? layer.name : `Layer ${level}`;
  }
  
  focusOnComponent(component: any): void {
    // this.highlightedComponent = component;
    
    // Find the component mesh and focus camera on it
    this.layerMeshes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh && 
            child.userData['component'] && 
            child.userData['component'].name === component.name) {
          
          // Animate camera to focus on component
          if (this.camera) {
            const worldPosition = new THREE.Vector3();
            child.getWorldPosition(worldPosition);
            
            gsap.to(this.camera.position, {
              duration: 1.5,
              x: worldPosition.x + 5,
              y: worldPosition.y + 3,
              z: worldPosition.z + 5,
              ease: 'power2.inOut',
              onUpdate: () => {
                this.camera!.lookAt(worldPosition);
              }
            });
          }
          
          // Highlight the component
          gsap.to(child.scale, {
            duration: 0.5,
            x: 1.8,
            y: 1.8,
            z: 1.8,
            ease: 'back.out(1.7)'
          });
        }
      });
    });
  }
  
  highlightComponent(component: any): void {
    // this.highlightedComponent = component;
    
    // Add visual highlighting effects
    this.layerMeshes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh && 
            child.userData['component'] && 
            child.userData['component'].name === component.name) {
          
          const material = child.material as THREE.MeshPhongMaterial;
          gsap.to(material, {
            duration: 0.3,
            opacity: 1.0,
            ease: 'power2.out'
          });
        }
      });
    });
  }
  
  resetComponentHighlight(): void {
    // this.highlightedComponent = null;
    
    // Reset all component materials
    this.layerMeshes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.userData['component']) {
          const material = child.material as THREE.MeshPhongMaterial;
          gsap.to(material, {
            duration: 0.3,
            opacity: 0.8,
            ease: 'power2.out'
          });
          
          gsap.to(child.scale, {
            duration: 0.3,
            x: 1,
            y: 1,
            z: 1,
            ease: 'power2.out'
          });
        }
      });
    });
  }
  
  navigateToLayer(level: number): void {
    const targetLayer = this.architectureLayers.find(l => l.level === level);
    if (targetLayer) {
      this.selectedLayer = targetLayer;
      
      // Find the layer group and highlight it
      const targetGroup = this.layerMeshes.find(group => 
        group.userData['layer'].level === level
      );
      
      if (targetGroup) {
        this.highlightLayer(targetGroup);
        
        // Animate camera to the layer
        if (this.camera) {
          gsap.to(this.camera.position, {
            duration: 1.2,
            x: 10,
            y: targetLayer.y + 5,
            z: 10,
            ease: 'power2.inOut',
            onUpdate: () => {
              this.camera!.lookAt(0, targetLayer.y, 0);
            }
          });
        }
      }
    }
  }
  
  resetView(): void {
    if (this.camera) {
      gsap.to(this.camera.position, {
        duration: 1.5,
        x: 15,
        y: 8,
        z: 15,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.camera!.lookAt(0, 2, 0);
        }
      });
    }
    
    this.resetLayerHighlights();
    this.resetComponentHighlight();
  }
  
  toggleAnimation(): void {
    this.isAnimating = !this.isAnimating;
    
    if (!this.isAnimating && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    } else if (this.isAnimating && !this.animationFrameId) {
      this.startAnimation();
    }
  }
  
  exportDiagram(): void {
    if (this.renderer && this.scene && this.camera) {
      // Render at higher resolution for export
      const originalSize = this.renderer.getSize(new THREE.Vector2());
      this.renderer.setSize(1920, 1080);
      this.renderer.render(this.scene, this.camera);
      
      // Get canvas data
      const canvas = this.renderer.domElement;
      const dataURL = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `architecture-diagram-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
      
      // Restore original size
      this.renderer.setSize(originalSize.x, originalSize.y);
    }
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.threeService.removeScene(this.sceneId);
  }
}