// Module
export { MultiAgentModule } from './lib/multi-agent.module';

// Services
export { MultiAgentCoordinatorService } from './lib/services/multi-agent-coordinator.service';
export { AgentRegistryService } from './lib/services/agent-registry.service';
export { GraphBuilderService } from './lib/services/graph-builder.service';
export { NodeFactoryService } from './lib/services/node-factory.service';
export { LlmProviderService } from './lib/services/llm-provider.service';
export { NetworkManagerService } from './lib/services/network-manager.service';
export { AgentExamplesService } from './lib/services/agent-examples.service';

// Tools System (moved from main library)
export { ToolDiscoveryService } from './lib/tools/tool-discovery.service';
export { ToolRegistryService } from './lib/tools/tool-registry.service';
export { ToolBuilderService } from './lib/tools/tool-builder.service';
export { ToolNodeService } from './lib/tools/tool-node.service';

// Interfaces and Types
export * from './lib/interfaces/multi-agent.interface';
export type * from './lib/interfaces/tool.interface';

// Constants
export * from './lib/constants/multi-agent.constants';


// Decorators - Tool decorators
export * from './lib/decorators/tool.decorator';
