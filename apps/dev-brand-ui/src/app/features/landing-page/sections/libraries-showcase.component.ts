import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';

import * as THREE from 'three';
import { ThreeDInfoCardComponent, InfoCardData } from '../components/three-d-info-card.component';

@Component({
  selector: 'brand-libraries-showcase',
  standalone: true,
  imports: [ThreeDInfoCardComponent],
  template: `
    <section
      id="libraries-showcase"
      class="relative min-h-screen py-20 overflow-auto bg-gradient-to-br from-black via-purple-900/30 to-black"
      >
      <!-- Background 3D Scene -->
      <div class="absolute inset-0 z-10" #backgroundScene></div>
    
      <!-- Content -->
      <div class="relative z-20 container mx-auto px-6">
        <!-- Section Header -->
        <div class="text-center mb-16 space-y-6">
          <div class="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/10 border border-purple-500/20 rounded-full backdrop-blur-lg">
            <span class="text-2xl">🏗️</span>
            <span class="text-purple-300 font-semibold">Platform Architecture</span>
          </div>
    
          <h2 class="text-4xl md:text-5xl font-bold text-white leading-tight">
            <span class="block bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Enterprise-Grade
            </span>
            <span class="block bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 bg-clip-text text-transparent">
              AI Library Ecosystem
            </span>
          </h2>
    
          <p class="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Modular, production-ready libraries designed for sophisticated AI workflows with
            <span class="text-purple-400 font-semibold">streaming intelligence</span>,
            <span class="text-pink-400 font-semibold">multi-agent coordination</span>, and
            <span class="text-sky-400 font-semibold">persistent state management</span>.
          </p>
        </div>
    
        <!-- Platform Overview Stats -->
        <div class="mb-16 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 border border-purple-500/10 rounded-3xl p-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div class="space-y-2">
              <div class="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">13</div>
              <div class="text-sm text-white/70">Publishable Packages</div>
            </div>
            <div class="space-y-2">
              <div class="text-4xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">40%</div>
              <div class="text-sm text-white/70">Code Reduction</div>
            </div>
            <div class="space-y-2">
              <div class="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">80%+</div>
              <div class="text-sm text-white/70">Test Coverage</div>
            </div>
            <div class="space-y-2">
              <div class="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">0</div>
              <div class="text-sm text-white/70">Any Types</div>
            </div>
          </div>
        </div>
    
        <!-- Core Foundation -->
        <div class="mb-20">
          <div class="text-center mb-12">
            <h3 class="text-2xl font-bold text-white/90 mb-4">
              🏗️ Foundation Layer
            </h3>
            <p class="text-white/70 max-w-2xl mx-auto">
              Core runtime libraries providing the foundation for execution orchestration,
              functional composition, and type-safe abstractions.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (library of corePlatformLibraries(); track trackByLibrary($index, library)) {
              <brand-three-d-info-card
                [data]="library"
              ></brand-three-d-info-card>
            }
          </div>
        </div>
    
        <!-- Cross-Cutting Services -->
        <div class="mb-20">
          <div class="text-center mb-12">
            <h3 class="text-2xl font-bold text-white/90 mb-4">
              ⚡ Cross-Cutting Services
            </h3>
            <p class="text-white/70 max-w-2xl mx-auto">
              Specialized modules for streaming, durability, intelligence, coordination, safety,
              and observability with pluggable architecture.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (library of specializedLibraries(); track trackByLibrary($index, library)) {
              <brand-three-d-info-card
                [data]="library"
              ></brand-three-d-info-card>
            }
          </div>
        </div>
    
        <!-- Persistence Adapters -->
        <div class="mb-20">
          <div class="text-center mb-12">
            <h3 class="text-2xl font-bold text-white/90 mb-4">
              🗄️ Persistence Layer
            </h3>
            <p class="text-white/70 max-w-2xl mx-auto">
              Enterprise-grade database integrations for vector embeddings and graph relationships
              with connection pooling and health monitoring.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            @for (library of externalAdapters(); track trackByLibrary($index, library)) {
              <brand-three-d-info-card
                [data]="library"
              ></brand-three-d-info-card>
            }
          </div>
        </div>
    
        <!-- Architecture Benefits -->
        <div class="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-sky-500/10 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-lg">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div class="space-y-3">
              <div class="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                🎯
              </div>
              <h4 class="text-xl font-semibold text-white">Modular Design</h4>
              <p class="text-white/80">Mix and match libraries based on specific use cases without vendor lock-in</p>
            </div>
            <div class="space-y-3">
              <div class="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-sky-500 rounded-full flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h4 class="text-xl font-semibold text-white">Production Ready</h4>
              <p class="text-white/80">Enterprise-grade reliability with comprehensive testing and monitoring</p>
            </div>
            <div class="space-y-3">
              <div class="w-16 h-16 mx-auto bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-2xl">
                🚀
              </div>
              <h4 class="text-xl font-semibold text-white">Developer Experience</h4>
              <p class="text-white/80">Intuitive APIs with TypeScript-first design and comprehensive documentation</p>
            </div>
          </div>
        </div>
      </div>
    
      <!-- Performance Metrics (Optional Debug) -->
      @if (showPerformanceDebug()) {
        <div class="absolute top-5 right-5 bg-black/70 text-green-400 px-3 py-2 rounded text-sm font-mono z-30">
          Libraries: {{ getTotalLibraryCount() }} | FPS: {{ currentFPS() }}
        </div>
      }
    </section>
    `,
  styles: [`
    :host {
      display: block;
    }

    .container {
      max-width: 1400px;
    }

    /* Custom scrollbar for better UX */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    ::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #8a2be2, #ff69b4);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #9932cc, #ff1493);
    }
  `]
})
export class LibrariesShowcaseComponent implements OnInit, OnDestroy {
  @ViewChild('backgroundScene', { static: true }) backgroundScene!: ElementRef;

  // Three.js background scene
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private backgroundMeshes: THREE.Mesh[] = [];
  private animationFrame?: number;
  private clock = new THREE.Clock();

  // Component state
  readonly showPerformanceDebug = signal(false);
  readonly currentFPS = signal(60);

  // Complete library inventory from hackathon documentation - 13 publishable packages
  readonly corePlatformLibraries = signal<InfoCardData[]>([
    {
      id: 'langgraph-core',
      title: 'LangGraph Core',
      category: 'Foundation',
      description: 'Foundational types, decorators, and shared abstractions that power the entire platform with TypeScript strict mode.',
      features: ['Core Types', 'Decorators', 'DI Interfaces', 'Zero `any` Types'],
      maturity: 'Beta',
      differentiator: 'Zero overhead when features disabled via no-op fallbacks',
      color: '#9333ea'
    },
    {
      id: 'workflow-engine',
      title: 'Workflow Engine',
      category: 'Execution',
      description: 'High-level graph/workflow orchestration layer integrating streaming, checkpoint, and HITL for complete execution control.',
      features: ['Graph Orchestration', 'State Management', 'Node Execution', '40% Code Reduction'],
      maturity: 'Alpha',
      differentiator: 'Build & run LangGraph workflows with seamless composition',
      color: '#8a2be2'
    },
    {
      id: 'functional-api',
      title: 'Functional API',
      category: 'Developer Experience',
      description: 'Declarative/functional composition over workflows & events delivering 40% LOC reduction vs class-based patterns.',
      features: ['Functional Composition', 'Event Handling', 'Code Reduction', 'Type Safety'],
      maturity: 'Alpha',
      differentiator: '40% less code with functional decorators vs traditional patterns',
      color: '#06b6d4'
    }
  ]);

  readonly specializedLibraries = signal<InfoCardData[]>([
    {
      id: 'streaming',
      title: 'Real-time Streaming',
      category: 'Experience',
      description: 'Token/event/progress streaming over WebSockets with method-level decorators and DI adapter pattern.',
      features: ['@StreamToken', '@StreamEvent', 'WebSocket Bridge', 'Buffer & Filter'],
      maturity: 'Alpha',
      differentiator: 'Replayable real-time workflows with time-travel synergy',
      color: '#ff69b4'
    },
    {
      id: 'checkpoint',
      title: 'State Persistence',
      category: 'Durability',
      description: 'Durable execution state with pluggable storage adapters for zero-downtime resume capability.',
      features: ['State Snapshots', 'Resume Workflows', 'Pluggable Storage', 'Zero-Downtime'],
      maturity: 'Alpha',
      differentiator: 'Works transparently - consumer libraries unaffected if absent',
      color: '#22c55e'
    },
    {
      id: 'memory',
      title: 'Unified Memory',
      category: 'Intelligence',
      description: 'Semantic + graph memory fusion combining vector similarity with relationship expansion for enriched context.',
      features: ['Cascade Retrieval', 'Vector + Graph', 'Context Fusion', 'Smart Chunking'],
      maturity: 'Alpha',
      differentiator: 'Memory fusion: vector similarity informs relationship creation',
      color: '#06b6d4'
    },
    {
      id: 'multi-agent',
      title: 'Multi-Agent Systems',
      category: 'Coordination',
      description: 'Patterns for multi-agent coordination with role-based messaging and shared context synchronization.',
      features: ['Agent Roles', 'Message Passing', 'Shared Context', 'Debate Patterns'],
      maturity: 'Alpha',
      differentiator: 'Native workflow engine and memory integration for agent debates',
      color: '#f59e0b'
    },
    {
      id: 'hitl',
      title: 'Human-in-the-Loop',
      category: 'Safety & Control',
      description: 'Declarative approval gates with escalation strategies and timeout handling for human oversight.',
      features: ['Approval Gates', '@RequiresApproval', 'Escalation Rules', 'Timeout Strategy'],
      maturity: 'Alpha',
      differentiator: 'Human gating without lock-in - removable with zero code churn',
      color: '#ef4444'
    },
    {
      id: 'monitoring',
      title: 'Observability',
      category: 'Operations',
      description: 'Comprehensive metrics and observability scaffolding with performance tracking and error monitoring.',
      features: ['Metrics Collection', 'Error Tracking', 'Performance Monitoring', 'Health Checks'],
      maturity: 'Alpha',
      differentiator: 'Built-in observability with minimal performance overhead',
      color: '#8b5cf6'
    },
    {
      id: 'time-travel',
      title: 'Time Travel Debug',
      category: 'Developer Tools',
      description: 'Deterministic replay and timeline navigation for debugging with identical token emission replay.',
      features: ['Timeline Replay', 'State Navigation', 'Token Emission', 'Debug Forensics'],
      maturity: 'Beta',
      differentiator: 'Replay preserves original streaming semantics identically',
      color: '#7c3aed'
    },
    {
      id: 'platform',
      title: 'LangGraph Platform',
      category: 'Integration',
      description: 'External LangGraph Platform API integration for cloud-native workflow execution and management.',
      features: ['Cloud Integration', 'Workflow Management', 'Remote Execution', 'API Gateway'],
      maturity: 'Alpha',
      differentiator: 'Seamless local-to-cloud workflow migration',
      color: '#10b981'
    }
  ]);

  readonly externalAdapters = signal<InfoCardData[]>([
    {
      id: 'nestjs-chromadb',
      title: 'ChromaDB Adapter',
      category: 'Persistence Layer',
      description: 'Enterprise-grade vector database integration with smart chunking, multi-provider embeddings, and semantic similarity.',
      features: ['Vector Storage', 'Multi-Provider', 'Smart Chunking', 'Semantic Search'],
      maturity: 'Beta',
      differentiator: 'Smart chunk relationship preservation with provider abstraction',
      color: '#f97316'
    },
    {
      id: 'nestjs-neo4j',
      title: 'Neo4j Graph Adapter',
      category: 'Persistence Layer', 
      description: 'Production-ready graph database integration with connection pooling, health monitoring, and relationship mapping.',
      features: ['Graph Storage', 'Connection Pooling', 'Health Monitoring', 'Cypher Queries'],
      maturity: 'Beta',
      differentiator: 'Foundation for graph algorithm services and relationship expansion',
      color: '#059669'
    }
  ]);

  ngOnInit(): void {
    this.initBackground3D();
    this.createBackgroundElements();
    this.setupLighting();
    this.startRenderLoop();
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  getTotalLibraryCount(): number {
    return this.corePlatformLibraries().length + 
           this.specializedLibraries().length + 
           this.externalAdapters().length;
  }

  private initBackground3D(): void {
    const container = this.backgroundScene.nativeElement;
    
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 20, 100);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 30);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);
  }

  private createBackgroundElements(): void {
    // Create floating geometric shapes representing different library categories
    const shapes = [
      { type: 'sphere', color: '#8a2be2', position: [-15, 10, -10] as [number, number, number] },
      { type: 'box', color: '#ff69b4', position: [15, -8, -15] as [number, number, number] },
      { type: 'octahedron', color: '#00bfff', position: [-20, -5, -8] as [number, number, number] },
      { type: 'tetrahedron', color: '#32cd32', position: [18, 12, -12] as [number, number, number] },
      { type: 'sphere', color: '#ffd700', position: [0, 15, -20] as [number, number, number] },
      { type: 'box', color: '#ff6347', position: [-10, -12, -18] as [number, number, number] }
    ];

    shapes.forEach((shapeConfig, index) => {
      let geometry: THREE.BufferGeometry;
      
      switch (shapeConfig.type) {
        case 'sphere':
          geometry = new THREE.SphereGeometry(2, 16, 16);
          break;
        case 'box':
          geometry = new THREE.BoxGeometry(3, 3, 3);
          break;
        case 'octahedron':
          geometry = new THREE.OctahedronGeometry(2.5);
          break;
        case 'tetrahedron':
          geometry = new THREE.TetrahedronGeometry(2.5);
          break;
        default:
          geometry = new THREE.SphereGeometry(2, 16, 16);
      }

      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(shapeConfig.color),
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
        metalness: 0.8,
        emissive: new THREE.Color(shapeConfig.color).multiplyScalar(0.1)
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...shapeConfig.position);
      mesh.userData = { 
        originalPosition: shapeConfig.position,
        floatOffset: index * 0.7,
        rotationSpeed: 0.01 + Math.random() * 0.01
      };

      this.scene.add(mesh);
      this.backgroundMeshes.push(mesh);
    });
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    // Colored accent lights matching the theme
    const lights = [
      { color: '#8a2be2', position: [-10, 5, 5] as [number, number, number] },
      { color: '#ff69b4', position: [10, -5, 5] as [number, number, number] },
      { color: '#00bfff', position: [0, 10, -5] as [number, number, number] }
    ];

    lights.forEach(lightConfig => {
      const light = new THREE.PointLight(lightConfig.color, 0.4, 30);
      light.position.set(...lightConfig.position);
      this.scene.add(light);
    });
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      
      const elapsedTime = this.clock.getElapsedTime();

      // Animate background elements
      this.backgroundMeshes.forEach((mesh) => {
        const userData = mesh.userData;
        
        // Gentle floating motion
        mesh.position.y = userData['originalPosition'][1] + 
          Math.sin(elapsedTime * 0.5 + userData['floatOffset']) * 2;
        
        // Slow rotation
        mesh.rotation.x += userData['rotationSpeed'];
        mesh.rotation.y += userData['rotationSpeed'] * 1.5;
        mesh.rotation.z += userData['rotationSpeed'] * 0.5;
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  trackByLibrary(index: number, library: InfoCardData): string {
    return library.id;
  }
}