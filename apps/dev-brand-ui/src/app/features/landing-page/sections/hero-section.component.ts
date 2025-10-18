import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { HybridSceneComponent } from '../../../core/angular-3d/components/hybrid-scene.component';
import type {
  SphereData,
  CubeData,
} from '../../../core/angular-3d/components/hybrid-scene-graph.component';
import { Element3DDirective } from '../../../core/angular-3d/directives/element-3d.directive';
import { HybridUIService } from '../../../core/angular-3d/services/hybrid-ui.service';
import { LoadingStateService } from '../services/loading-state.service';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [CommonModule, HybridSceneComponent, Element3DDirective],
  template: `
    <div
      class="relative w-full h-screen overflow-auto bg-gradient-to-br from-black via-purple-900 to-black"
      [class.loaded]="isLoaded()"
    >
      <!-- Declarative Angular Three Scene -->
      <app-hybrid-scene
        class="absolute inset-0 z-10"
        [backgroundColor]="'transparent'"
        [cameraPosition]="[0, 0, 15]"
        [cameraTarget]="[0, 0, -5]"
        [enableShadows]="true"
        [antialias]="true"
        [alpha]="true"
        [powerPreference]="'high-performance'"
        [performanceTarget]="'desktop'"
        [enableAnimation]="true"
        [ambientLightColor]="4210752"
        [ambientLightIntensity]="0.8"
        [directionalLightColor]="16777215"
        [directionalLightIntensity]="1.5"
        [directionalLightPosition]="[10, 10, 10]"
        [directionalShadowsEnabled]="true"
        [shadowMapSize]="2048"
        [pointLightColor]="9055202"
        [pointLightIntensity]="0.8"
        [pointLightPosition]="[-10, 5, 5]"
        [enablePerformanceOverlay]="showPerformanceDebug()"
        [spheres]="heroCircles()"
        [cubes]="backgroundCubes()"
        (sceneInitialized)="onSceneInitialized($event)"
      >
        <!-- 3D Hero Content - TEMPORARILY DISABLED element3d to debug scene -->
        @if (isLoaded()) {
        <ng-container>
          <!-- Hero Title as regular DOM (3D directive disabled) -->
          <h1
            class="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl md:text-6xl lg:text-7xl font-bold text-center max-w-4xl px-8 z-20"
            style="
                background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #8a2be2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              "
          >
            <span class="block">Enterprise AI</span>
            <span
              class="block bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 bg-clip-text text-transparent"
              >SaaS Starter</span
            >
          </h1>

          <!-- Hero Description as regular DOM (3D directive disabled) -->
          <p
            class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg md:text-xl text-white text-opacity-85 text-center max-w-2xl px-8 z-20"
            style="text-shadow: 0 2px 8px rgba(0,0,0,0.3)"
          >
            Production-ready foundation for AI-powered applications combining
            <span class="text-purple-400 font-semibold">vector search</span>,
            <span class="text-purple-400 font-semibold"
              >graph relationships</span
            >, and
            <span class="text-purple-400 font-semibold"
              >intelligent workflows</span
            >
          </p>

          <!-- Feature Badges as regular DOM (3D directive disabled) -->
          <div
            class="absolute top-2/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex justify-center gap-3 flex-wrap px-8 z-20"
          >
            <div
              class="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white"
            >
              <span class="text-xl">🧠</span>
              <span>Semantic Intelligence</span>
            </div>
            <div
              class="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white"
            >
              <span class="text-xl">🕸️</span>
              <span>Relationship Mapping</span>
            </div>
            <div
              class="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white"
            >
              <span class="text-xl">⚡</span>
              <span>Intelligent Workflows</span>
            </div>
          </div>

          <!-- CTA Buttons as regular DOM (3D directive disabled) -->
          <button
            (click)="exploreDemo()"
            class="absolute bottom-32 left-1/4 transform -translate-x-1/2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-lg font-semibold cursor-pointer z-20"
            style="box-shadow: 0 4px 20px rgba(138, 43, 226, 0.6)"
          >
            <span class="flex items-center gap-2">
              <span>Explore Live Demo</span>
              <span class="text-xl">🚀</span>
            </span>
          </button>

          <button
            (click)="viewArchitecture()"
            class="absolute bottom-32 right-1/4 transform translate-x-1/2 px-8 py-4 bg-white bg-opacity-10 text-white border border-white border-opacity-30 rounded-xl text-lg font-semibold cursor-pointer backdrop-blur-lg z-20"
          >
            <span class="flex items-center gap-2">
              <span>View Architecture</span>
              <span class="text-xl">🏗️</span>
            </span>
          </button>
        </ng-container>
        }
      </app-hybrid-scene>

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
})
export class HeroSectionComponent implements OnInit {
  // Services
  private readonly loadingState = inject(LoadingStateService);
  private readonly hybridUIService = inject(HybridUIService);
  private readonly destroyRef = inject(DestroyRef);

  // Component state signals
  readonly isLoaded = signal(false);
  readonly contentVisible = signal(false);
  readonly currentFPS = signal(60);
  readonly showPerformanceDebug = signal(false); // Set to true for development

  // Mouse tracking for interactive camera animation (optional enhancement)
  private mousePosition = { x: 0, y: 0 };

  constructor() {
    // Watch for when HybridUIService initializes
    effect(() => {
      if (this.hybridUIService.initialized()) {
        const scene = this.hybridUIService.scene();
        if (scene && !this.isLoaded()) {
          console.log(
            '[HeroSectionComponent] HybridUIService initialized, calling onSceneInitialized'
          );
          this.onSceneInitialized(scene);
        }
      }
    });
  }

  // Hero-specific agent configuration for 3D positioning
  // Restored floating circles positioned around hero text area
  private readonly heroCirclesData = signal([
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

  // Convert heroCirclesData to SphereData[] format for HybridSceneComponent
  readonly heroCircles = computed((): SphereData[] => {
    return this.heroCirclesData().map((circle, idx) => ({
      id: circle.id,
      position: circle.position,
      radius: circle.scale * 0.8,
      color: this.parseColor(circle.color),
      metalness: 0.3,
      roughness: 0.1,
      emissive: this.parseColor(circle.color),
      emissiveIntensity: 0.2,
      floatHeight: 0.3,
      floatSpeed: 1500,
      floatDelay: idx * 200,
      autoStart: this.isLoaded(),
    }));
  });

  // Computed signal for background cubes (declarative approach) - returns CubeData[]
  readonly backgroundCubes = computed((): CubeData[] => {
    const cubes: CubeData[] = [];
    const cubeColors = [
      '#6d3b97', // Brighter purple
      '#4a2d6e', // Medium purple
      '#3f2a5c', // Visible dark purple
      '#5e3179', // Bright purple
      '#7642a2', // Light purple
      '#2a1a35', // Darkest (but still visible)
    ];

    for (let i = 0; i < 35; i++) {
      const zone = Math.floor(Math.random() * 4);
      const position = this.generateZonedPosition(zone, i);
      const size = 0.8 + Math.random() * 1.8;

      cubes.push({
        id: `bg-cube-${i}`,
        position,
        size,
        color: this.parseColor(
          cubeColors[Math.floor(Math.random() * cubeColors.length)]
        ),
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
        opacity: 0.6,
      });
    }

    return cubes;
  });

  ngOnInit(): void {
    // Update loading state service
    this.loadingState.updateStage('Loading Hero Section');

    // Minimal initialization - Angular Three handles scene setup
    this.setupMouseTracking(); // Optional: for camera interaction
  }

  /**
   * Called when Angular Three scene is fully initialized
   * This replaces all the manual THREE.js setup code
   */
  onSceneInitialized(scene: THREE.Scene): void {
    console.log('Hero scene initialized with Angular Three', scene);

    // Mark as loaded (will trigger element3d content to appear)
    this.isLoaded.set(true);

    // Notify loading state service
    this.loadingState.markSectionLoaded('hero');

    // Trigger content visibility using RxJS timer (NO setTimeout!)
    timer(800)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.contentVisible.set(true);
      });
  }

  /**
   * Optional mouse tracking for camera interaction
   * Can be used to add interactive camera movement in future
   */
  private setupMouseTracking(): void {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse position to -1 to 1 range
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
      // Future enhancement: Use this for camera interaction
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
  }

  /**
   * Helper method: Convert hex color string to THREE.js color number
   * Example: "#8a2be2" -> 0x8a2be2
   */
  parseColor(hex: string): number {
    return parseInt(hex.replace('#', '0x'), 16);
  }

  /**
   * Helper method: Generate zoned position for background cubes
   * Creates distinct zones (top, bottom, left, right) with exclusion area in center
   */
  private generateZonedPosition(
    zone: number,
    index: number
  ): [number, number, number] {
    let x = 0,
      y = 0,
      z = 0;

    switch (zone) {
      case 0: // Top area
        x = (Math.random() - 0.5) * 50;
        y = 8 + Math.random() * 15;
        z = -8 + Math.random() * -20;
        break;
      case 1: // Bottom area
        x = (Math.random() - 0.5) * 50;
        y = -8 - Math.random() * 15;
        z = -8 + Math.random() * -20;
        break;
      case 2: // Left side
        x = -15 - Math.random() * 25;
        y = (Math.random() - 0.5) * 30;
        z = -8 + Math.random() * -20;
        break;
      case 3: // Right side
        x = 15 + Math.random() * 25;
        y = (Math.random() - 0.5) * 30;
        z = -8 + Math.random() * -20;
        break;
    }

    // Exclusion zone - keep cubes away from center text area
    if (Math.abs(x) < 12 && Math.abs(y) < 8) {
      if (Math.abs(x) > Math.abs(y)) {
        x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
      } else {
        y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
      }
    }

    return [x, y, z];
  }

  // UI event handlers
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
