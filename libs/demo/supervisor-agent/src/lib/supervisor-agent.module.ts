import { Module } from '@nestjs/common';
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';
import { SupervisorCoordinationWorkflow } from './workflows/supervisor-coordination.workflow';
import { getSupervisorAgentConfig } from './config/supervisor-agent.config';

/**
 * SupervisorAgentModule - Demonstrates powerful multi-agent coordination
 * using the NestJS-LangGraph integration with all child modules
 *
 * This module leverages our 4-day infrastructure investment:
 * - CheckpointModule for state persistence
 * - MemoryModule for contextual memory
 * - MultiAgentModule for agent coordination
 * - MonitoringModule for observability
 * - TimeTravelModule for debugging
 * - StreamingModule for real-time updates
 * - HITLModule for human approval workflows
 * 
 * Configuration is externalized to supervisor-agent.config.ts
 * and controlled via environment variables (see .env.example)
 */
@Module({
  imports: [
    // Import the main orchestration layer with all child modules
    // Configuration is now externalized for better maintainability
    NestjsLanggraphModule.forRoot(getSupervisorAgentConfig()),
  ],
  providers: [
    // Register our powerful supervisor workflow
    SupervisorCoordinationWorkflow,
  ],
  exports: [NestjsLanggraphModule],
})
export class SupervisorAgentModule {}
