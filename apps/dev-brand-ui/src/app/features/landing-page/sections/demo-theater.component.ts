import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  signal,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { StreamingIntegrationService } from '../../../core/services/streaming-integration.service';
import { UserInterruptionService } from '../../../core/services/user-interruption.service';
import { Subscription } from 'rxjs';

interface ContentWorkflowStep {
  id: string;
  title: string;
  description: string;
  agent: string;
  status: 'pending' | 'active' | 'completed';
  duration: number;
  icon: string;
  color: string;
}

interface BusinessMetric {
  label: string;
  value: string;
  improvement: string;
  icon: string;
}

@Component({
  selector: 'brand-demo-theater',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-theater.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      .container {
        max-width: 1400px;
      }

      /* Smooth transitions for all interactive elements */
      * {
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      }
    `,
  ],
})
export class DemoTheaterComponent implements OnInit, OnDestroy {
  @ViewChild('theatreBg', { static: true }) theatreBg!: ElementRef;

  // Injected services
  private readonly streamingService = inject(StreamingIntegrationService);
  private readonly interruptionService = inject(UserInterruptionService);

  // Three.js background
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private backgroundMeshes: THREE.Mesh[] = [];
  private animationFrame?: number;
  private clock = new THREE.Clock();

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Demo state
  readonly isRunning = signal(false);
  readonly currentStep = signal(0);
  readonly stepProgress = signal(0);
  readonly demoStatus = signal('Ready');
  readonly backgroundObjects = signal(0);
  readonly showPerformanceDebug = signal(false);
  readonly currentExecutionId = signal<string | null>(null);

  // User interaction state
  readonly currentInterruption = this.interruptionService.dialogData;
  readonly showApprovalPanel = signal(false);
  readonly approvalStatus = signal<'pending' | 'approved' | 'rejected'>(
    'pending'
  );
  readonly approvalFeedback = signal('');
  protected userQuestion = '';
  protected interruptionResponse = '';

  // Content state
  readonly generatedContent = signal<any>(null);

  // Workflow steps based on CONTENT_MARKETING_SYSTEM.md
  readonly workflowSteps = signal<ContentWorkflowStep[]>([
    {
      id: 'strategy',
      title: 'Unified Memory Context Analysis',
      description:
        'Vector similarity (ChromaDB) + relationship expansion (Neo4j) for market intelligence',
      agent: 'Memory Fusion Agent',
      status: 'pending',
      duration: 4,
      icon: '🧠',
      color: '#9333ea',
    },
    {
      id: 'generation',
      title: 'Multi-Agent Content Synthesis',
      description:
        '@StreamToken coordination with role-based messaging and shared context',
      agent: 'Copywriter + SEO + Technical Agents',
      status: 'pending',
      duration: 6,
      icon: '⚡',
      color: '#f59e0b',
    },
    {
      id: 'compliance',
      title: 'Checkpoint & Validation Pipeline',
      description:
        'State persistence with brand compliance scoring and error recovery',
      agent: 'Compliance Validation Agent',
      status: 'pending',
      duration: 3,
      icon: '🔒',
      color: '#06b6d4',
    },
    {
      id: 'approval',
      title: 'Human-in-the-Loop Gate',
      description:
        '@RequiresApproval with escalation strategies and timeout handling',
      agent: 'HITL Oversight System',
      status: 'pending',
      duration: 0,
      icon: '👥',
      color: '#ef4444',
    },
    {
      id: 'deployment',
      title: 'Streaming Deployment Pipeline',
      description:
        'Real-time progress tracking with WebSocket broadcasting across channels',
      agent: 'Platform Distribution Agent',
      status: 'pending',
      duration: 4,
      icon: '🌐',
      color: '#22c55e',
    },
    {
      id: 'monitoring',
      title: 'Time-Travel Analytics',
      description:
        'Deterministic replay capabilities with performance metrics and observability',
      agent: 'Monitoring & Time-Travel System',
      status: 'pending',
      duration: 2,
      icon: '📈',
      color: '#8b5cf6',
    },
  ]);

  readonly businessMetrics = signal<BusinessMetric[]>([
    {
      label: 'Content Production Speed',
      value: '10x faster',
      improvement: '+900%',
      icon: '⚡',
    },
    {
      label: 'Brand Compliance Rate',
      value: '95%',
      improvement: '+40%',
      icon: '🛡️',
    },
    {
      label: 'Campaign ROI',
      value: '$2.3M',
      improvement: '+280%',
      icon: '💰',
    },
    {
      label: 'Cost Reduction',
      value: '70%',
      improvement: '-$1.2M',
      icon: '📉',
    },
  ]);

  ngOnInit(): void {
    this.initBackground3D();
    this.createNetworkVisualization();
    this.setupLighting();
    this.startRenderLoop();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());

    // Stop any running demo
    this.isRunning.set(false);

    // Clean up Three.js properly
    this.cleanupThreeJS();
  }

  private cleanupThreeJS(): void {
    // Stop animation loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }

    // Dispose of all background meshes
    if (this.backgroundMeshes) {
      this.backgroundMeshes.forEach((mesh) => {
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.backgroundMeshes = [];
    }

    // Clear the scene
    if (this.scene) {
      // Remove all objects from scene
      while (this.scene.children.length > 0) {
        const child = this.scene.children[0];
        this.scene.remove(child);

        // Dispose of child if it's a mesh
        if (child.type === 'Mesh') {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((material) => material.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      }
    }

    // Dispose of renderer and force context cleanup
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
  }

  async startDemo(): Promise<void> {
    if (this.isRunning()) return;

    this.isRunning.set(true);
    this.demoStatus.set('Starting Demo Workflow');
    this.generatedContent.set(null);
    this.currentExecutionId.set(null);

    // Reset all steps
    const steps = this.workflowSteps();
    steps.forEach((step) => (step.status = 'pending'));
    this.workflowSteps.set([...steps]);

    try {
      // Try to start real workflow first
      await this.attemptRealWorkflow();
    } catch (error) {
      console.warn('🔄 Backend unavailable, starting demo mode:', error);
      // Fallback to demo mode if backend is unavailable
      await this.startDemoMode();
    }
  }

  private async attemptRealWorkflow(): Promise<void> {
    const demoRequest = {
      input:
        'Create a comprehensive content marketing strategy for our AI-powered enterprise platform, including blog posts, social media content, and technical documentation that showcases our multi-agent workflow capabilities.',
      demonstrationMode: 'enterprise' as const,
      enableStreaming: true,
    };

    console.log('🚀 Attempting to start real supervisor workflow...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Backend connection timeout'));
      }, 3000); // 3 second timeout

      const streamSubscription = this.streamingService
        .startSupervisorShowcase(demoRequest)
        .subscribe({
          next: (update) => {
            clearTimeout(timeout);
            console.log('📡 Workflow update received:', update);
            this.handleWorkflowUpdate(update);
            resolve();
          },
          error: (error) => {
            clearTimeout(timeout);
            console.error('❌ Workflow error:', error);
            reject(error);
          },
          complete: () => {
            clearTimeout(timeout);
            console.log('✅ Workflow completed');
            this.demoStatus.set('Completed');
            this.isRunning.set(false);
            resolve();
          },
        });

      this.subscriptions.push(streamSubscription);
    });
  }

  private async startDemoMode(): Promise<void> {
    console.log('🎭 Starting demo mode simulation');
    this.demoStatus.set('Demo Mode - Simulating Workflow');

    const steps = this.workflowSteps();

    for (let i = 0; i < steps.length; i++) {
      if (!this.isRunning()) break; // Allow cancellation

      const step = steps[i];
      step.status = 'active';
      this.workflowSteps.set([...steps]);
      this.currentStep.set(i);
      this.demoStatus.set(`Demo: ${step.title}`);

      // Simulate step execution with progress
      await this.simulateStepExecution(step, i);

      step.status = 'completed';
      this.workflowSteps.set([...steps]);

      // Add realistic sample content for generation step based on platform capabilities
      if (step.id === 'generation') {
        const sampleContent = {
          type: 'Technical Content Suite',
          title:
            'Enterprise AI Platform: 40% Code Reduction with LangGraph Integration',
          body: `
            ## Revolutionizing Development with Unified AI Orchestration

            Our NestJS AI SaaS Starter delivers enterprise-grade workflows through 13 specialized libraries,
            combining vector intelligence (ChromaDB) + graph relationships (Neo4j) + LangGraph orchestration.

            ### Key Achievements:
            - **40% Code Reduction** with functional decorators vs traditional patterns
            - **Zero-Downtime Resume** from workflow checkpoints
            - **Real-time Token Streaming** with WebSocket integration
            - **Memory Fusion Architecture** combining semantic + graph context

            ### Technical Differentiators:
            1. **Replayable Streaming Workflows** - Time-travel debugging preserves original token emissions
            2. **Human-in-Loop Safety** - Declarative approval gates removable with zero code churn
            3. **Cascade Retrieval Pattern** - Vector similarity informs relationship creation
            4. **Pluggable Architecture** - All features toggle without code changes

            Experience the future of AI development with transparent durability,
            unified intelligence, and enterprise reliability.
          `,
          channels: [
            'Technical Blog',
            'Developer Portal',
            'GitHub Documentation',
            'LinkedIn Engineering',
          ],
          metrics: {
            compliance: 94,
            seoScore: 97,
            readability: 'Technical',
            keywords: [
              'LangGraph',
              'Vector Database',
              'Multi-Agent',
              'TypeScript',
              'Enterprise AI',
            ],
            estimatedReach: '25,000+',
            engagementScore: 'High',
          },
          codeExamples: {
            streaming: '@StreamToken() // Real-time token emission',
            checkpoint: '@RequiresApproval() // Human oversight gates',
            memory: 'cascadeRetrieval(vector + graph) // Unified context',
          },
        };

        this.generatedContent.set(sampleContent);
      }

      // Brief pause between steps
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.demoStatus.set('Demo Completed Successfully');
    this.isRunning.set(false);
  }

  private async simulateStepExecution(step: any, index: number): Promise<void> {
    const duration = step.duration * 1000; // Convert to milliseconds
    const startTime = Date.now();

    return new Promise((resolve) => {
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        this.stepProgress.set(progress);

        if (progress >= 100 || !this.isRunning()) {
          this.stepProgress.set(0);
          resolve();
        } else {
          requestAnimationFrame(updateProgress);
        }
      };
      updateProgress();
    });
  }

  // Removed - using real interruption system instead

  async askQuestion(): Promise<void> {
    if (!this.userQuestion.trim() || !this.currentExecutionId()) return;

    try {
      await this.interruptionService.askQuestion(
        this.currentExecutionId()!,
        this.userQuestion,
        'medium'
      );
      this.userQuestion = '';
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
  }

  async injectContext(): Promise<void> {
    if (!this.userQuestion.trim() || !this.currentExecutionId()) return;

    try {
      await this.interruptionService.injectInput(
        this.currentExecutionId()!,
        this.userQuestion,
        'correction'
      );
      this.userQuestion = '';
    } catch (error) {
      console.error('Failed to inject context:', error);
    }
  }

  async respondToInterruption(): Promise<void> {
    const interruption = this.currentInterruption();
    if (!interruption || !this.interruptionResponse.trim()) return;

    try {
      await this.interruptionService.respondToInterruption(
        interruption.id,
        this.interruptionResponse
      );
      this.interruptionResponse = '';
    } catch (error) {
      console.error('Failed to respond to interruption:', error);
    }
  }

  async cancelInterruption(): Promise<void> {
    const interruption = this.currentInterruption();
    if (!interruption) return;

    try {
      await this.interruptionService.cancelInterruption(
        interruption.id,
        'User cancelled via demo interface'
      );
    } catch (error) {
      console.error('Failed to cancel interruption:', error);
    }
  }

  private initBackground3D(): void {
    const container = this.theatreBg.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000011, 30, 100);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 40);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);
  }

  private createNetworkVisualization(): void {
    // Create a network of connected nodes representing the AI workflow
    const nodePositions: [number, number, number][] = [
      [-20, 15, -10],
      [0, 20, -15],
      [20, 15, -10],
      [-25, 0, -5],
      [0, 0, -8],
      [25, 0, -5],
      [-20, -15, -12],
      [0, -20, -15],
      [20, -15, -12],
    ];

    const colors = [
      '#8a2be2',
      '#ff69b4',
      '#00bfff',
      '#32cd32',
      '#ffd700',
      '#ff6347',
    ];

    nodePositions.forEach((pos, index) => {
      // Create node
      const nodeGeometry = new THREE.SphereGeometry(1.5, 16, 16);
      const nodeMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colors[index % colors.length]),
        emissive: new THREE.Color(colors[index % colors.length]).multiplyScalar(
          0.2
        ),
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
      });

      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.position.set(...pos);
      nodeMesh.userData = {
        originalPosition: pos,
        floatOffset: index * 0.5,
        pulseOffset: index * 0.3,
      };

      this.scene.add(nodeMesh);
      this.backgroundMeshes.push(nodeMesh);
    });

    this.backgroundObjects.set(this.backgroundMeshes.length);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x111122, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4444ff, 0.6);
    directionalLight.position.set(15, 15, 15);
    this.scene.add(directionalLight);

    // Colored point lights
    const pointLight1 = new THREE.PointLight('#8a2be2', 0.8, 40);
    pointLight1.position.set(-15, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight('#ff69b4', 0.8, 40);
    pointLight2.position.set(15, -10, 10);
    this.scene.add(pointLight2);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);

      const elapsedTime = this.clock.getElapsedTime();

      // Animate network nodes
      this.backgroundMeshes.forEach((mesh, index) => {
        const userData = mesh.userData;

        // Floating motion
        mesh.position.y =
          userData['originalPosition'][1] +
          Math.sin(elapsedTime * 0.8 + userData['floatOffset']) * 2;

        // Pulsing scale
        const pulseScale =
          1 + Math.sin(elapsedTime * 2 + userData['pulseOffset']) * 0.2;
        mesh.scale.setScalar(pulseScale);

        // Slow rotation
        mesh.rotation.y += 0.005;
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  trackByStep(index: number, step: ContentWorkflowStep): string {
    return step.id;
  }

  trackByChannel(index: number, channel: string): string {
    return channel;
  }

  trackByMetric(index: number, metric: BusinessMetric): string {
    return metric.label;
  }

  getInterruptionIcon(type: string): string {
    switch (type) {
      case 'question':
        return '💬';
      case 'clarification':
        return '❓';
      case 'approval_request':
        return '✋';
      case 'input_request':
        return '📝';
      case 'correction':
        return '✏️';
      default:
        return '🤖';
    }
  }

  getInterruptionTitle(type: string): string {
    switch (type) {
      case 'question':
        return 'Agent Question';
      case 'clarification':
        return 'Clarification Needed';
      case 'approval_request':
        return 'Approval Required';
      case 'input_request':
        return 'Input Required';
      case 'correction':
        return 'Correction Needed';
      default:
        return 'Agent Interaction';
    }
  }

  private handleWorkflowUpdate(update: any): void {
    // Store execution ID for user interactions
    if (update.executionId && !this.currentExecutionId()) {
      this.currentExecutionId.set(update.executionId);
    }

    // Update workflow steps based on streaming data
    if (update.type === 'workflow:start') {
      this.demoStatus.set('Workflow Started');
    } else if (update.type === 'node:start') {
      this.updateStepStatus(update.nodeId || update.data?.nodeId, 'active');
    } else if (update.type === 'node:end') {
      this.updateStepStatus(update.nodeId || update.data?.nodeId, 'completed');
    } else if (update.type === 'progress') {
      this.stepProgress.set(update.data?.percentage || 0);
    } else if (update.type === 'event') {
      // Handle specific events like content generation
      if (update.data?.eventType === 'content_generated') {
        this.generatedContent.set(update.data?.content);
      }
    }
  }

  private updateStepStatus(
    nodeId: string,
    status: 'pending' | 'active' | 'completed'
  ): void {
    if (!nodeId) return;

    const steps = this.workflowSteps();
    const stepIndex = steps.findIndex(
      (step) =>
        step.id === nodeId ||
        step.title.toLowerCase().includes(nodeId.toLowerCase())
    );

    if (stepIndex >= 0) {
      steps[stepIndex].status = status;
      this.workflowSteps.set([...steps]);
      this.currentStep.set(stepIndex);
    }
  }
}
