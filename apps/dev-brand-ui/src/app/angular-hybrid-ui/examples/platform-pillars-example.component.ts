import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HybridSceneComponent,
  Card3DComponent,
  Content3DDirective,
  createCardConfig,
  ContentPriority,
  HybridElement3D
} from '../index';

/**
 * Platform Pillars Example Component
 * Demonstrates how to recreate the Platform Pillars section using the new Hybrid UI Framework
 * This replaces the complex manual Three.js implementation with declarative components
 */
@Component({
  selector: 'platform-pillars-example',
  standalone: true,
  imports: [
    CommonModule,
    HybridSceneComponent,
    Card3DComponent,
    Content3DDirective
  ],
  template: `
    <div class="platform-pillars-container">
      <!-- Header -->
      <div class="section-header">
        <h2 class="title">Platform Pillars</h2>
        <p class="subtitle">
          Five core capabilities that power intelligent AI workflows
        </p>
      </div>

      <!-- 3D Scene with Hybrid Cards -->
      <hybrid-scene
        sceneId="platform-pillars-hybrid"
        layout="grid-2d"
        [showPerformance]="showDebugInfo()"
        [showControls]="true"
        [autoOptimize]="true"
        (sceneReady)="onSceneReady($event)"
        (elementActivated)="onElementActivated($event)"
        class="pillars-scene">

        <!-- Platform Pillar Cards using the new Card3D component -->
        @for (pillar of pillars; track pillar.id) {
          <card-3d
            [title]="pillar.title"
            [description]="pillar.description"
            [icon]="pillar.icon"
            [features]="pillar.features"
            [priority]="priorityKey(pillar.priority)"
            [decoration]="pillar.decoration"
            [interactive]="true"
            [elevated]="activePillar() === pillar.id"
            (hover)="onPillarHover(pillar.id)"
            (click)="onPillarClick(pillar.id)"
            (ready)="onPillarReady(pillar.id, $event)"
            class="pillar-card">
          </card-3d>
        }

        <!-- Example of custom content using the directive -->
        <div
          *content3D="heroConfig"
          class="hero-info"
          (element3DReady)="onHeroReady($event)">
          <h3>🚀 Built with Hybrid UI</h3>
          <p>This entire interface is rendered in 3D while maintaining familiar web patterns!</p>
          <ul>
            <li>✅ Content-First Design</li>
            <li>✅ Intelligent Scaling</li>
            <li>✅ Angular 20+ Signals</li>
            <li>✅ Performance Optimized</li>
          </ul>
        </div>
      </hybrid-scene>

      <!-- Debug Panel -->
      @if (showDebugInfo()) {
        <div class="debug-panel">
          <h4>Debug Information</h4>
          <div class="debug-item">
            <span>Active Pillar:</span>
            <span>{{ activePillar() || 'None' }}</span>
          </div>
          <div class="debug-item">
            <span>Scene Ready:</span>
            <span>{{ sceneReady() ? 'Yes' : 'No' }}</span>
          </div>
          <div class="debug-item">
            <span>Elements Created:</span>
            <span>{{ elementsCreated() }}</span>
          </div>
        </div>
      }

      <!-- Controls -->
      <div class="scene-info">
        <button
          type="button"
          class="info-button"
          (click)="toggleDebugInfo()">
          {{ showDebugInfo() ? 'Hide' : 'Show' }} Debug Info
        </button>

        <button
          type="button"
          class="info-button"
          (click)="resetScene()">
          Reset Scene
        </button>

        <button
          type="button"
          class="info-button"
          (click)="randomizePositions()">
          Randomize Layout
        </button>
      </div>
    </div>
  `,
  styles: [`
    .platform-pillars-container {
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .section-header {
      text-align: center;
      padding: 40px 20px 20px;
      z-index: 10;
      position: relative;
    }

    .title {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 700;
      margin: 0 0 16px 0;
      background: linear-gradient(45deg, #3b82f6, #8b5cf6, #3b82f6);
      background-size: 200% 200%;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: gradientShift 3s ease-in-out infinite;
    }

    .subtitle {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .pillars-scene {
      flex: 1;
      min-height: 600px;
      border-radius: 12px;
      margin: 0 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .pillar-card {
      /* Additional styling is handled by Card3DComponent */
    }

    .hero-info {
      background: linear-gradient(135deg,
        rgba(59, 130, 246, 0.1) 0%,
        rgba(139, 92, 246, 0.1) 100%);
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-radius: 16px;
      padding: 24px;
      color: white;
      backdrop-filter: blur(20px);
      max-width: 400px;
    }

    .hero-info h3 {
      margin: 0 0 12px 0;
      font-size: 1.5rem;
      color: #60a5fa;
    }

    .hero-info p {
      margin: 0 0 16px 0;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
    }

    .hero-info ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .hero-info li {
      padding: 4px 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
    }

    .debug-panel {
      position: absolute;
      top: 120px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 16px;
      color: white;
      font-family: monospace;
      font-size: 0.85rem;
      z-index: 100;
      min-width: 200px;
    }

    .debug-panel h4 {
      margin: 0 0 12px 0;
      font-size: 1rem;
      color: #60a5fa;
    }

    .debug-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .debug-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .scene-info {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      z-index: 100;
    }

    .info-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .info-button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(59, 130, 246, 0.5);
      transform: translateY(-2px);
    }

    .info-button:active {
      transform: translateY(0);
    }
  `]
})
export class PlatformPillarsExampleComponent implements OnInit {

  // State signals
  readonly activePillar = signal<string | null>(null);
  readonly sceneReady = signal(false);
  readonly showDebugInfo = signal(false);
  readonly elementsCreated = signal(0);

  // Platform Pillars data with new priority system
  readonly pillars = [
    {
      id: 'orchestration',
      title: 'Orchestration',
      description: 'Intelligent workflow coordination across multiple AI agents',
      icon: '🎼',
  priority: ContentPriority.PRIMARY,
      decoration: {
        geometry: 'icosahedron' as const,
        opacity: 0.4,
        scale: 0.8,
        animation: 'rotate' as const,
        color: 0xff69b4
      },
      features: [
        'Multi-agent coordination',
        'Workflow state management',
        'Dynamic task routing',
        'Error recovery & retry logic'
      ]
    },
    {
      id: 'streaming',
      title: 'Streaming',
      description: 'Real-time data flow and progressive result delivery',
      icon: '🌊',
  priority: ContentPriority.PRIMARY,
      decoration: {
        geometry: 'sphere' as const,
        opacity: 0.4,
        scale: 0.7,
        animation: 'float' as const,
        color: 0x00bfff
      },
      features: [
        'Real-time progress updates',
        'Chunked data processing',
        'WebSocket integration',
        'Backpressure handling'
      ]
    },
    {
      id: 'durability',
      title: 'Durability',
      description: 'Persistent state and reliable execution guarantees',
      icon: '🛡️',
  priority: ContentPriority.HERO, // Center piece
      decoration: {
        geometry: 'dodecahedron' as const,
        opacity: 0.5,
        scale: 0.9,
        animation: 'pulse' as const,
        color: 0x32cd32
      },
      features: [
        'Checkpoint persistence',
        'State recovery',
        'Transaction guarantees',
        'Failure resilience'
      ]
    },
    {
      id: 'memory',
      title: 'Memory Fusion',
      description: 'Hybrid vector and graph memory for intelligent context',
      icon: '🧠',
  priority: ContentPriority.PRIMARY,
      decoration: {
        geometry: 'torus' as const,
        opacity: 0.4,
        scale: 0.6,
        animation: 'orbit' as const,
        color: 0xffa500
      },
      features: [
        'Vector similarity search',
        'Graph relationship traversal',
        'Context fusion',
        'Semantic understanding'
      ]
    },
    {
      id: 'safety',
      title: 'Safety Gates',
      description: 'Human-in-the-loop controls and validation checkpoints',
      icon: '⚡',
  priority: ContentPriority.PRIMARY,
      decoration: {
        geometry: 'octahedron' as const,
        opacity: 0.4,
        scale: 0.8,
        animation: 'breathe' as const,
        color: 0xff4500
      },
      features: [
        'Human approval workflows',
        'Content validation',
        'Risk assessment',
        'Compliance monitoring'
      ]
    }
  ];

  // Configuration for the hero info element
  readonly heroConfig = createCardConfig({
    priority: ContentPriority.SECONDARY,
    elevated: true,
    interactive: true,
    decoration: {
      geometry: 'icosahedron',
      opacity: 0.3,
      scale: 0.7,
      animation: 'rotate',
      color: 0x60a5fa
    }
  });

  ngOnInit(): void {
    console.log('🚀 Platform Pillars Example initialized with Hybrid UI Framework');
  }

  /**
   * Handle scene ready event
   */
  onSceneReady(sceneId: string): void {
    this.sceneReady.set(true);
    console.log(`✅ Hybrid scene '${sceneId}' is ready`);
  }

  /**
   * Handle pillar hover
   */
  onPillarHover(pillarId: string): void {
    this.activePillar.set(pillarId);
    console.log(`🎯 Pillar hovered: ${pillarId}`);
  }

  /**
   * Handle pillar click
   */
  onPillarClick(pillarId: string): void {
    this.activePillar.set(pillarId);
    console.log(`🔘 Pillar clicked: ${pillarId}`);
  }

  /**
   * Handle pillar 3D element ready
   */
  onPillarReady(pillarId: string, element: HybridElement3D): void {
    this.elementsCreated.update(count => count + 1);
    console.log(`✨ Pillar 3D element ready: ${pillarId}`, element);
  }

  /**
   * Handle hero element ready
   */
  onHeroReady(element: HybridElement3D): void {
    this.elementsCreated.update(count => count + 1);
    console.log('✨ Hero element ready', element);
  }

  /**
   * Handle element activation (from scene)
   */
  onElementActivated(element: HybridElement3D): void {
    // Find pillar by element ID or content
    const pillar = this.pillars.find(p =>
      element.domElement?.textContent?.includes(p.title)
    );

    if (pillar) {
      this.activePillar.set(pillar.id);
    }

    console.log('🎯 Element activated:', element);
  }

  /**
   * Toggle debug information display
   */
  toggleDebugInfo(): void {
    this.showDebugInfo.update(show => !show);
  }

  /**
   * Reset the scene to default state
   */
  resetScene(): void {
    this.activePillar.set(null);
    console.log('🔄 Scene reset');

    // Could trigger scene reset through service
    // this.hybridService.resetScene('platform-pillars-hybrid');
  }

  /**
   * Randomize element positions for demonstration
   */
  randomizePositions(): void {
    console.log('🎲 Randomizing positions...');

    // This would be implemented by updating the scene layout
    // through the HybridSceneComponent
    // Example: this.sceneComponent.updateLayout({ type: 'orbital' });
  }

  /**
   * Get pillar data by ID
   */
  getPillar(id: string) {
    return this.pillars.find(p => p.id === id);
  }

  /**
   * Example of programmatic interaction
   */
  focusOnPillar(pillarId: string): void {
    this.activePillar.set(pillarId);
    // Could also trigger 3D focus animation through service
  }

  // Map numeric enum value to string literal union expected by Card3DComponent
  priorityKey(p: ContentPriority): 'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'DECORATIVE' {
    switch (p) {
      case ContentPriority.HERO: return 'HERO';
      case ContentPriority.PRIMARY: return 'PRIMARY';
      case ContentPriority.SECONDARY: return 'SECONDARY';
      case ContentPriority.TERTIARY: return 'TERTIARY';
      default: return 'DECORATIVE';
    }
  }
}
