import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { HybridSceneComponent } from '../../../core/angular-3d/components/hybrid-scene.component';
import {
  BackgroundCubeComponent,
  FloatingSphereComponent,
} from '../../../core/angular-3d/components/primitives';
import {
  Float3dDirective,
  Glow3dDirective,
  Performance3dDirective,
} from '../../../core/angular-3d/directives';
import { Element3DDirective } from '../../../core/angular-3d/directives/element-3d.directive';
import { LoadingStateService } from '../services/loading-state.service';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [
    CommonModule,
    HybridSceneComponent,
    FloatingSphereComponent,
    BackgroundCubeComponent,
    Float3dDirective,
    Performance3dDirective,
    Glow3dDirective,
    Element3DDirective,
  ],
  template: `
    <div
      class="relative w-full h-screen overflow-auto bg-gradient-to-br from-black via-purple-900 to-black"
      [class.loaded]="isLoaded()"
    >
      <!-- Declarative Angular Three Scene -->
      <app-hybrid-scene
        class="absolute inset-0 z-10"
        [backgroundColor]="'#000000'"
        [cameraPosition]="[0, 0, 12]"
        [cameraTarget]="[0, 0, 0]"
        [enableShadows]="true"
        [antialias]="true"
        [alpha]="true"
        [powerPreference]="'high-performance'"
        [performanceTarget]="'desktop'"
        [enableAnimation]="true"
        [ambientLightColor]="4210752"
        [ambientLightIntensity]="0.4"
        [directionalLightColor]="16777215"
        [directionalLightIntensity]="1.0"
        [directionalLightPosition]="[10, 10, 10]"
        [directionalShadowsEnabled]="true"
        [shadowMapSize]="2048"
        [pointLightColor]="9055202"
        [pointLightIntensity]="0.8"
        [pointLightPosition]="[-10, 5, 5]"
        [enablePerformanceOverlay]="showPerformanceDebug()"
        (sceneInitialized)="onSceneInitialized($event)"
      >
        <!-- Floating Spheres (5 hero circles) -->
        @for (circle of heroCircles(); track circle.id; let idx = $index) {
        <app-floating-sphere
          [position]="[circle.position.x, circle.position.y, circle.position.z]"
          [radius]="circle.scale * 0.8"
          [color]="parseColor(circle.color)"
          [metalness]="0.3"
          [roughness]="0.1"
          [clearcoat]="1.0"
          [clearcoatRoughness]="0.1"
          [transmission]="0.1"
          [emissive]="parseColor(circle.color)"
          [emissiveIntensity]="0.2"
          float3d
          [floatHeight]="0.3"
          [floatSpeed]="1500"
          [floatDelay]="idx * 200"
          [autoStart]="isLoaded()"
          performance3d
          glow3d
          [glowColor]="parseColor(circle.color)"
        />
        }

        <!-- Background Cubes (35 cubes) -->
        @for (cube of backgroundCubes(); track cube.id) {
        <app-background-cube
          [position]="cube.position"
          [size]="cube.size"
          [color]="parseColor(cube.color)"
          [rotation]="cube.rotation"
          [transparent]="true"
          [opacity]="0.6"
          performance3d
        />
        }

        <!-- 3D Hero Content using element3d directive -->
        @if (isLoaded()) {
        <ng-container>
          <!-- Hero Title as 3D textured mesh -->
          <h1
            element3d
            [position]="[0, 1.8, -1.2]"
            priority="HERO"
            quality="high"
            [depth]="-1.2"
            class="text-5xl md:text-6xl lg:text-7xl font-bold text-center max-w-4xl px-8"
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

          <!-- Hero Description as 3D textured mesh -->
          <p
            element3d
            [position]="[0, 0.2, -1.3]"
            priority="PRIMARY"
            quality="medium"
            [depth]="-1.3"
            class="text-lg md:text-xl text-white text-opacity-85 text-center max-w-2xl px-8"
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

          <!-- Feature Badges as 3D textured meshes -->
          <div
            element3d
            [position]="[0, -0.8, -1.4]"
            priority="SECONDARY"
            quality="medium"
            [depth]="-1.4"
            class="flex justify-center gap-3 flex-wrap px-8"
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

          <!-- CTA Buttons as 3D textured meshes -->
          <button
            element3d
            [position]="[-1.8, -2, -1.5]"
            priority="PRIMARY"
            quality="high"
            [depth]="-1.5"
            [enableInteraction]="true"
            (clicked)="exploreDemo()"
            class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-lg font-semibold cursor-pointer"
            style="box-shadow: 0 4px 20px rgba(138, 43, 226, 0.6)"
          >
            <span class="flex items-center gap-2">
              <span>Explore Live Demo</span>
              <span class="text-xl">🚀</span>
            </span>
          </button>

          <button
            element3d
            [position]="[1.8, -2, -1.5]"
            priority="SECONDARY"
            quality="medium"
            [depth]="-1.5"
            [enableInteraction]="true"
            (clicked)="viewArchitecture()"
            class="px-8 py-4 bg-white bg-opacity-10 text-white border border-white border-opacity-30 rounded-xl text-lg font-semibold cursor-pointer backdrop-blur-lg"
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

  // Component state signals
  readonly isLoaded = signal(false);
  readonly contentVisible = signal(false);
  readonly currentFPS = signal(60);
  readonly showPerformanceDebug = signal(false); // Set to true for development

  // Mouse tracking for interactive camera animation (optional enhancement)
  private mousePosition = { x: 0, y: 0 };

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

  // Computed signal for background cubes (declarative approach)
  readonly backgroundCubes = computed(() => {
    const cubes = [];
    const cubeColors = [
      '#2d1b47',
      '#1a0d2e',
      '#0f0a1c',
      '#1e1139',
      '#261242',
      '#0a0a15',
    ];

    for (let i = 0; i < 35; i++) {
      const zone = Math.floor(Math.random() * 4);
      const position = this.generateZonedPosition(zone, i);
      const size = 0.8 + Math.random() * 1.8;

      cubes.push({
        id: `bg-cube-${i}`,
        position,
        size,
        color: cubeColors[Math.floor(Math.random() * cubeColors.length)],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ] as const,
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

    // Trigger content visibility with shorter delay since element3d handles entrance
    setTimeout(() => {
      this.contentVisible.set(true);
    }, 800); // Reduced from 1500ms
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
