// Module
export { MultiAgentModule } from './lib/multi-agent.module';

// Services
export { MultiAgentCoordinatorService } from './lib/services/multi-agent-coordinator.service';
export { MultiAgentCoordinatorService as MultiAgentService } from './lib/services/multi-agent-coordinator.service';
export { AgentRegistryService } from './lib/services/agent-registry.service';
export { GraphBuilderService } from './lib/services/graph-builder.service';
export { NodeFactoryService } from './lib/services/node-factory.service';
export { LlmProviderService } from './lib/services/llm-provider.service';
export { NetworkManagerService } from './lib/services/network-manager.service';

// Tools System (explicit registration replaces discovery)
export { ToolRegistrationService } from './lib/services/tool-registration.service';
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

// Configuration utilities
export * from './lib/utils/multi-agent-config.accessor';
