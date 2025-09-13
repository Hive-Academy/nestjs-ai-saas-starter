import { Module, DynamicModule } from '@nestjs/common';
import { WorkflowGraphBuilderService } from './core/workflow-graph-builder.service';
import { CompilationCacheService } from './core/compilation-cache.service';
import { MetadataProcessorService } from './core/metadata-processor.service';
import { SubgraphManagerService } from './core/subgraph-manager.service';
import { setWorkflowEngineConfig } from './utils/workflow-engine-config.accessor';

export interface WorkflowEngineModuleOptions {
  cache?: {
    enabled: boolean;
    maxSize?: number;
    ttl?: number;
  };
  debug?: boolean;
}

@Module({})
export class WorkflowEngineModule {
  static forRoot(options?: WorkflowEngineModuleOptions): DynamicModule {
    // Store config for decorator access
    const config = options || {};
    setWorkflowEngineConfig(config);

    return {
      module: WorkflowEngineModule,
      providers: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
        {
          provide: 'WORKFLOW_ENGINE_OPTIONS',
          useValue: options || {},
        },
      ],
      exports: [
        WorkflowGraphBuilderService,
        CompilationCacheService,
        MetadataProcessorService,
        SubgraphManagerService,
      ],
    };
  }
}
