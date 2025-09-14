import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  DestroyRef,
  ChangeDetectionStrategy,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, retry, of } from 'rxjs';

// Child Components
import { Scene3DComponent } from './components/scene-3d.component';
import {
  ConstellationStatsComponent,
  ConstellationStats,
} from './components/constellation-stats.component';
import {
  AgentInfoPanelComponent,
  SelectedAgentData,
} from './components/agent-info-panel.component';
import { InstructionsComponent } from './components/instructions.component';
import { LoadingOverlayComponent } from './components/loading-overlay.component';
import { ErrorBoundaryComponent } from './components/error-boundary.component';

// Existing Components
import {
  NavigationControlsComponent,
  NavigationControlsConfig,
} from './components/navigation-controls.component';
import {
  AgentTooltipComponent,
  TooltipConfig,
} from './components/agent-tooltip.component';

// Services
import { AgentCommunicationService } from '../../core/services/agent-communication.service';
import { SceneContentService } from './services/scene-content.service';
import { AgentVisualizerService } from './services/agent-visualizer.service';
import { ErrorHandlingService } from './services/error-handling.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { AgentStateVisualizerService } from './services/agent-state-visualizer.service';
import { AgentInteractionService } from './services/agent-interaction.service';
import { SceneInstance } from '../../core/services/three-integration.service';
import { AgentState } from '../../core/interfaces/agent-state.interface';

/**
 * Refactored Spatial Interface Component
 * Main container component managing child components and coordination
 * Reduced from 1000+ lines to ~200 lines through proper separation of concerns
 */
@Component({
  selector: 'brand-spatial-interface',
  imports: [
    CommonModule,
    Scene3DComponent,
    ConstellationStatsComponent,
    AgentInfoPanelComponent,
    InstructionsComponent,
    LoadingOverlayComponent,
    ErrorBoundaryComponent,
    NavigationControlsComponent,
    AgentTooltipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spatial-interface">
      <!-- Error Boundary -->
      <brand-error-boundary [error]="currentError()" (retry)="onRetryError()" />

      <!-- 3D Scene -->
      @if (!shouldShowFallback('3d-scene')) {
      <brand-scene-3d
        [sceneId]="sceneId"
        [addDefaultContent]="true"
        (sceneReady)="onSceneReady($event)"
        (sceneError)="onSceneError($event)"
      />
      }

      <!-- UI Overlay -->
      <div class="ui-overlay">
        <!-- Agent Information Panel -->
        <brand-agent-info-panel [selectedAgent]="selectedAgent()" />

        <!-- Constellation Stats -->
        <brand-constellation-stats [stats]="constellationStats()" />

        <!-- Instructions -->
        <brand-instructions
          [showInstructions]="showInstructions()"
          [agentCount]="agentCount()"
        />

        <!-- Navigation Controls -->
        <brand-navigation-controls
          [config]="navigationControlsConfig"
          (focusRequested)="onFocusRequested($event)"
          (resetRequested)="onResetRequested()"
        />

        <!-- Agent Tooltip -->
        <brand-agent-tooltip
          [tooltipData]="currentTooltip()"
          [config]="tooltipConfig"
          (focusAgent)="onTooltipFocusAgent($event)"
          (startChat)="onTooltipStartChat($event)"
        />
      </div>

      <!-- Loading Overlay -->
      <brand-loading-overlay
        [isReady]="isSceneReady()"
        [loadingText]="loadingText()"
      />
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

      .ui-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      }
    `,
  ],
})
export class SpatialInterfaceComponent implements OnInit, OnDestroy {
  private readonly agentCommunication = inject(AgentCommunicationService);
  private readonly agentVisualizer = inject(AgentVisualizerService);
  private readonly sceneContent = inject(SceneContentService);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly performanceMonitor = inject(PerformanceMonitorService);
  private readonly agentStateVisualizer = inject(AgentStateVisualizerService);
  private readonly agentInteraction = inject(AgentInteractionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly http = inject(HttpClient);

  // Component configuration
  readonly sceneId = 'spatial-constellation';

  // Component state
  readonly isSceneReady = signal(false);
  readonly loadingText = signal('Initializing 3D Constellation...');
  private sceneInstance: SceneInstance | null = null;

  // Computed reactive state
  readonly selectedAgent = computed(() => {
    const selected = this.agentVisualizer.selectedAgent();
    return selected ? ({ agent: selected as any } as SelectedAgentData) : null;
  });

  readonly agentCount = computed(() => this.agentVisualizer.agentCount());
  readonly showInstructions = computed(() => !this.selectedAgent());

  readonly constellationStats = computed<ConstellationStats>(() => ({
    agentCount: this.agentCount(),
    frameRate: this.performanceMonitor.performanceMetrics().frameRate,
    activeEffects: this.performanceMonitor.performanceMetrics().activeEffects,
    isConnected: this.agentCommunication.isConnected(),
  }));

  readonly currentTooltip = this.agentInteraction.tooltipData;
  readonly currentError = this.errorHandler.error;

  // Error handling computed properties
  shouldShowFallback = (context: string) =>
    this.errorHandler.shouldShowFallback(context);

  // Component configurations
  readonly navigationControlsConfig: NavigationControlsConfig = {
    showZoomControls: true,
    showResetButton: true,
    showKeyboardHints: true,
    showTouchHints: true,
    position: 'bottom-right',
  };

  readonly tooltipConfig: TooltipConfig = {
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
  };

  ngOnInit(): void {
    this.setupAgentCommunication();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Handle scene ready event from child component
   */
  onSceneReady(sceneInstance: SceneInstance): void {
    this.sceneInstance = sceneInstance;
    this.isSceneReady.set(true);

    // Initialize all services with the scene
    this.initializeServices();
  }

  /**
   * Handle scene error from child component
   */
  onSceneError(error: Error): void {
    const recoveryStrategy = this.errorHandler.getRecoveryStrategy('3d-scene');
    this.errorHandler.handleError(error, '3d-scene', recoveryStrategy);
    this.loadingText.set('Failed to initialize 3D scene.');
  }

  /**
   * Handle retry from error boundary
   */
  onRetryError(): void {
    const currentErr = this.currentError();
    if (!currentErr) return;

    const strategy = this.errorHandler.getRecoveryStrategy(currentErr.context);
    if (strategy.recoveryAction) {
      this.errorHandler.clearError();
      strategy.recoveryAction().catch((retryError) => {
        this.errorHandler.handleError(retryError as Error, currentErr.context, {
          canRecover: false,
        });
      });
    }
  }

  /**
   * Setup agent communication
   */
  private setupAgentCommunication(): void {
    // Connect to agent system (this now loads agents automatically)
    this.agentCommunication.connect();

    // Handle existing agents
    const existingAgents = this.agentCommunication.availableAgents();
    if (existingAgents.length > 0) {
      existingAgents.forEach((agent) => {
        this.agentVisualizer.visualizeAgent(agent);
      });
    }

    // Start periodic activity simulation for demonstration
    this.startAgentActivitySimulation();

    // Subscribe to agent updates with error handling
    this.agentCommunication.agentUpdates$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        retry({ count: 3, delay: 2000 }),
        catchError((error) => {
          const recoveryStrategy =
            this.errorHandler.getRecoveryStrategy('agents');
          this.errorHandler.handleError(error, 'agents', recoveryStrategy);
          return of(); // Return empty observable to continue
        })
      )
      .subscribe({
        next: (agent: AgentState) => {
          this.agentVisualizer.visualizeAgent(agent);
        },
        error: (error) => {
          // Final error after retries
          this.errorHandler.handleError(error, 'agents', { canRecover: false });
        },
      });

    // Subscribe to available agents changes
    setTimeout(() => {
      this.agentCommunication.availableAgents().forEach((agent) => {
        this.agentVisualizer.visualizeAgent(agent);
      });
    }, 2000); // Wait for backend to load

    // Subscribe to memory updates with error handling
    this.agentCommunication.memoryUpdates$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        retry({ count: 2, delay: 1000 }),
        catchError((error) => {
          console.warn('Memory updates failed:', error);
          return of([]); // Return empty array to continue
        })
      )
      .subscribe({
        next: (contexts) => {
          // Handle memory updates if needed
        },
        error: (error) => {
          console.error('Memory updates error:', error);
        },
      });

    // Subscribe to tool executions with error handling
    this.agentCommunication.toolExecutions$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        retry({ count: 2, delay: 1000 }),
        catchError((error) => {
          console.warn('Tool execution updates failed:', error);
          return of(); // Return empty observable to continue
        })
      )
      .subscribe({
        next: (execution) => {
          // Handle tool execution updates if needed
        },
        error: (error) => {
          console.error('Tool execution error:', error);
        },
      });
  }

  /**
   * Handle navigation focus requests
   */
  onFocusRequested(target: any): void {
    console.log('Focus requested on target:', target);
    // Implement focus logic
  }

  /**
   * Handle reset requests
   */
  onResetRequested(): void {
    console.log('Camera reset requested');
    this.agentVisualizer.selectAgent(null);
  }

  /**
   * Handle tooltip focus agent requests
   */
  onTooltipFocusAgent(agentId: string): void {
    this.agentInteraction.focusOnAgent(agentId);
  }

  /**
   * Handle tooltip start chat requests
   */
  onTooltipStartChat(agentId: string): void {
    this.agentInteraction.selectAgent(agentId);
    // Additional chat interface integration could be added here
    console.log(`Starting chat with agent: ${agentId}`);
  }

  /**
   * Initialize all services with the scene
   */
  private initializeServices(): void {
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

    // Initialize performance monitoring
    this.performanceMonitor.initialize(this.sceneId);

    // Initialize agent state visualizer
    this.agentStateVisualizer.initialize({
      sceneId: this.sceneId,
      enableMemoryEffects: true,
      enableToolRings: true,
      enableCommunicationStreams: true,
      effectQuality: 'high',
      maxConcurrentEffects: 20,
    });

    // Initialize agent interaction service
    this.agentInteraction.initialize({
      sceneId: this.sceneId,
      enableHover: true,
      enableSelection: true,
      enableTooltips: true,
      enableDoubleClickFocus: true,
      hoverResponseTime: 100,
      selectionHighlightDuration: 300,
      tooltipDelay: 500,
    });

    // Start animation loop
    this.startAnimationLoop();
  }

  /**
   * Start animation loop
   */
  private startAnimationLoop(): void {
    const animate = () => {
      if (this.sceneInstance && this.isSceneReady()) {
        // Update scene content animations
        this.sceneContent.updateAnimations();

        // Update agent animations
        this.agentVisualizer.updateAnimations();

        // Update visual effects
        this.agentStateVisualizer.updateEffects(0.016);

        // Update performance monitoring
        const currentMetrics = this.performanceMonitor.performanceMetrics();
        this.performanceMonitor.updateMetrics(
          0.016,
          currentMetrics.activeEffects
        );
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Start periodic agent activity simulation
   */
  private startAgentActivitySimulation(): void {
    // Simulate agent activity every 5-10 seconds for demonstration
    const simulateActivity = () => {
      this.agentCommunication.simulateAgentActivity();

      // Schedule next simulation
      const nextInterval = 5000 + Math.random() * 5000; // 5-10 seconds
      setTimeout(simulateActivity, nextInterval);
    };

    // Start first simulation after initial load
    setTimeout(simulateActivity, 3000);
  }

  /**
   * Load agents from backend API
   */
  private loadAgentsFromBackend(): void {
    this.http
      .get<{ success: boolean; data: any[]; total: number }>(
        'http://localhost:3000/api/customer-support/agents'
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.error('Failed to load agents from backend:', error);
          // Fallback to mock agents on error
          this.createMockAgents();
          return of({ success: false, data: [], total: 0 });
        })
      )
      .subscribe((response) => {
        if (response.success && response.data.length > 0) {
          console.log('Loaded agents from backend:', response.data);

          // Add agents after a delay to ensure services are initialized
          setTimeout(() => {
            response.data.forEach((agent) => {
              this.agentVisualizer.visualizeAgent(agent);
            });
          }, 1000);
        } else {
          // Fallback to mock agents if no backend agents
          this.createMockAgents();
        }
      });
  }

  /**
   * Create mock agents for development/testing
   */
  private createMockAgents(): void {
    console.log('Creating mock agents for testing spatial interface');

    const mockAgents: AgentState[] = [
      {
        id: 'github-analyzer',
        name: 'GitHub Analyzer',
        type: 'analyst',
        status: 'idle',
        position: { x: -8, y: 2, z: -3 },
        capabilities: [
          'repository-analysis',
          'code-review',
          'metrics-extraction',
        ],
        isActive: false,
        lastActiveTime: new Date(),
        currentTools: [],
        personality: {
          color: '#10B981',
          description:
            'GitHub Repository Analyzer - Extracts technical achievements and skills',
        },
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        type: 'creator',
        status: 'thinking',
        position: { x: 8, y: -2, z: 3 },
        capabilities: [
          'content-generation',
          'narrative-creation',
          'storytelling',
        ],
        isActive: true,
        lastActiveTime: new Date(),
        currentTools: [],
        personality: {
          color: '#8B5CF6',
          description:
            'Content Creator - Generates compelling brand narratives',
        },
      },
      {
        id: 'brand-strategist',
        name: 'Brand Strategist',
        type: 'strategist',
        status: 'executing',
        position: { x: 0, y: 8, z: -2 },
        capabilities: [
          'brand-positioning',
          'strategy-development',
          'market-analysis',
        ],
        isActive: true,
        lastActiveTime: new Date(),
        currentTools: [
          {
            id: 'tool_1',
            toolName: 'Brand Analysis Tool',
            status: 'running',
            progress: 0.7,
            startTime: new Date(),
            parameters: {},
          },
        ],
        personality: {
          color: '#F59E0B',
          description:
            'Brand Strategist - Develops comprehensive brand positioning',
        },
      },
      {
        id: 'supervisor',
        name: 'Supervisor',
        type: 'coordinator',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
        capabilities: [
          'workflow-coordination',
          'task-management',
          'quality-assurance',
        ],
        isActive: false,
        lastActiveTime: new Date(),
        currentTools: [],
        personality: {
          color: '#3B82F6',
          description: 'Supervisor Agent - Coordinates multi-agent workflows',
        },
      },
    ];

    // Add mock agents to the agent communication service
    setTimeout(() => {
      mockAgents.forEach((agent) => {
        this.agentVisualizer.visualizeAgent(agent);
      });
    }, 1000); // Delay to ensure services are initialized
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.sceneInstance) {
      this.sceneContent.removeDefaultContent(this.sceneInstance.scene);
    }

    // Cleanup all services
    this.agentVisualizer.cleanup();
    this.performanceMonitor.cleanup();
    this.agentStateVisualizer.cleanup();
    this.agentInteraction.cleanup();
    this.agentCommunication.disconnect();
    this.errorHandler.clearError();
  }
}
