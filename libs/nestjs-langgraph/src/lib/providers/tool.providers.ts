import type { Provider } from '@nestjs/common';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { ToolNodeService } from '../tools/tool-node.service';
import { ToolBuilderService } from '../tools/tool-builder.service';
import { ToolDiscoveryService } from '../tools/tool-discovery.service';
import { TOOL_REGISTRY } from '../constants';

/**
 * Tool service providers for the LangGraph module
 */
export function createToolProviders(): Provider[] {
  return [
    ToolRegistryService,
    ToolNodeService,
    ToolBuilderService,
    ToolDiscoveryService,
    {
      provide: TOOL_REGISTRY,
      useClass: ToolRegistryService,
    },
  ];
}

/**
 * Tool service exports for the LangGraph module
 */
export const TOOL_EXPORTS = [
  ToolRegistryService,
  ToolNodeService,
  ToolBuilderService,
  ToolDiscoveryService,
];
