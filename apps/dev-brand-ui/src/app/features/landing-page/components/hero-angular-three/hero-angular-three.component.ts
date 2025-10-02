import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Use existing Angular Three components
import {
  HybridSceneComponent,
  Card3DComponent,
  HybridElement3DComponent
} from '../../../../core/angular-3d/components';

// Use existing Angular Three services
import {
  AnimationService,
  ContentTexturePipelineService
} from '../../../../core/angular-3d/services';


import * as THREE from 'three';

interface HeroFeature {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  color: string;
  position: [number, number, number];
}

interface HeroConfig {
  features: HeroFeature[];
  autoStart: boolean;
  enableControls: boolean;
  theme: 'dark' | 'light';
  shadows: boolean;
  antialias: boolean;
  alpha: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
  enableAnimation: boolean;
  performanceTarget: 'mobile' | 'desktop' | 'high-end';
}

@Component({
  selector: 'app-hero-angular-three',
  standalone: true,
  imports: [
    CommonModule,
    HybridSceneComponent,
    Card3DComponent,
    HybridElement3DComponent
  ],
  template: `
    <div class="hero-angular-three-container">
      <!-- Use existing HybridSceneComponent as base -->
      <app-hybrid-scene
        [sceneId]="'hero-scene'"
        [config]="sceneConfig()"
        [enablePerformanceOverlay]="showPerformanceOverlay()"
        [backgroundColor]="'#0a0a0a'"
        [cameraPosition]="cameraPosition()"
        [cameraTarget]="cameraTarget()"
        [enableShadows]="true"
        [antialias]="true"
        [enableAnimation]="true"
        [performanceTarget]="'desktop'"
        (sceneInitialized)="onSceneInitialized($event)"
        (elementAdded)="onElementAdded($event)"
        (animationEvent)="onAnimationEvent($event)"
        class="hero-scene">

        <!-- Hero Text Content using Card3DComponent -->
        <app-card3d
          *ngIf="showHeroText()"
          [position]="heroTextPosition()"
          [enableInteraction]="true"
          [animateOnHover]="true"
          [showDecoration]="true"
          [priority]="'HERO'"
          class="hero-text-card">
          <div class="hero-text-content">
            <h1 class="hero-title">
              <span class="title-line">Transform Your Business</span>
              <span class="title-line highlight">with AI-Powered SaaS</span>
            </h1>

            <p class="hero-description">
              Experience the next generation of business automation with our
              cutting-edge AI platform. Streamline operations, boost productivity,
              and unlock intelligent insights.
            </p>

            <div class="hero-actions">
              <button
                class="cta-button primary"
                (click)="handleGetStarted()">
                🚀 Get Started
              </button>

              <button
                class="cta-button secondary"
                (click)="handleWatchDemo()">
                ▶️ Watch Demo
              </button>
            </div>
          </div>
        </app-card3d>

        <!-- Feature Cards using Card3DComponent -->
        <app-card3d
          *ngFor="let feature of visibleFeatures(); trackBy: trackFeature"
          [position]="feature.position"
          [enableInteraction]="true"
          [animateOnHover]="true"
          [showDecoration]="true"
          [priority]="'PRIMARY'"
          [attr.data-feature]="feature.id"
          (clicked)="selectFeatureFromEvent(feature.id, $event)"
          class="feature-card">
          <div class="feature-content" [style.border-color]="feature.color">
            <h3 [style.color]="feature.color">{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <ul class="feature-benefits">
              <li *ngFor="let benefit of feature.benefits">{{ benefit }}</li>
            </ul>
          </div>
        </app-card3d>

        <!-- Controls using HybridElement3DComponent -->
        <app-hybrid-element-3d
          *ngIf="showControls()"
          [position]="controlsPosition()"
          [config]="controlsElementConfig()"
          [content]="'Hero Controls Panel'"
          class="hero-controls">
          <div class="controls-panel">
            <div class="controls-header">
              <h4>Scene Controls</h4>
              <button
                class="close-controls"
                (click)="hideControls()"
                aria-label="Close controls">
                ✕
              </button>
            </div>

            <div class="controls-content">
              <div class="control-group">
                <label>
                  <input
                    type="checkbox"
                    [checked]="autoRotateCamera()"
                    (change)="toggleCameraRotation()">
                  Auto Rotate Camera
                </label>
              </div>

              <div class="control-group">
                <label>
                  <input
                    type="checkbox"
                    [checked]="showPerformanceOverlay()"
                    (change)="togglePerformanceOverlay()">
                  Show Performance
                </label>
              </div>

              <div class="control-group">
                <label for="featureSelect">Highlight Feature:</label>
                <select
                  id="featureSelect"
                  [value]="selectedFeatureId()"
                  (change)="onFeatureSelection($event)">
                  <option value="">None</option>
                  <option
                    *ngFor="let feature of config().features"
                    [value]="feature.id">
                    {{ feature.title }}
                  </option>
                </select>
              </div>

              <div class="control-group">
                <button
                  class="control-button"
                  (click)="resetCameraView()"
                  title="Reset camera to default position">
                  🔄 Reset Camera
                </button>

                <button
                  class="control-button"
                  (click)="playEntranceAnimation()"
                  title="Replay entrance animation">
                  ▶️ Play Entrance
                </button>
              </div>
            </div>
          </div>
        </app-hybrid-element-3d>

        <!-- Loading State -->
        <div class="loading-overlay" *ngIf="isLoading()">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text">{{ loadingMessage() }}</p>
          </div>
        </div>

      </app-hybrid-scene>

      <!-- Toggle Controls Button -->
      <button
        class="controls-toggle"
        (click)="toggleControls()"
        [attr.aria-label]="showControls() ? 'Hide Controls' : 'Show Controls'"
        [title]="showControls() ? 'Hide Controls' : 'Show Controls'">
        {{ showControls() ? '✕' : '⚙️' }}
      </button>

    </div>
  `,
  styles: [`
    .hero-angular-three-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    .hero-scene {
      width: 100%;
      height: 100%;
    }

    /* Hero Text Content Styles */
    .hero-text-content {
      padding: 40px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(15px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      max-width: 600px;
      opacity: 0;
      transform: translateY(50px) scale(0.95);
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .hero-text-card.loaded .hero-text-content {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .hero-title {
      margin: 0 0 24px 0;
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      color: #fff;
    }

    .title-line {
      display: block;
    }

    .title-line.highlight {
      background: linear-gradient(135deg, #4a90e2, #7b68ee);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-description {
      margin: 0 0 32px 0;
      font-size: 18px;
      line-height: 1.6;
      color: #ccc;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .cta-button {
      padding: 16px 32px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cta-button.primary {
      background: linear-gradient(135deg, #4a90e2, #7b68ee);
      color: #fff;
      box-shadow: 0 8px 24px rgba(74, 144, 226, 0.4);
    }

    .cta-button.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(74, 144, 226, 0.6);
    }

    .cta-button.secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .cta-button.secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-2px);
    }

    /* Feature Card Styles */
    .feature-content {
      padding: 32px;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(15px);
      border-radius: 16px;
      border: 2px solid rgba(74, 144, 226, 0.3);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      max-width: 350px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(30px) rotateY(-15deg);
    }

    .feature-content:hover {
      transform: scale(1.02) translateY(-5px);
      border-color: rgba(74, 144, 226, 0.8);
      box-shadow: 0 30px 60px rgba(74, 144, 226, 0.3);
    }

    .feature-card.loaded .feature-content {
      opacity: 1;
      transform: translateY(0) rotateY(0);
    }

    .feature-content h3 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .feature-content p {
      margin: 0 0 20px 0;
      color: #ccc;
      line-height: 1.5;
    }

    .feature-benefits {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .feature-benefits li {
      color: #fff;
      padding: 8px 0;
      position: relative;
      padding-left: 24px;
    }

    .feature-benefits li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #4ecdc4;
      font-weight: bold;
    }

    /* Controls Styles */
    .controls-panel {
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(15px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      min-width: 280px;
      color: #fff;
    }

    .controls-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .controls-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .close-controls {
      background: none;
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .close-controls:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .controls-content {
      padding: 20px;
    }

    .control-group {
      margin-bottom: 20px;
    }

    .control-group:last-child {
      margin-bottom: 0;
    }

    .control-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .control-group select {
      width: 100%;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-size: 14px;
    }

    .control-button {
      width: 100%;
      padding: 10px 16px;
      margin: 8px 0;
      border: 1px solid rgba(74, 144, 226, 0.5);
      border-radius: 6px;
      background: rgba(74, 144, 226, 0.1);
      color: #4a90e2;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .control-button:hover {
      background: rgba(74, 144, 226, 0.2);
      border-color: #4a90e2;
    }

    .controls-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid rgba(74, 144, 226, 0.8);
      background: rgba(0, 0, 0, 0.9);
      color: #4a90e2;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
    }

    .controls-toggle:hover {
      background: rgba(74, 144, 226, 0.1);
      border-color: #4a90e2;
      transform: scale(1.05);
    }

    /* Loading Styles */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-content {
      text-align: center;
      color: #fff;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 3px solid rgba(74, 144, 226, 0.3);
      border-top: 3px solid #4a90e2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 18px;
      color: #ccc;
      margin: 0;
    }

    /* Keyframe Animations for enhanced effects */
    @keyframes heroGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(74, 144, 226, 0.3); }
      50% { box-shadow: 0 0 40px rgba(74, 144, 226, 0.6); }
    }

    @keyframes featureFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    @keyframes textShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .hero-text-content:hover {
      animation: heroGlow 2s ease-in-out infinite;
    }

    .feature-content:not(:hover) {
      animation: featureFloat 3s ease-in-out infinite;
    }

    .title-line.highlight {
      background-size: 200% 100%;
      animation: textShimmer 3s ease-in-out infinite;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero-text-content {
        padding: 24px;
      }

      .hero-title {
        font-size: 32px;
      }

      .hero-description {
        font-size: 16px;
      }

      .cta-button {
        padding: 14px 28px;
        font-size: 15px;
      }

      .feature-content {
        padding: 24px;
        max-width: 300px;
      }

      .controls-panel {
        min-width: 250px;
      }

      .controls-toggle {
        top: 15px;
        right: 15px;
        width: 45px;
        height: 45px;
        font-size: 18px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroAngularThreeComponent implements OnInit {
  // Injected services - use existing Angular Three services
  private readonly animationService = inject(AnimationService);
  private readonly contentTexturePipeline = inject(ContentTexturePipelineService);

  // Input configuration
  readonly config = input<Partial<HeroConfig>>({
    features: [
      {
        id: 'ai-automation',
        title: 'AI Automation',
        description: 'Streamline workflows with intelligent automation.',
        benefits: ['Reduce manual tasks by 80%', 'Smart process optimization', 'Seamless integration'],
        color: '#4a90e2',
        position: [4, 2, 0]
      },
      {
        id: 'data-analytics',
        title: 'Data Analytics',
        description: 'Transform data into actionable insights.',
        benefits: ['Predictive analytics', 'Real-time dashboards', 'Custom reporting'],
        color: '#7b68ee',
        position: [4, -1, 0]
      },
      {
        id: 'cloud-integration',
        title: 'Cloud Integration',
        description: 'Seamless multi-cloud connectivity.',
        benefits: ['Multi-cloud support', 'Secure data transfer', 'Scalable infrastructure'],
        color: '#4ecdc4',
        position: [4, -4, 0]
      }
    ],
    autoStart: true,
    enableControls: true,
    theme: 'dark',
    shadows: true,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    enableAnimation: true,
    performanceTarget: 'desktop'
  });

  readonly autoStart = input(true);
  readonly enableControls = input(true);

  // Output events
  readonly featureSelected = output<string>();
  readonly getStarted = output<void>();
  readonly watchDemo = output<void>();

  // Component state
  private readonly _isLoading = signal(true);
  private readonly _loadingMessage = signal('Initializing Hero Scene...');
  private readonly _showControls = signal(false);
  private readonly _showPerformanceOverlay = signal(false);
  private readonly _selectedFeatureId = signal<string>('');
  private readonly _autoRotateCamera = signal(false);
  private readonly _showHeroText = signal(true);

  // Computed properties
  readonly isLoading = computed(() => this._isLoading());
  readonly loadingMessage = computed(() => this._loadingMessage());
  readonly showControls = computed(() => this._showControls());
  readonly showPerformanceOverlay = computed(() => this._showPerformanceOverlay());
  readonly selectedFeatureId = computed(() => this._selectedFeatureId());
  readonly autoRotateCamera = computed(() => this._autoRotateCamera());
  readonly showHeroText = computed(() => this._showHeroText());

  readonly sceneConfig = computed(() => ({
    shadows: this.config().shadows ?? true,
    antialias: this.config().antialias ?? true,
    alpha: this.config().alpha ?? true,
    powerPreference: this.config().powerPreference ?? 'high-performance',
    enableAnimation: this.config().enableAnimation ?? true,
    performanceTarget: this.config().performanceTarget ?? 'desktop'
  }));

  readonly cameraPosition = computed((): [number, number, number] => [0, 0, 8]);
  readonly cameraTarget = computed((): [number, number, number] => [0, 0, 0]);

  readonly heroTextPosition = computed((): [number, number, number] => [-4, 1, 0]);
  readonly heroTextScale = computed((): [number, number, number] => [1, 1, 1]);
  readonly featureCardScale = computed((): [number, number, number] => [1, 1, 1]);
  readonly controlsPosition = computed((): [number, number, number] => [6, 3, 0]);

  readonly controlsElementConfig = computed(() => ({
    width: 300,
    height: 400,
    interactive: true,
    type: 'interactive' as const
  }));

  readonly visibleFeatures = computed(() => {
    const allFeatures = this.config().features || [];
    const selectedId = this.selectedFeatureId();

    if (selectedId) {
      return allFeatures.filter(f => f.id === selectedId);
    }
    return allFeatures;
  });

  async ngOnInit(): Promise<void> {
    this._loadingMessage.set('Initializing Angular Three services...');

    // The HybridSceneComponent will handle the actual initialization
    // We just need to wait for it to be ready
    setTimeout(() => {
      this._loadingMessage.set('Setting up hero content...');
    }, 500);

    setTimeout(() => {
      this._isLoading.set(false);
      if (this.autoStart()) {
        this.playEntranceAnimation();
      }
    }, 1000);
  }

  // Event handlers
  onSceneInitialized(scene: THREE.Scene): void {
    console.log('Hero scene initialized:', scene);
    this.setupHeroContent(scene);
  }

  onElementAdded(event: { elementId: string; object: THREE.Object3D }): void {
    console.log('Hero element added:', event.elementId);
  }

  onAnimationEvent(event: { type: string; data: any }): void {
    console.log('Hero animation event:', event.type, event.data);
  }

  // Action handlers
  handleGetStarted(): void {
    this.getStarted.emit();
  }

  handleWatchDemo(): void {
    this.watchDemo.emit();
  }

  // Feature management
  selectFeature(featureId: string): void {
    this._selectedFeatureId.set(featureId);
    this.featureSelected.emit(featureId);

    // Trigger feature highlight animation using existing AnimationService
    this.animateFeatureHighlight(featureId);
  }

  onFeatureSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectFeature(target.value);
  }

  trackFeature(index: number, feature: HeroFeature): string {
    return feature.id;
  }

  selectFeatureFromEvent(featureId: string, event: MouseEvent): void {
    event.preventDefault();
    this.selectFeature(featureId);
  }

  // Control methods
  toggleControls(): void {
    this._showControls.update(show => !show);
  }

  hideControls(): void {
    this._showControls.set(false);
  }

  togglePerformanceOverlay(): void {
    this._showPerformanceOverlay.update(show => !show);
  }

  toggleCameraRotation(): void {
    this._autoRotateCamera.update(rotate => !rotate);
    // Implementation would use existing AnimationService
    if (this.autoRotateCamera()) {
      this.startCameraRotation();
    } else {
      this.stopCameraRotation();
    }
  }

  resetCameraView(): void {
    // Use existing HybridSceneComponent's resetCamera method
    this.animationService.animateCamera({
      position: this.cameraPosition(),
      target: this.cameraTarget(),
      duration: 1500
    });
  }

  playEntranceAnimation(): void {
    // Use existing AnimationService for entrance animations with GSAP
    const heroTextCard = document.querySelector('.hero-text-card');
    const featureCards = document.querySelectorAll('.feature-card');

    if (heroTextCard) {
      // Add loaded class for CSS transitions
      heroTextCard.classList.add('loaded');

      // Animate hero text entrance with GSAP
      this.animationService.animate({
        element: heroTextCard as HTMLElement,
        properties: {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationX: 0
        },
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.3,
        from: {
          opacity: 0,
          y: 50,
          scale: 0.95,
          rotationX: 10
        }
      });
    }

    // Animate feature cards with staggered entrance
    featureCards.forEach((card, index) => {
      // Add loaded class for CSS transitions
      card.classList.add('loaded');

      this.animationService.animate({
        element: card as HTMLElement,
        properties: {
          opacity: 1,
          y: 0,
          rotationY: 0,
          scale: 1
        },
        duration: 0.8,
        ease: 'back.out(1.7)',
        delay: 0.6 + (index * 0.2),
        from: {
          opacity: 0,
          y: 30,
          rotationY: -15,
          scale: 0.9
        }
      });
    });

    // Add subtle floating animation to feature cards after entrance
    setTimeout(() => {
      featureCards.forEach((card, index) => {
        this.animationService.animate({
          element: card as HTMLElement,
          properties: {
            y: '-5px'
          },
          duration: 2 + (index * 0.3),
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 2
        });
      });
    }, 2000);
  }

  // Private methods
  private setupHeroContent(scene: THREE.Scene): void {
    // Use existing ContentTexturePipelineService for DOM-to-texture conversion
    this.createTextTextures();

    // Setup ambient lighting
    this.setupLighting(scene);

    // Setup background elements
    this.setupBackground(scene);
  }

  private createTextTextures(): void {
    // Use existing ContentTexturePipelineService
    this.contentTexturePipeline.convertDOMToTexture('.hero-text-content', {
      width: 512,
      height: 256,
      scale: 2
    });
  }

  private setupLighting(scene: THREE.Scene): void {
    // Add ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
  }

  private setupBackground(scene: THREE.Scene): void {
    // Add some floating geometric shapes for visual interest
    const geometries = [
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0)
    ];

    const materials = [
      new THREE.MeshPhongMaterial({ color: 0x4a90e2, transparent: true, opacity: 0.1 }),
      new THREE.MeshPhongMaterial({ color: 0x7b68ee, transparent: true, opacity: 0.1 }),
      new THREE.MeshPhongMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.1 })
    ];

    for (let i = 0; i < 10; i++) {
      const geometry = geometries[i % geometries.length];
      const material = materials[i % materials.length];
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );

      const scale = Math.random() * 2 + 1;
      mesh.scale.set(scale, scale, scale);

      scene.add(mesh);
    }
  }

  private animateFeatureHighlight(featureId: string): void {
    // Use existing AnimationService for feature highlighting with GSAP
    const featureCard = document.querySelector(`[data-feature="${featureId}"]`);

    if (featureCard) {
      // Highlight selected feature with glow effect
      this.animationService.animate({
        element: featureCard as HTMLElement,
        properties: {
          scale: 1.05,
          boxShadow: '0 25px 50px rgba(74, 144, 226, 0.4)',
          borderColor: 'rgba(74, 144, 226, 0.8)'
        },
        duration: 0.5,
        ease: 'power2.out'
      });

      // Pulse animation for emphasis
      this.animationService.animate({
        element: featureCard as HTMLElement,
        properties: {
          scale: 1.08
        },
        duration: 0.3,
        ease: 'sine.inOut',
        repeat: 2,
        yoyo: true,
        delay: 0.5
      });
    }

    // Fade other feature cards to emphasize selection
    const allFeatureCards = document.querySelectorAll('.feature-card');
    allFeatureCards.forEach((card) => {
      if (card !== featureCard) {
        this.animationService.animate({
          element: card as HTMLElement,
          properties: {
            opacity: 0.5,
            scale: 0.95
          },
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    });
  }

  private startCameraRotation(): void {
    // Use existing AnimationService for smooth camera rotation with GSAP
    const sceneElement = document.querySelector('.hero-scene');

    if (sceneElement) {
      // Animate camera rotation around the scene
      this.animationService.animate({
        element: sceneElement as HTMLElement,
        properties: {
          rotationY: 360
        },
        duration: 20,
        ease: 'none',
        repeat: -1
      });
    }
  }

  private stopCameraRotation(): void {
    // Stop camera rotation animation
    const sceneElement = document.querySelector('.hero-scene');

    if (sceneElement) {
      this.animationService.kill(sceneElement as HTMLElement);
    }
  }
}
