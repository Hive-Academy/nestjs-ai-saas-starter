import {
  Component,
  OnInit,
  OnDestroy,
  ViewContainerRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import {
  ThreeIntegrationService,
  SceneInstance,
} from '../../core/services/three-integration.service';
import { AgentCommunicationService } from '../../core/services/agent-communication.service';
import { AgentVisualizerService } from './services/agent-visualizer.service';
import { ConstellationLayoutService } from './services/constellation-layout.service';
import {
  SpatialNavigationService,
  SpatialNavigationConfig,
} from './services/spatial-navigation.service';
import {
  AgentInteractionService,
  AgentInteractionConfig,
} from './services/agent-interaction.service';
import {
  AgentStateVisualizerService,
  VisualEffectConfig,
} from './services/agent-state-visualizer.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { Performance3DService } from './services/performance-3d.service';
import {
  NavigationControlsComponent,
  NavigationControlsConfig,
} from './components/navigation-controls.component';
import {
  AgentTooltipComponent,
  TooltipConfig,
} from './components/agent-tooltip.component';
import { AgentState } from '../../core/interfaces/agent-state.interface';

/**
 * Spatial Interface Component
 * Main container for the 3D Agent Constellation visualization
 * Integrates Three.js scene with real-time agent state management
 */
@Component({
  selector: 'brand-spatial-interface',
  standalone: true,
  imports: [CommonModule, NavigationControlsComponent, AgentTooltipComponent],
  template: `
    <div class="spatial-interface" #containerRef>
      <!-- 3D Scene Container -->
      <div class="scene-container" #sceneContainer></div>

      <!-- UI Overlay -->
      <div class="ui-overlay">
        <!-- Agent Information Panel -->
        <div
          class="agent-info-panel"
          *ngIf="selectedAgent() as selectedAgentData"
        >
          <h3>{{ selectedAgentData.agent.name }}</h3>
          <div class="agent-details">
            <p><strong>Type:</strong> {{ selectedAgentData.agent.type }}</p>
            <p><strong>Status:</strong> {{ selectedAgentData.agent.status }}</p>
            <p>
              <strong>Capabilities:</strong>
              {{ selectedAgentData.agent.capabilities.join(', ') }}
            </p>
            <div
              class="agent-tools"
              *ngIf="selectedAgentData.agent.currentTools.length"
            >
              <strong>Active Tools:</strong>
              <ul>
                <li *ngFor="let tool of selectedAgentData.agent.currentTools">
                  {{ tool.toolName }} ({{ tool.status }})
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Constellation Stats -->
        <div class="constellation-stats">
          <div class="stat-item">
            <span class="stat-label">Agents:</span>
            <span class="stat-value">{{ agentCount() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">FPS:</span>
            <span
              class="stat-value"
              [class.warning]="performanceMetrics().frameRate < 45"
              [class.error]="performanceMetrics().frameRate < 30"
            >
              {{ performanceMetrics().frameRate }}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Effects:</span>
            <span class="stat-value">{{
              performanceMetrics().activeEffects
            }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Connected:</span>
            <span class="stat-value" [class.connected]="isConnected()">
              {{ isConnected() ? 'Yes' : 'No' }}
            </span>
          </div>
        </div>

        <!-- Instructions -->
        <div class="instructions" *ngIf="!selectedAgent()">
          <p>🌌 <strong>Agent Constellation</strong></p>
          <p>Click on agents to interact • Mouse to orbit • Scroll to zoom</p>
          <p *ngIf="agentCount() === 0">
            Waiting for agents to join the constellation...
          </p>
        </div>

        <!-- Enhanced Navigation Controls -->
        <brand-navigation-controls
          [config]="navigationControlsConfig()"
          (focusRequested)="onFocusRequested($event)"
          (resetRequested)="onResetRequested()"
        >
        </brand-navigation-controls>

        <!-- Enhanced Agent Tooltip -->
        <brand-agent-tooltip
          [tooltipData]="currentTooltip()"
          [config]="tooltipConfig()"
          (focusAgent)="onTooltipFocusAgent($event)"
          (startChat)="onTooltipStartChat($event)"
        >
        </brand-agent-tooltip>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="!isSceneReady()">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>Initializing 3D Constellation...</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .spatial-interface {
        position: relative;
        width: 100%;
        height: 100vh;
        background: radial-gradient(
          ellipse at center,
          #1a1a2e 0%,
          #0a0a0a 100%
        );
        overflow: hidden;
      }

      .scene-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
      }

      .ui-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      }

      .agent-info-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 8px;
        padding: 16px;
        color: white;
        min-width: 280px;
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .agent-info-panel h3 {
        margin: 0 0 12px 0;
        color: #3b82f6;
        font-size: 1.2em;
      }

      .agent-details p {
        margin: 4px 0;
        font-size: 0.9em;
      }

      .agent-tools {
        margin-top: 12px;
      }

      .agent-tools ul {
        margin: 4px 0;
        padding-left: 16px;
      }

      .agent-tools li {
        font-size: 0.85em;
        margin: 2px 0;
      }

      .constellation-stats {
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 12px;
        color: white;
        font-family: monospace;
        font-size: 0.85em;
        backdrop-filter: blur(5px);
        pointer-events: auto;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        margin: 4px 0;
        min-width: 120px;
      }

      .stat-label {
        color: #999;
      }

      .stat-value {
        color: #fff;
        font-weight: bold;
      }

      .stat-value.connected {
        color: #10b981;
      }

      .stat-value.warning {
        color: #ffaa00;
      }

      .stat-value.error {
        color: #ff4444;
      }

      .instructions {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9em;
        pointer-events: auto;
      }

      .instructions p {
        margin: 4px 0;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
      }

      .loading-content {
        text-align: center;
        color: white;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(59, 130, 246, 0.3);
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .agent-info-panel {
          top: 10px;
          right: 10px;
          left: 10px;
          min-width: auto;
          max-width: none;
        }

        .constellation-stats {
          top: 10px;
          left: 10px;
          font-size: 0.8em;
        }

        .instructions {
          bottom: 20px;
          left: 20px;
          right: 20px;
          transform: none;
          font-size: 0.85em;
        }
      }
    `,
  ],
})
export class SpatialInterfaceComponent implements OnInit, OnDestroy {
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly agentCommunication = inject(AgentCommunicationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly agentVisualizer = inject(AgentVisualizerService);
  private readonly constellationLayout = inject(ConstellationLayoutService);
  private readonly spatialNavigation = inject(SpatialNavigationService);
  private readonly agentInteraction = inject(AgentInteractionService);
  private readonly agentStateVisualizer = inject(AgentStateVisualizerService);
  private readonly performanceMonitor = inject(PerformanceMonitorService);
  private readonly performance3D = inject(Performance3DService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  // Template references
  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  // Scene management
  private readonly sceneId = 'spatial-constellation';
  private sceneInstance: SceneInstance | null = null;
  private controls: any = null; // Will be OrbitControls

  // Component state
  readonly isSceneReady = signal(false);
  readonly frameRate = signal(60);

  // Public reactive state
  readonly selectedAgent = this.agentVisualizer.selectedAgent;
  readonly agentCount = this.agentVisualizer.agentCount;
  readonly isConnected = this.agentCommunication.isConnected;
  readonly isNavigating = this.spatialNavigation.isNavigating;
  readonly currentTooltip = this.agentInteraction.tooltipData;
  readonly visualEffectsActive = this.agentStateVisualizer.visualEffectsActive;
  readonly performanceMetrics = this.performanceMonitor.performanceMetrics;

  // Navigation controls configuration
  readonly navigationControlsConfig = signal<NavigationControlsConfig>({
    showZoomControls: true,
    showResetButton: true,
    showKeyboardHints: true,
    showTouchHints: true,
    position: 'bottom-right',
  });

  // Tooltip configuration
  readonly tooltipConfig = signal<TooltipConfig>({
    showCapabilities: true,
    showStatus: true,
    showTools: true,
    showPerformance: true,
    showRecentActivity: true,
    maxWidth: 320,
    maxHeight: 400,
    fadeInDuration: 200,
    fadeOutDuration: 150,
    followCursor: false,
    offset: { x: 15, y: -10 },
  });

  constructor() {
    // Monitor performance metrics
    effect(() => {
      const performance = this.threeService.performance();
      this.frameRate.set(Math.round(performance.frameRate));
    });
  }

  ngOnInit(): void {
    this.initializeScene();
    this.setupAgentCommunication();
  }

  ngOnDestroy(): void {
    this.cleanupScene();
  }

  /**
   * Initialize the 3D scene and constellation
   */
  private async initializeScene(): Promise<void> {
    try {
      // Create Three.js scene
      this.sceneInstance = this.threeService.createScene(
        this.sceneId,
        this.sceneContainer.nativeElement,
        {
          backgroundColor: 0x0a0a0a,
          enableShadows: true,
          cameraFov: 75,
          cameraNear: 0.1,
          cameraFar: 1000,
        }
      );

      if (!this.sceneInstance) {
        throw new Error('Failed to create 3D scene');
      }

      // Setup camera position for constellation view
      this.sceneInstance.camera.position.set(0, 5, 15);
      this.sceneInstance.camera.lookAt(0, 0, 0);

      // Add constellation lighting
      this.setupConstellationLighting();

      // Setup camera controls (OrbitControls will be added later)
      await this.setupCameraControls();

      // Initialize enhanced spatial navigation
      this.initializeSpatialNavigation();

      // Initialize enhanced agent interaction
      this.initializeAgentInteraction();

      // Initialize constellation layout system
      this.constellationLayout.initialize({
        centerRadius: 2.0,
        orbitalRadius: 6.0,
        verticalSpread: 3.0,
        coordinatorCenter: true,
        animationDuration: 2000,
        collisionAvoidance: true,
        hierarchicalLayout: true,
      });

      // Initialize agent visualizer
      this.agentVisualizer.initialize({
        sceneId: this.sceneId,
        viewContainerRef: this.viewContainerRef,
        enableInteraction: true,
        enableAnimation: true,
        defaultAgentConfig: {
          glowIntensity: 0.6,
          animationSpeed: 1.0,
        },
      });

      // Initialize visual effects system
      this.initializeVisualEffects();

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // Initialize advanced 3D performance optimization
      this.performance3D.initialize(this.sceneId, 60);

      // Start render loop with animation updates
      this.threeService.activateScene(this.sceneId, () => {
        this.updateAnimations();
      });

      this.isSceneReady.set(true);
      console.log('Spatial interface initialized successfully');
    } catch (error) {
      console.error('Failed to initialize spatial interface:', error);
    }
  }

  /**
   * Setup lighting optimized for agent constellation
   */
  private setupConstellationLighting(): void {
    if (!this.sceneInstance) return;

    const scene = this.sceneInstance.scene;

    // Clear default lighting
    const lightsToRemove = scene.children.filter(
      (child) => child instanceof THREE.Light
    );
    lightsToRemove.forEach((light) => scene.remove(light));

    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    scene.add(ambientLight);

    // Key light for dramatic effect
    const keyLight = new THREE.DirectionalLight(0x4080ff, 0.8);
    keyLight.position.set(10, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x8040ff, 0.3);
    fillLight.position.set(-5, 3, -10);
    scene.add(fillLight);

    // Rim light for agent silhouettes
    const rimLight = new THREE.DirectionalLight(0xff8040, 0.2);
    rimLight.position.set(0, -5, 10);
    scene.add(rimLight);

    // Add subtle point lights for depth
    const pointLight1 = new THREE.PointLight(0x4080ff, 0.5, 20);
    pointLight1.position.set(8, 0, 8);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8040ff, 0.3, 15);
    pointLight2.position.set(-8, 3, -5);
    scene.add(pointLight2);
  }

  /**
   * Setup camera controls for constellation navigation
   */
  private async setupCameraControls(): Promise<void> {
    if (!this.sceneInstance) return;

    try {
      // Dynamically import OrbitControls to avoid bundle size issues
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      );

      this.controls = new OrbitControls(
        this.sceneInstance.camera,
        this.sceneInstance.renderer.domElement
      );

      // Configure controls for constellation viewing
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;

      // Limit zoom and distance
      this.controls.minDistance = 5;
      this.controls.maxDistance = 50;

      // Limit vertical rotation
      this.controls.maxPolarAngle = Math.PI;
      this.controls.minPolarAngle = 0;

      // Set target to constellation center
      this.controls.target.set(0, 0, 0);
      this.controls.update();

      console.log('Camera controls initialized');
    } catch (error) {
      console.error('Failed to setup camera controls:', error);
    }
  }

  /**
   * Setup agent communication and real-time updates
   */
  private setupAgentCommunication(): void {
    console.log('🔌 Setting up TASK_API_001 DevBrand backend connection...');

    // Connect to real TASK_API_001 agent system
    this.agentCommunication.connect();

    // Add connection error handling
    this.monitorBackendConnectivity();

    // Log connection status
    setInterval(() => {
      console.log(
        '📡 Connection status:',
        this.agentCommunication.isConnected()
      );
    }, 2000);

    // Handle existing agents
    const existingAgents = this.agentCommunication.availableAgents();
    console.log('👥 Existing agents found:', existingAgents.length);
    existingAgents.forEach((agent) => {
      console.log('🤖 Adding agent to visualization:', agent.name);
      this.agentVisualizer.visualizeAgent(agent);
    });

    // Subscribe to real TASK_API_001 agent updates
    this.agentCommunication.agentUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (agent: AgentState) => {
          console.log(
            '🔄 Real TASK_API_001 agent update received:',
            agent.name,
            agent.status
          );
          this.agentVisualizer.visualizeAgent(agent);
        },
        error: (error) => {
          console.error('❌ Error in agent updates stream:', error);
          this.handleBackendError('Agent updates stream error', error);
        },
      });

    // Subscribe to real memory updates from ChromaDB/Neo4j
    this.agentCommunication.memoryUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contexts) => {
          console.log(
            '🧠 Real memory update from TASK_API_001:',
            contexts.length,
            'contexts'
          );
        },
        error: (error) => {
          console.error('❌ Error in memory updates stream:', error);
          this.handleBackendError('Memory updates stream error', error);
        },
      });

    // Subscribe to real tool executions
    this.agentCommunication.toolExecutions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (execution) => {
          console.log(
            '🔧 Real tool execution from TASK_API_001:',
            execution.toolName,
            execution.status
          );
        },
        error: (error) => {
          console.error('❌ Error in tool execution stream:', error);
          this.handleBackendError('Tool execution stream error', error);
        },
      });
  }

  /**
   * Monitor TASK_API_001 backend connectivity
   */
  private monitorBackendConnectivity(): void {
    // Monitor connection status changes
    setInterval(() => {
      const isConnected = this.agentCommunication.isConnected();
      console.log(
        '📡 TASK_API_001 connection status:',
        isConnected ? 'CONNECTED' : 'DISCONNECTED'
      );

      if (!isConnected) {
        console.warn(
          '⚠️ TASK_API_001 backend disconnected - attempting to reconnect...'
        );
        // Optionally show user notification
        this.showConnectionWarning();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Handle TASK_API_001 backend errors
   */
  private handleBackendError(context: string, error: any): void {
    console.error(`❌ TASK_API_001 Backend Error [${context}]:`, error);

    // Show user-friendly error message
    this.showBackendErrorNotification(context, error);

    // Attempt recovery actions
    setTimeout(() => {
      console.log('🔄 Attempting to recover TASK_API_001 connection...');
      this.agentCommunication.connect();
    }, 3000);
  }

  /**
   * Show connection warning to user
   */
  private showConnectionWarning(): void {
    // This could be enhanced with a proper notification system
    if (typeof window !== 'undefined' && window.console) {
      console.warn(
        '⚠️ Connection to TASK_API_001 DevBrand backend lost. Real-time updates may be delayed.'
      );
    }
  }

  /**
   * Show backend error notification
   */
  private showBackendErrorNotification(context: string, error: any): void {
    // This could be enhanced with a proper toast/notification system
    const errorMessage = error?.message || 'Unknown error';
    console.error(`🚨 Backend Error: ${context} - ${errorMessage}`);

    // For now, log to console. In production, this would show a user notification
    if (typeof window !== 'undefined' && window.console) {
      console.error(
        `TASK_API_001 Backend Error in ${context}: ${errorMessage}`
      );
    }
  }

  /**
   * Update animations every frame
   */
  private updateAnimations(): void {
    // Update orbit controls
    if (this.controls) {
      this.controls.update();
    }

    // Update agent animations
    this.agentVisualizer.updateAnimations();

    // Update visual effects
    this.agentStateVisualizer.updateEffects(0.016); // ~60fps

    // Update performance monitoring
    this.performanceMonitor.updateMetrics(
      0.016,
      this.performanceMetrics().activeEffects
    );

    // Update 3D performance optimization
    this.performance3D.updatePerformanceMetrics(16.67); // ~60fps in milliseconds

    // Handle mouse interactions
    this.handleMouseInteractions();
  }

  /**
   * Handle mouse interactions for agent selection
   */
  private handleMouseInteractions(): void {
    if (!this.sceneInstance) return;

    const container = this.sceneInstance.container;

    // Mouse move handler
    const onMouseMove = (event: MouseEvent) => {
      this.agentVisualizer.handleMouseEvent(event, this.sceneInstance!.camera);
    };

    // Mouse click handler
    const onClick = (event: MouseEvent) => {
      this.agentVisualizer.handleMouseEvent(event, this.sceneInstance!.camera);
    };

    // Add event listeners if not already added
    if (!container.dataset['listenersAdded']) {
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('click', onClick);
      container.dataset['listenersAdded'] = 'true';
    }
  }

  /**
   * Initialize enhanced spatial navigation
   */
  private initializeSpatialNavigation(): void {
    const navigationConfig: SpatialNavigationConfig = {
      sceneId: this.sceneId,
      enableMomentum: true,
      enableKeyboardControls: true,
      enableTouchControls: true,
      enableCameraStateStorage: true,
      momentumDecay: 0.95,
      maxMoveSpeed: 2.0,
      cameraLimits: {
        minDistance: 3,
        maxDistance: 60,
        minPolarAngle: 0,
        maxPolarAngle: Math.PI,
      },
      focusTransition: {
        duration: 1.5,
        easing: 'power2.inOut',
      },
    };

    this.spatialNavigation.initialize(navigationConfig);
    console.log('Enhanced spatial navigation initialized');
  }

  /**
   * Handle focus requests from navigation controls
   */
  onFocusRequested(target: any): void {
    console.log('Focus requested on target:', target);
    // Additional integration logic can be added here
  }

  /**
   * Handle reset requests from navigation controls
   */
  onResetRequested(): void {
    console.log('Camera reset requested');
    // Clear any selection when resetting camera
    this.agentVisualizer.selectAgent(null);
  }

  /**
   * Initialize enhanced agent interaction
   */
  private initializeAgentInteraction(): void {
    const interactionConfig: AgentInteractionConfig = {
      sceneId: this.sceneId,
      enableHover: true,
      enableSelection: true,
      enableTooltips: true,
      enableDoubleClickFocus: true,
      hoverResponseTime: 100,
      selectionHighlightDuration: 300,
      tooltipDelay: 500,
    };

    this.agentInteraction.initialize(interactionConfig);
    console.log('Enhanced agent interaction initialized');
  }

  /**
   * Handle tooltip focus agent request
   */
  onTooltipFocusAgent(agentId: string): void {
    this.agentInteraction.focusOnAgent(agentId);
  }

  /**
   * Handle tooltip start chat request
   */
  onTooltipStartChat(agentId: string): void {
    this.agentInteraction.selectAgent(agentId);
    // Additional chat interface integration could be added here
    console.log(`Starting chat with agent: ${agentId}`);
  }

  /**
   * Focus camera on selected agent with double-click
   */
  focusOnSelectedAgent(): void {
    const selected = this.selectedAgent();
    if (selected) {
      const agentPosition = new THREE.Vector3(
        selected.agent.position.x,
        selected.agent.position.y,
        selected.agent.position.z || 0
      );

      const target = {
        position: agentPosition,
        target: agentPosition,
        distance: 8,
      };

      this.spatialNavigation.focusOnTarget(target);
    }
  }

  /**
   * Initialize visual effects system
   */
  private initializeVisualEffects(): void {
    const visualEffectConfig: VisualEffectConfig = {
      sceneId: this.sceneId,
      enableMemoryEffects: true,
      enableToolRings: true,
      enableCommunicationStreams: true,
      effectQuality: 'high',
      maxConcurrentEffects: 20,
    };

    this.agentStateVisualizer.initialize(visualEffectConfig);
    console.log('Visual effects system initialized');
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    this.performanceMonitor.initialize(this.sceneId);

    // Register quality adjustment callback
    this.performanceMonitor.registerQualityCallback((quality) => {
      console.log('Performance quality adjusted:', quality);
      // Notify visual effects system of quality change
      // This could update effect parameters based on performance
    });

    console.log('Performance monitoring initialized');
  }

  /**
   * Clean up scene and resources
   */
  private cleanupScene(): void {
    this.agentVisualizer.cleanup();
    this.constellationLayout.cleanup();
    this.spatialNavigation.cleanup();
    this.agentInteraction.cleanup();
    this.agentStateVisualizer.cleanup();
    this.performanceMonitor.cleanup();
    this.performance3D.dispose();

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    this.threeService.removeScene(this.sceneId);
    this.agentCommunication.disconnect();
  }
}
