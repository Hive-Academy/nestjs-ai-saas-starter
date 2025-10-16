import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

interface ArchitectureComponent {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  status: 'stable' | 'active' | 'prototype' | 'planning';
  statusText: string;
  description: string;
}

interface ArchitectureLayer {
  level: number;
  name: string;
  description: string;
  color: string;
  complexity: 'Low' | 'Medium' | 'High' | 'Very High';
  dependencies: number[];
  components: ArchitectureComponent[];
}

@Component({
  selector: 'brand-architecture-diagram',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './architecture-diagram.component.html',
  styles: [
    `
      .btn-small {
        @apply px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs transition-all duration-300 hover:bg-white/20;
      }
      .btn-small.active {
        @apply bg-cyan-500/30 border-cyan-500/50 text-cyan-300;
      }
    `,
  ],
})
export class ArchitectureDiagramComponent implements AfterViewInit, OnDestroy {
  @ViewChild('architectureCanvas', { static: true })
  canvasRef!: ElementRef<HTMLElement>;

  // Signals for reactivity
  selectedLayer = signal<ArchitectureLayer | null>(null);
  selectedComponent = signal<ArchitectureComponent | null>(null);

  totalLayers = 5; // Based on hackathon architecture documentation

  // Three.js core objects for subtle background
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private animationId: number | null = null;

  // Architecture layers from hackathon documentation
  public readonly architectureLayers: ArchitectureLayer[] = [
    {
      level: 0,
      name: 'Persistence Layer',
      description:
        'External database adapters providing vector and graph storage capabilities. These are published NPM packages with Beta stability.',
      color: '#10b981', // green
      complexity: 'Low',
      dependencies: [],
      components: [
        {
          id: 'nestjs-chromadb',
          name: 'ChromaDB Vector Store',
          type: 'External Adapter',
          icon: '🔍',
          color: '#10b981',
          status: 'stable',
          statusText: 'Beta',
          description: 'Vector embeddings with multi-provider support',
        },
        {
          id: 'nestjs-neo4j',
          name: 'Neo4j Graph Database',
          type: 'External Adapter',
          icon: '🌐',
          color: '#10b981',
          status: 'stable',
          statusText: 'Beta',
          description: 'Graph relationships with health monitoring',
        },
      ],
    },
    {
      level: 1,
      name: 'Core Foundation',
      description:
        'Minimal contract layer providing shared types, tokens, and dependency injection contracts for the entire platform.',
      color: '#8b5cf6', // purple
      complexity: 'Medium',
      dependencies: [0],
      components: [
        {
          id: 'core',
          name: 'LangGraph Core',
          type: 'Core Runtime',
          icon: '⚡',
          color: '#8b5cf6',
          status: 'active',
          statusText: 'Alpha',
          description: 'Opinionated minimal contract layer',
        },
      ],
    },
    {
      level: 2,
      name: 'Execution Engine',
      description:
        'Dual paradigm orchestration combining declarative and functional approaches with workflow engine and API helpers.',
      color: '#3b82f6', // blue
      complexity: 'High',
      dependencies: [1],
      components: [
        {
          id: 'workflow-engine',
          name: 'Workflow Engine',
          type: 'Core Runtime',
          icon: '🔧',
          color: '#3b82f6',
          status: 'active',
          statusText: 'Alpha',
          description: 'Graph orchestration with decorator execution',
        },
        {
          id: 'functional-api',
          name: 'Functional API',
          type: 'Developer Experience',
          icon: '🎯',
          color: '#3b82f6',
          status: 'active',
          statusText: 'Alpha',
          description: 'FP style with 40% code reduction',
        },
      ],
    },
    {
      level: 3,
      name: 'Cross-Cutting Services',
      description:
        'Advanced capabilities including streaming, state management, memory fusion, multi-agent coordination, and human-in-the-loop systems.',
      color: '#f59e0b', // amber
      complexity: 'Very High',
      dependencies: [2, 0],
      components: [
        {
          id: 'streaming',
          name: 'Real-time Streaming',
          type: 'Cross-Cutting',
          icon: '📡',
          color: '#f59e0b',
          status: 'active',
          statusText: 'Alpha',
          description: 'WebSocket streaming with decorators',
        },
        {
          id: 'checkpoint',
          name: 'State Checkpointing',
          type: 'Cross-Cutting',
          icon: '💾',
          color: '#f59e0b',
          status: 'active',
          statusText: 'Alpha',
          description: 'Durable state with zero-downtime resume',
        },
        {
          id: 'memory',
          name: 'Memory Fusion',
          type: 'Cross-Cutting',
          icon: '🧠',
          color: '#f59e0b',
          status: 'prototype',
          statusText: 'Prototype',
          description: 'Vector → graph expansion cascade',
        },
        {
          id: 'multi-agent',
          name: 'Multi-Agent Systems',
          type: 'Cross-Cutting',
          icon: '👥',
          color: '#f59e0b',
          status: 'prototype',
          statusText: 'Prototype',
          description: 'Lightweight role graph primitives',
        },
        {
          id: 'hitl',
          name: 'Human-in-the-Loop',
          type: 'Cross-Cutting',
          icon: '👤',
          color: '#f59e0b',
          status: 'active',
          statusText: 'Alpha',
          description: 'Zero-churn removable approval gates',
        },
        {
          id: 'monitoring',
          name: 'Health Monitoring',
          type: 'Cross-Cutting',
          icon: '📊',
          color: '#f59e0b',
          status: 'planning',
          statusText: 'Planning',
          description: 'Pre-wired health surfaces',
        },
      ],
    },
    {
      level: 4,
      name: 'Advanced Features',
      description:
        'Developer tools and platform integration including time-travel debugging and enterprise deployment capabilities.',
      color: '#ec4899', // pink
      complexity: 'High',
      dependencies: [3],
      components: [
        {
          id: 'time-travel',
          name: 'Time Travel Debug',
          type: 'Developer Tools',
          icon: '⏰',
          color: '#ec4899',
          status: 'prototype',
          statusText: 'Prototype',
          description: 'Deterministic replay with token cadence',
        },
        {
          id: 'platform',
          name: 'Platform Integration',
          type: 'Enterprise',
          icon: '🏢',
          color: '#ec4899',
          status: 'active',
          statusText: 'Alpha',
          description: 'Central DI composition boundary',
        },
      ],
    },
  ];

  ngAfterViewInit(): void {
    this.initializeSubtleBackground();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  selectLayer(layer: ArchitectureLayer | null): void {
    this.selectedLayer.set(layer);
  }

  selectComponent(component: ArchitectureComponent | null): void {
    this.selectedComponent.set(component);
  }

  getTotalComponents(): number {
    return this.architectureLayers.reduce(
      (total, layer) => total + layer.components.length,
      0
    );
  }

  getTotalDependencies(): number {
    return this.architectureLayers.reduce(
      (total, layer) => total + layer.dependencies.length,
      0
    );
  }

  getComponentStatusClasses(status: string): string {
    const classes = {
      stable: 'bg-green-500/20 text-green-300 border-green-500/30',
      active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      prototype: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      planning: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };
    return classes[status as keyof typeof classes] || classes.active;
  }

  getComponentLayer(component: ArchitectureComponent): string {
    const layer = this.architectureLayers.find((l) =>
      l.components.some((c) => c.id === component.id)
    );
    return layer ? `Layer ${layer.level}: ${layer.name}` : 'Unknown';
  }

  navigateToLayer(level: number): void {
    const layer = this.architectureLayers.find((l) => l.level === level);
    if (layer) {
      this.selectedLayer.set(layer);
      // Scroll to layer
      const element = document.querySelector(`[data-layer="${level}"]`);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  trackByLevel(index: number, item: ArchitectureLayer): number {
    return item.level;
  }

  trackByComponentId(index: number, item: ArchitectureComponent): string {
    return item.id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  getDependencyCount(layer: ArchitectureLayer): number {
    return layer.dependencies?.length || 0;
  }

  getComplexityRating(layer: ArchitectureLayer): string {
    return layer.complexity;
  }

  getComponentStatus(component: ArchitectureComponent): string {
    const statusMap = {
      stable: 'bg-green-500/20 text-green-300 border-green-500/30',
      active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      prototype: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      planning: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };
    return statusMap[component.status] || statusMap.active;
  }

  getComponentStatusText(component: ArchitectureComponent): string {
    return component.statusText;
  }

  getLayerName(level: number): string {
    const layer = this.architectureLayers.find((l) => l.level === level);
    return layer ? layer.name : `Layer ${level}`;
  }

  focusOnComponent(component: ArchitectureComponent): void {
    console.log('Focusing on component:', component.name);
  }

  highlightComponent(component: ArchitectureComponent): void {
    console.log('Highlighting component:', component.name);
  }

  resetComponentHighlight(): void {
    // Reset highlight
  }

  private initializeSubtleBackground(): void {
    const container = this.canvasRef.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 30;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Create subtle architectural wireframes
    this.createArchitecturalWireframes();

    // Gentle lighting
    const ambientLight = new THREE.AmbientLight(0x3b82f6, 0.3);
    this.scene.add(ambientLight);

    // Events
    window.addEventListener('resize', this.onResize);

    // Subtle animation loop
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.updateSubtleAnimation();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  private createArchitecturalWireframes(): void {
    if (!this.scene) return;

    // Create subtle wireframe architecture representation
    const layerCount = this.architectureLayers.length;

    for (let i = 0; i < layerCount; i++) {
      const layer = this.architectureLayers[i];

      // Create wireframe boxes representing architectural layers
      const geometry = new THREE.BoxGeometry(8, 0.5, 8);
      const edges = new THREE.EdgesGeometry(geometry);
      const material = new THREE.LineBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.3,
      });

      const wireframe = new THREE.LineSegments(edges, material);
      wireframe.position.y = i * 3 - layerCount * 1.5;
      this.scene.add(wireframe);
    }

    // Add connecting lines between layers
    for (let i = 0; i < layerCount - 1; i++) {
      const points = [
        new THREE.Vector3(0, i * 3 - layerCount * 1.5, 0),
        new THREE.Vector3(0, (i + 1) * 3 - layerCount * 1.5, 0),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.2,
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    }
  }

  private updateSubtleAnimation(): void {
    if (!this.scene) return;

    const time = Date.now() * 0.0003;

    this.scene.children.forEach((child, index) => {
      if (child instanceof THREE.LineSegments) {
        child.rotation.y = time * 0.1;
        child.position.x = Math.sin(time + index) * 0.5;
      }
    });
  }

  private cleanup(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId) cancelAnimationFrame(this.animationId);

    // Dispose Three.js resources
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
    this.renderer?.dispose();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }

  private onResize = (): void => {
    if (!this.renderer || !this.camera) return;

    const container = this.canvasRef.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}
