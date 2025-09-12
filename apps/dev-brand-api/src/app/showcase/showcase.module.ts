import { Module } from '@nestjs/common';

// Import showcase workflows demonstrating ALL patterns
import { SupervisorShowcaseWorkflow } from './workflows/supervisor-showcase.workflow';
import { SwarmShowcaseWorkflow } from './workflows/swarm-showcase.workflow';
// import { HierarchicalShowcaseWorkflow } from './workflows/hierarchical-showcase.workflow'; // TODO: Create this workflow

// Import showcase agents with @Agent decorator
import { DemoShowcaseAgent } from './agents/demo-showcase.agent';
import { AdvancedShowcaseAgent } from './agents/advanced-showcase.agent';
import { SpecialistShowcaseAgent } from './agents/specialist-showcase.agent';
import { StreamingShowcaseAgent } from './agents/streaming-showcase.agent';
import { HitlShowcaseAgent } from './agents/hitl-showcase.agent';

// Import showcase services
import { ShowcaseCoordinatorService } from './services/showcase-coordinator.service';
import { ShowcaseMetricsService } from './services/showcase-metrics.service';
import { ShowcaseStreamingService } from './services/showcase-streaming.service';

// Import showcase tools - Demonstrates @Tool decorator system
import { ShowcaseAnalysisTools } from './tools/showcase-analysis.tools';
import { ShowcaseIntegrationTools } from './tools/showcase-integration.tools';

// Import showcase controllers
import { ShowcaseController } from './controllers/showcase.controller';

/**
 * 🎯 SHOWCASE MODULE - CLEAN DEMONSTRATION PLATFORM
 *
 * This module demonstrates the decorator-driven architecture for building
 * enterprise-grade AI applications. It relies on the parent app.module.ts
 * for all library configurations to avoid duplication and maintain consistency.
 *
 * 🚀 FEATURES DEMONSTRATED:
 *
 * 1. Multi-Agent Coordination Patterns:
 *    - Supervisor Pattern (@Workflow + @Agent decorators)
 *    - Swarm Pattern (peer-to-peer coordination)
 *    - Hierarchical Pattern (multi-level command structure)
 *
 * 2. Advanced Decorator Ecosystem:
 *    - @Workflow with streaming, hitl, checkpointing
 *    - @Agent with capabilities, tools, priority
 *    - @Task with dependency management
 *    - @Entrypoint with retry/timeout
 *    - @StreamToken for real-time feedback
 *    - @Approval for human-in-the-loop
 *
 * 3. Enterprise Capabilities:
 *    - Tools registered via explicit registration (no discovery)
 *    - State persistence via parent module checkpoint configuration
 *    - Real-time streaming with parent WebSocket integration
 *    - Human-in-the-loop approval workflows
 *    - Advanced monitoring and metrics
 *
 * 4. Clean Architecture Principles:
 *    - No duplicated module imports
 *    - Relies on parent app.module.ts configurations
 *    - Single source of truth for library settings
 *    - Focused on business logic, not infrastructure
 *
 * This demonstrates the power of our explicit registration system!
 */
@Module({
  imports: [
    // No module imports - relies on parent app.module.ts configuration
    // This ensures no duplication and maintains consistency
  ],
  providers: [
    // Showcase workflows demonstrating all patterns
    SupervisorShowcaseWorkflow,
    SwarmShowcaseWorkflow,

    // Showcase agents with full decorator usage
    DemoShowcaseAgent,
    AdvancedShowcaseAgent,
    SpecialistShowcaseAgent,
    StreamingShowcaseAgent,
    HitlShowcaseAgent,

    // Showcase services
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
    ShowcaseStreamingService,

    // Showcase tools - Demonstrates @Tool decorator capabilities
    ShowcaseAnalysisTools,
    ShowcaseIntegrationTools,
  ],
  controllers: [ShowcaseController],
  exports: [
    // Export everything for external integration
    SupervisorShowcaseWorkflow,
    SwarmShowcaseWorkflow,
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
    ShowcaseAnalysisTools,
    ShowcaseIntegrationTools,
  ],
})
export class ShowcaseModule {}
