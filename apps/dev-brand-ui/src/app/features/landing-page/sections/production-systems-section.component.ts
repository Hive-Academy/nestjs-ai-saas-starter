import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface ModuleCard {
  title: string;
  description: string;
  features: string[];
  accentColor: string;
  particleColor: number;
}

@Component({
  selector: 'app-production-systems-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="relative py-20 bg-gradient-to-b from-black to-gray-900">
      <div class="container mx-auto px-4">
        <!-- Section Header -->
        <div class="text-center mb-16 opacity-0" #sectionHeader>
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
            Production Systems
          </h2>
          <p class="text-xl text-gray-300 max-w-3xl mx-auto">
            Enterprise-grade state persistence, observability, debugging, and
            platform integration for production-ready workflows
          </p>
        </div>

        <!-- Module Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          @for (module of modules; track module.title) {
          <div
            class="module-card relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:border-{{
              module.accentColor
            }}-500 transition-all duration-300 overflow-hidden opacity-0"
            [attr.data-accent]="module.accentColor"
          >
            <!-- Particle Background Canvas -->
            <canvas
              class="absolute inset-0 w-full h-full pointer-events-none"
              [attr.data-module]="module.title"
            ></canvas>

            <!-- Content -->
            <div class="relative z-10">
              <div class="flex items-center mb-4">
                <div
                  class="w-3 h-3 rounded-full bg-{{
                    module.accentColor
                  }}-500 mr-3"
                ></div>
                <h3 class="text-2xl font-bold text-white">
                  {{ module.title }}
                </h3>
              </div>

              <p class="text-gray-300 mb-6">
                {{ module.description }}
              </p>

              <div class="space-y-3">
                @for (feature of module.features; track feature) {
                <div class="flex items-start">
                  <svg
                    class="w-5 h-5 text-{{
                      module.accentColor
                    }}-500 mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span class="text-sm text-gray-400">{{ feature }}</span>
                </div>
                }
              </div>
            </div>
          </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .module-card {
        position: relative;
        min-height: 400px;
      }

      canvas {
        opacity: 0.6;
      }
    `,
  ],
})
export class ProductionSystemsSectionComponent implements OnInit, OnDestroy {
  @ViewChild('sectionHeader', { static: true })
  sectionHeader!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private particleSystems: THREE.Scene[] = [];
  private renderers: THREE.WebGLRenderer[] = [];
  private animationFrameIds: number[] = [];
  private isAnimating = false;

  modules: ModuleCard[] = [
    {
      title: 'checkpoint',
      description:
        'Checkpoint Management - Multi-backend state persistence with PostgreSQL, SQLite, and Redis support',
      features: [
        'Multi-backend state persistence',
        'PostgreSQL, SQLite, Redis support',
        'Automatic state recovery',
        'Checkpoint versioning',
        'Transaction-safe state updates',
      ],
      accentColor: 'orange',
      particleColor: 0xf97316,
    },
    {
      title: 'monitoring',
      description:
        'Production Observability - Facade pattern coordinating 5 specialized services (MetricsCollector, Alerting, HealthCheck, PerformanceTracker, Dashboard)',
      features: [
        'Metrics collection and aggregation',
        'Real-time alerting system',
        'Health check automation',
        'Performance tracking and profiling',
        'Dashboard visualization',
      ],
      accentColor: 'red',
      particleColor: 0xef4444,
    },
    {
      title: 'time-travel',
      description:
        'Workflow Debugging and Replay - Facade pattern coordinating 5 services (BranchManager, WorkflowReplay, ExecutionHistory, WorkflowRegistry)',
      features: [
        'Branch management for workflow variants',
        'Workflow replay and debugging',
        'Execution history tracking',
        'Workflow registry and versioning',
        'State snapshot comparison',
      ],
      accentColor: 'cyan',
      particleColor: 0x06b6d4,
    },
    {
      title: 'platform',
      description:
        'LangGraph Platform Integration - HTTP client integration with retry policies and webhook handling',
      features: [
        'HTTP client with retry policies',
        'Webhook event handling',
        'Platform API integration',
        'Authentication management',
        'Request/response interceptors',
      ],
      accentColor: 'pink',
      particleColor: 0xec4899,
    },
  ];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeAnimations();
      this.initializeParticleSystems();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cleanup();
    }
  }

  private initializeAnimations(): void {
    const timeline = gsap.timeline();

    // Animate section header
    timeline.to(this.sectionHeader.nativeElement, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    });

    // Stagger animate module cards
    timeline.to(
      '.module-card',
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
      },
      '-=0.5'
    );
  }

  private initializeParticleSystems(): void {
    const canvases = document.querySelectorAll(
      'canvas[data-module]'
    ) as NodeListOf<HTMLCanvasElement>;

    canvases.forEach((canvas, index) => {
      const module = this.modules[index];
      if (!module) return;

      // Scene setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Particle system
      const particleCount = 15;
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

        velocities.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
          )
        );
      }

      particles.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );

      const particleMaterial = new THREE.PointsMaterial({
        color: module.particleColor,
        size: 0.1,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });

      const particleSystem = new THREE.Points(particles, particleMaterial);
      scene.add(particleSystem);

      this.particleSystems.push(scene);
      this.renderers.push(renderer);

      // Animation loop
      const animate = () => {
        if (!this.isAnimating) return;

        const positions = particles.attributes[
          'position'
        ] as THREE.BufferAttribute;
        const positionArray = positions.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          positionArray[i * 3] += velocities[i].x;
          positionArray[i * 3 + 1] += velocities[i].y;
          positionArray[i * 3 + 2] += velocities[i].z;

          // Boundary check
          if (Math.abs(positionArray[i * 3]) > 5) velocities[i].x *= -1;
          if (Math.abs(positionArray[i * 3 + 1]) > 5) velocities[i].y *= -1;
          if (Math.abs(positionArray[i * 3 + 2]) > 2.5) velocities[i].z *= -1;
        }

        positions.needsUpdate = true;
        particleSystem.rotation.y += 0.001;

        renderer.render(scene, camera);
        const frameId = requestAnimationFrame(animate);
        this.animationFrameIds.push(frameId);
      };

      this.isAnimating = true;
      animate();
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const canvases = document.querySelectorAll(
      'canvas[data-module]'
    ) as NodeListOf<HTMLCanvasElement>;

    canvases.forEach((canvas, index) => {
      const renderer = this.renderers[index];
      if (!renderer) return;

      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
  }

  private cleanup(): void {
    this.isAnimating = false;

    this.animationFrameIds.forEach((id) => cancelAnimationFrame(id));
    this.animationFrameIds = [];

    this.renderers.forEach((renderer) => renderer.dispose());
    this.renderers = [];

    this.particleSystems.forEach((scene) => {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
    });
    this.particleSystems = [];

    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
