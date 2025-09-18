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
// Three.js lightweight imports (tree-shakable)
import * as THREE from 'three';

interface EcosystemLibrary {
  id: string;
  name: string;
  description: string;
  type: string;
  dependencies: string[];
  layer: number;
  maturity: 'Planning' | 'Prototype' | 'Alpha' | 'Beta' | 'Stable';
  published: boolean;
  features: string[];
  differentiator: string;
}

interface LibraryCategory {
  name: string;
  description: string;
  libraries: EcosystemLibrary[];
}

@Component({
  selector: 'brand-ecosystem-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './ecosystem-explorer.component.html',
  styles: [
    `
      .btn-base {
        @apply px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm backdrop-blur-lg transition-all duration-300 hover:bg-white/20 hover:border-white/40;
      }
      .btn-base.active {
        @apply bg-purple-500/30 border-purple-500/50 text-purple-300;
      }
      canvas {
        outline: none;
      }
    `,
  ],
})
export class EcosystemExplorerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ecosystemCanvas', { static: true })
  canvasRef!: ElementRef<HTMLElement>;

  // Signals for reactivity
  selectedLibrary = signal<EcosystemLibrary | null>(null);

  libraryCount = 13; // Based on actual hackathon documentation

  // Three.js core objects for subtle background animation
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private animationId: number | null = null;

  // Complete 13-library ecosystem from hackathon documentation with accurate maturity and dependency mapping
  private readonly libraries: EcosystemLibrary[] = [
    // External Adapters (Layer 0) - Published NPM packages
    {
      id: 'nestjs-chromadb',
      name: 'ChromaDB Vector Store',
      description: 'Unified embeddings provider config with multi-provider support. Handles vector storage, similarity search, and smart document chunking strategies.',
      type: 'External Adapter',
      dependencies: [],
      layer: 0,
      maturity: 'Beta',
      published: true,
      features: ['Vector Storage', 'Multi-Provider Embeddings', 'Smart Chunking', 'Similarity Search'],
      differentiator: 'Unified embeddings provider config',
    },
    {
      id: 'nestjs-neo4j',
      name: 'Neo4j Graph Database',
      description: 'Simplified driver integration with health monitoring. Provides graph traversal, relationship modeling, and connection pooling.',
      type: 'External Adapter',
      dependencies: [],
      layer: 0,
      maturity: 'Beta',
      published: true,
      features: ['Graph Traversal', 'Health Integration', 'Connection Pooling', 'Cypher Queries'],
      differentiator: 'Simplified driver + health integration',
    },

    // Core Runtime Foundation (Layer 1)
    {
      id: 'core',
      name: 'LangGraph Core',
      description: 'Shared tokens, types, and DI contracts forming the minimal contract layer. Provides opinionated foundation for the entire platform.',
      type: 'Core Runtime',
      dependencies: [],
      layer: 1,
      maturity: 'Alpha',
      published: false,
      features: ['Core Types', 'DI Contracts', 'Shared Tokens', 'Type Safety'],
      differentiator: 'Opinionated minimal contract layer',
    },

    // Core Execution Engine (Layer 2)
    {
      id: 'workflow-engine',
      name: 'Workflow Engine',
      description: 'Orchestrated graph & decorator execution with dual declarative + functional orchestration capabilities.',
      type: 'Core Runtime',
      dependencies: ['core'],
      layer: 2,
      maturity: 'Alpha',
      published: false,
      features: ['Graph Orchestration', 'Decorator Execution', 'Dual Paradigm', 'Seamless Composition'],
      differentiator: 'Dual declarative + functional orchestration',
    },
    {
      id: 'functional-api',
      name: 'Functional API',
      description: 'Functional helpers wrapping engine with seamless opt-in for FP style. Reduces boilerplate by 40% through declarative composition.',
      type: 'Core Runtime',
      dependencies: ['core', 'workflow-engine'],
      layer: 2,
      maturity: 'Alpha',
      published: false,
      features: ['FP Style', 'Wrapper Functions', 'Declarative Composition', '40% Code Reduction'],
      differentiator: 'Seamless opt-in for FP style',
    },

    // Cross-Cutting Services (Layer 3)
    {
      id: 'streaming',
      name: 'Real-time Streaming',
      description: 'Token/event streaming over WebSockets with decorator-driven adapter injection. Enables real-time AI workflow visualization.',
      type: 'Cross-Cutting',
      dependencies: ['workflow-engine'],
      layer: 3,
      maturity: 'Alpha',
      published: false,
      features: ['WebSocket Streaming', 'Token Events', 'Decorator Adapters', 'Real-time Updates'],
      differentiator: 'Decorator-driven adapter injection',
    },
    {
      id: 'checkpoint',
      name: 'State Checkpointing',
      description: 'Durable state snapshots with deterministic resume capability. Enables zero-downtime workflow continuation and recovery.',
      type: 'Cross-Cutting',
      dependencies: ['workflow-engine'],
      layer: 3,
      maturity: 'Alpha',
      published: false,
      features: ['State Snapshots', 'Durable Resume', 'Recovery', 'Zero Downtime'],
      differentiator: 'Deterministic checkpoint schema',
    },
    {
      id: 'memory',
      name: 'Memory Fusion',
      description: 'Memory fusion orchestration with cascade: vector → graph expansion. Combines semantic and relationship intelligence.',
      type: 'Cross-Cutting',
      dependencies: ['nestjs-chromadb', 'nestjs-neo4j', 'workflow-engine'],
      layer: 3,
      maturity: 'Prototype',
      published: false,
      features: ['Memory Fusion', 'Vector-Graph Cascade', 'Context Enrichment', 'Semantic Intelligence'],
      differentiator: 'Cascade: vector → graph expansion',
    },
    {
      id: 'hitl',
      name: 'Human-in-the-Loop',
      description: 'Human approval gating with zero-churn removable design. No-op fallback ensures workflows continue without human dependency.',
      type: 'Cross-Cutting',
      dependencies: ['workflow-engine'],
      layer: 3,
      maturity: 'Alpha',
      published: false,
      features: ['Approval Gates', 'Zero-churn Design', 'No-op Fallback', 'Human Escalation'],
      differentiator: 'Zero-churn removable (no-op fallback)',
    },
    {
      id: 'multi-agent',
      name: 'Multi-Agent Coordination',
      description: 'Role/agent coordination helpers with lightweight role graph primitives for distributed AI systems.',
      type: 'Cross-Cutting',
      dependencies: ['workflow-engine', 'memory'],
      layer: 3,
      maturity: 'Prototype',
      published: false,
      features: ['Agent Coordination', 'Role Graphs', 'Distributed Systems', 'Message Routing'],
      differentiator: 'Lightweight role graph primitives',
    },
    {
      id: 'monitoring',
      name: 'Health Monitoring',
      description: 'Health/telemetry scaffolding with pre-wired health surfaces for production observability and performance tracking.',
      type: 'Cross-Cutting',
      dependencies: ['workflow-engine'],
      layer: 3,
      maturity: 'Planning',
      published: false,
      features: ['Health Checks', 'Telemetry', 'Performance Tracking', 'Observability'],
      differentiator: 'Pre-wired health surfaces',
    },

    // Advanced Features (Layer 4)
    {
      id: 'time-travel',
      name: 'Time Travel Debugging',
      description: 'Replay timeline emission that re-emits original token cadence. Enables deterministic debugging and workflow analysis.',
      type: 'Cross-Cutting',
      dependencies: ['streaming', 'checkpoint'],
      layer: 4,
      maturity: 'Prototype',
      published: false,
      features: ['Timeline Replay', 'Token Cadence', 'Deterministic Debug', 'Workflow Analysis'],
      differentiator: 'Re-emits original token cadence',
    },
    {
      id: 'platform',
      name: 'Platform Integration',
      description: 'Aggregated platform wiring exports serving as central DI composition boundary for enterprise deployment.',
      type: 'Cross-Cutting',
      dependencies: ['workflow-engine', 'streaming', 'memory', 'checkpoint'],
      layer: 4,
      maturity: 'Alpha',
      published: false,
      features: ['Platform Wiring', 'DI Composition', 'Enterprise Integration', 'Modular Export'],
      differentiator: 'Central DI composition boundary',
    },
  ];

  ngAfterViewInit(): void {
    this.initializeSubtleBackground();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  selectLibrary(library: EcosystemLibrary | null): void {
    this.selectedLibrary.set(library);
  }

  getLayerCount(): number {
    return new Set(this.libraries.map(lib => lib.layer)).size;
  }

  getPublishedCount(): number {
    return this.libraries.filter(lib => lib.published).length;
  }

  getBetaCount(): number {
    return this.libraries.filter(lib => lib.maturity === 'Beta').length;
  }

  getMaturityClasses(maturity: string): string {
    const classes = {
      'Stable': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Beta': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Alpha': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Prototype': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Planning': 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    return classes[maturity as keyof typeof classes] || classes.Alpha;
  }

  getLibraryCategories(): LibraryCategory[] {
    return [
      {
        name: 'External Database Adapters',
        description: 'Published NPM packages providing seamless integration with vector and graph databases. These are production-ready with Beta stability.',
        libraries: this.libraries.filter(lib => lib.type === 'External Adapter')
      },
      {
        name: 'Core Runtime Foundation',
        description: 'Essential foundation layer providing shared types, contracts, and orchestration capabilities that power the entire platform.',
        libraries: this.libraries.filter(lib => lib.type === 'Core Runtime')
      },
      {
        name: 'Cross-Cutting Services',
        description: 'Advanced capabilities that span across the platform including streaming, memory fusion, multi-agent coordination, and state management.',
        libraries: this.libraries.filter(lib => lib.type === 'Cross-Cutting')
      },
      {
        name: 'Developer Experience',
        description: 'Tools and APIs designed to enhance developer productivity with functional programming paradigms and simplified interfaces.',
        libraries: this.libraries.filter(lib => lib.type === 'Developer Experience')
      }
    ];
  }

  trackByName(index: number, item: LibraryCategory): string {
    return item.name;
  }

  trackById(index: number, item: EcosystemLibrary): string {
    return item.id;
  }

  trackByIndex(index: number, item: string): number {
    return index;
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
    this.camera.position.z = 50;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Enable transparency
      powerPreference: 'low-power' // Optimize for battery
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Create subtle floating particles
    this.createFloatingParticles();

    // Gentle ambient light
    const ambientLight = new THREE.AmbientLight(0x6366f1, 0.3);
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

  private createFloatingParticles(): void {
    if (!this.scene) return;

    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;     // x
      positions[i + 1] = (Math.random() - 0.5) * 200; // y
      positions[i + 2] = (Math.random() - 0.5) * 100; // z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x8b5cf6,
      size: 2,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
  }

  private updateSubtleAnimation(): void {
    if (!this.scene) return;

    const time = Date.now() * 0.0005;

    this.scene.children.forEach((child, index) => {
      if (child instanceof THREE.Points) {
        child.rotation.y = time * 0.2;
        child.rotation.x = time * 0.1;

        // Gentle floating motion
        const positions = child.geometry.attributes['position'].array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(time + i) * 0.01; // Gentle vertical float
        }
        child.geometry.attributes['position'].needsUpdate = true;
      }
    });
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

  private cleanup(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId) cancelAnimationFrame(this.animationId);

    // Dispose Three.js resources
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Points || obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
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
}
