import { Component, computed, OnInit, signal } from '@angular/core';

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
      </app-hybrid-scene>

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
})
export class HeroSectionComponent implements OnInit {
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
    // Minimal initialization - Angular Three handles scene setup
    this.setupMouseTracking(); // Optional: for camera interaction
  }

  /**
   * Called when Angular Three scene is fully initialized
   * This replaces all the manual THREE.js setup code
   */
  onSceneInitialized(scene: THREE.Scene): void {
    console.log('Hero scene initialized with Angular Three', scene);
    this.isLoaded.set(true);

    // Trigger content entrance animation after a delay
    setTimeout(() => {
      this.contentVisible.set(true);
    }, 1500);
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
