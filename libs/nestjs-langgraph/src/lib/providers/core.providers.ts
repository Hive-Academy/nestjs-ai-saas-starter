import { Provider } from '@nestjs/common';
import { WorkflowGraphBuilderService } from '../core/workflow-graph-builder.service';
import { SubgraphManagerService } from '../core/subgraph-manager.service';
import { CompilationCacheService } from '../core/compilation-cache.service';
import { MetadataProcessorService } from '../core/metadata-processor.service';

/**
 * Core service providers for the LangGraph module
 */
export function createCoreProviders(): Provider[] {
  return [
    WorkflowGraphBuilderService,
    SubgraphManagerService,
    CompilationCacheService,
    MetadataProcessorService,
    // TODO: Re-enable when service is implemented
    // WorkflowRegistryService,
  ];
}

/**
 * Core service exports for the LangGraph module
 */
export const CORE_EXPORTS = [
  WorkflowGraphBuilderService,
  SubgraphManagerService,
  CompilationCacheService,
  MetadataProcessorService,
];
