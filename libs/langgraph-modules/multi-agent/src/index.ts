// Module
export { MultiAgentModule } from './lib/multi-agent.module';

// Coordination Services (Main Facade)
export { MultiAgentCoordinatorService } from './lib/coordination/multi-agent-coordinator.service';
export { MultiAgentCoordinatorService as MultiAgentService } from './lib/coordination/multi-agent-coordinator.service';

// Agent Services
export { AgentRegistryService } from './lib/agent/agent-registry.service';

// Network Services
export { GraphBuilderService } from './lib/network/graph-builder.service';
export { NodeFactoryService } from './lib/network/node-factory.service';
export { NetworkManagerService } from './lib/network/network-manager.service';

// LLM Services
export { LlmProviderService } from './lib/llm/llm-provider.service';

// Workflow Services (public facade only)
export { WorkflowManagerService } from './lib/workflow/workflow-manager.service';

// Tools System (explicit registration replaces discovery)
export { ToolRegistrationService } from './lib/tools/tool-registration.service';
export { ToolRegistryService } from './lib/tools/tool-registry.service';
export { ToolBuilderService } from './lib/tools/tool-builder.service';
export { ToolNodeService } from './lib/tools/tool-node.service';

// Interfaces and Types
export * from './lib/interfaces/multi-agent.interface';
export type * from './lib/interfaces/tool.interface';
export * from './lib/types/agent-config.interface';

// Constants
export * from './lib/constants/multi-agent.constants';

// Decorators - Tool and Agent decorators
export * from './lib/decorators/tool.decorator';
export * from './lib/decorators/agent.decorator';

// Enhanced Agent Architecture Types (Workflow Agent Support)
export type {
  AgentType,
  WorkflowAgentConfig,
  AgentWorkflowConfig,
} from './lib/decorators/agent.decorator';

// Configuration utilities
export * from './lib/utils/multi-agent-config.accessor';
