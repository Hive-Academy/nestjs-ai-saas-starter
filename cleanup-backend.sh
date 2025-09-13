#!/bin/bash

# Backend Cleanup Script - Remove Test Code and Generic Agents
# This script removes placeholder implementations and prepares for real business workflows

echo "🧹 Starting Backend Cleanup - Removing Test Code and Generic Agents"
echo "=================================================================="

# Base directory
BACKEND_DIR="apps/dev-brand-api/src/app"

# STEP 1: Remove test controllers and services
echo ""
echo "🧪 Step 1: Removing Test Controllers and Services..."
echo "---------------------------------------------------"

TEST_FILES=(
  "controllers/adapter-test.controller.ts"
  "controllers/checkpoint-examples.controller.ts"
  "services/adapter-test.service.ts"
  "services/checkpoint-examples.service.ts"
)

for file in "${TEST_FILES[@]}"; do
  if [ -f "$BACKEND_DIR/$file" ]; then
    echo "❌ Removing: $file"
    rm -f "$BACKEND_DIR/$file"
  else
    echo "⚠️  Already removed: $file"
  fi
done

# STEP 2: Remove generic showcase agents
echo ""
echo "🤖 Step 2: Removing Generic Showcase Agents..."
echo "---------------------------------------------------"

REMOVE_AGENTS=(
  "showcase/agents/demo-showcase.agent.ts"
  "showcase/agents/advanced-showcase.agent.ts"
  "showcase/agents/specialist-showcase.agent.ts"
  "showcase/agents/streaming-showcase.agent.ts"
  "showcase/agents/hitl-showcase.agent.ts"
)

for agent in "${REMOVE_AGENTS[@]}"; do
  if [ -f "$BACKEND_DIR/$agent" ]; then
    echo "❌ Removing generic agent: $(basename $agent)"
    rm -f "$BACKEND_DIR/$agent"
  fi
done

# STEP 3: Keep business-value agents (but will refactor later)
echo ""
echo "✅ Step 3: Preserving Business-Oriented Agents for Refactoring..."
echo "---------------------------------------------------"

PRESERVE_AGENTS=(
  "showcase/agents/research-showcase.agent.ts"  # Has Tavily integration
  "showcase/agents/analysis-showcase.agent.ts"  # Has LLM integration
  "showcase/agents/content-showcase.agent.ts"   # Has content generation
)

for agent in "${PRESERVE_AGENTS[@]}"; do
  if [ -f "$BACKEND_DIR/$agent" ]; then
    echo "✅ Preserving (for refactoring): $(basename $agent)"
  fi
done

# STEP 4: Clean up app.module.ts
echo ""
echo "📦 Step 4: Updating App Module..."
echo "---------------------------------------------------"

APP_MODULE="$BACKEND_DIR/app.module.ts"
if [ -f "$APP_MODULE" ]; then
  echo "📝 Creating cleaned app.module.ts..."
  
  # Create a backup first
  cp "$APP_MODULE" "$APP_MODULE.backup"
  
  cat > "$APP_MODULE" << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core library imports
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { MemoryModule } from '@hive-academy/langgraph-memory';

// Adapters - Keep these as they're essential
import { ChromaVectorAdapter, Neo4jGraphAdapter } from './adapters';

// LangGraph modules with proper streaming integration
import {
  LanggraphModulesCheckpointModule,
  CheckpointManagerService,
  CheckpointManagerAdapter,
} from '@hive-academy/langgraph-checkpoint';
import {
  StreamingModule,
  StreamingServiceAdapter,
} from '@hive-academy/langgraph-streaming';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

// Configuration imports
import { getChromaDBConfig } from './config/chromadb.config';
import { getNeo4jConfig } from './config/neo4j.config';
import { getCheckpointConfig } from './config/checkpoint.config';
import { getStreamingConfig } from './config/streaming.config';
import { getHitlConfig } from './config/hitl.config';
import { getMemoryConfig } from './config/memory.config';
import { getFunctionalApiConfig } from './config/functional-api.config';
import { getMultiAgentConfig } from './config/multi-agent.config';
import { getMonitoringConfig } from './config/monitoring.config';
import { getWorkflowEngineConfig } from './config/workflow-engine.config';

// Health check
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';

// Business modules (to be created)
// import { BusinessWorkflowsModule } from './business-workflows/business-workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Core database modules
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        getChromaDBConfig(configService),
      inject: [ConfigService],
    }),

    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getNeo4jConfig(configService),
    }),

    // Memory module with adapters
    MemoryModule.forRoot({
      ...getMemoryConfig(),
      adapters: {
        vector: ChromaVectorAdapter,
        graph: Neo4jGraphAdapter,
      },
    }),

    // Checkpoint module
    LanggraphModulesCheckpointModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => getCheckpointConfig(),
    }),

    // PROPERLY CONFIGURED STREAMING MODULE
    StreamingModule.forRoot({
      ...getStreamingConfig(),
      websocket: { 
        enabled: true, 
        port: 3000,  // Using main server port
        namespace: '/streaming'
      },
      gateway: { 
        enabled: true, 
        cors: true,
        authentication: {
          enabled: false,  // For development
        }
      },
    }),

    // HITL module
    HitlModule.forRoot(getHitlConfig()),

    // Workflow engine WITH STREAMING
    WorkflowEngineModule.forRootAsync({
      useFactory: async (streamingAdapter: StreamingServiceAdapter) => ({
        ...getWorkflowEngineConfig(),
        streamingAdapter,  // Enable streaming!
      }),
      inject: [StreamingServiceAdapter],
    }),

    // Multi-agent module WITH STREAMING
    MultiAgentModule.forRootAsync({
      useFactory: async (
        streamingAdapter: StreamingServiceAdapter,
        checkpointManager: CheckpointManagerService
      ) => ({
        ...getMultiAgentConfig(),
        streamingAdapter,  // Enable streaming!
        checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
      }),
      inject: [StreamingServiceAdapter, CheckpointManagerService],
    }),

    // Functional API with checkpoint
    FunctionalApiModule.forRootAsync({
      useFactory: async (checkpointManager: CheckpointManagerService) => ({
        ...getFunctionalApiConfig(),
        checkpointAdapter: new CheckpointManagerAdapter(checkpointManager),
      }),
      inject: [CheckpointManagerService],
    }),

    // Monitoring module
    MonitoringModule.forRoot(getMonitoringConfig()),

    // Health checks
    TerminusModule.forRoot({
      logger: false,
      errorLogStyle: 'pretty',
    }),

    // Business modules will be added here
    // BusinessWorkflowsModule,
  ],
  controllers: [
    HealthController,
    // Business controllers will be added here
  ],
  providers: [
    // Business services will be added here
  ],
})
export class AppModule {}
EOF
  echo "✅ App module cleaned and streaming properly configured"
else
  echo "⚠️  App module not found"
fi

# STEP 5: Remove generic workflows
echo ""
echo "📋 Step 5: Cleaning Showcase Workflows..."
echo "---------------------------------------------------"

# Keep workflows but mark for refactoring
WORKFLOW_FILES=(
  "showcase/workflows/supervisor-showcase.workflow.ts"
  "showcase/workflows/swarm-showcase.workflow.ts"
)

for workflow in "${WORKFLOW_FILES[@]}"; do
  if [ -f "$BACKEND_DIR/$workflow" ]; then
    echo "⚠️  Marking for refactoring: $(basename $workflow)"
    # Add TODO comment at the top of the file
    if ! grep -q "TODO: REFACTOR" "$BACKEND_DIR/$workflow"; then
      sed -i '1s/^/\/\/ TODO: REFACTOR - Convert to real business workflow\n/' "$BACKEND_DIR/$workflow"
    fi
  fi
done

# STEP 6: Clean up showcase module
echo ""
echo "🔧 Step 6: Updating Showcase Module..."
echo "---------------------------------------------------"

SHOWCASE_MODULE="$BACKEND_DIR/showcase/showcase.module.ts"
if [ -f "$SHOWCASE_MODULE" ]; then
  echo "📝 Creating cleaned showcase.module.ts..."
  
  cat > "$SHOWCASE_MODULE" << 'EOF'
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { StreamingServiceAdapter } from '@hive-academy/langgraph-streaming';

// TODO: REFACTOR - This entire module will be replaced with business workflows

// Temporarily keep these for refactoring into real use cases
import { ResearchShowcaseAgent } from './agents/research-showcase.agent';
import { AnalysisShowcaseAgent } from './agents/analysis-showcase.agent';
import { ContentShowcaseAgent } from './agents/content-showcase.agent';

// Services
import { ShowcaseCoordinatorService } from './services/showcase-coordinator.service';
import { ShowcaseMetricsService } from './services/showcase-metrics.service';
import { ShowcaseAnalysisService } from './services/showcase-analysis.service';
import { ShowcaseContentService } from './services/showcase-content.service';
import { ShowcaseQualityService } from './services/showcase-quality.service';
import { ShowcaseNetworkService } from './services/showcase-network.service';

// Tools
import { ShowcaseSearchTools } from './tools/showcase-search.tools';

// Controller
import { ShowcaseController } from './controllers/showcase.controller';

@Module({
  imports: [
    // PROPERLY CONFIGURE WITH STREAMING!
    MultiAgentModule.forRootAsync({
      useFactory: async (streamingAdapter: StreamingServiceAdapter) => ({
        streamingAdapter,  // Enable real streaming!
      }),
      inject: [StreamingServiceAdapter],
    }),
  ],
  providers: [
    // Agents (to be refactored)
    ResearchShowcaseAgent,
    AnalysisShowcaseAgent,
    ContentShowcaseAgent,
    
    // Services
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
    ShowcaseAnalysisService,
    ShowcaseContentService,
    ShowcaseQualityService,
    ShowcaseNetworkService,
    
    // Tools
    ShowcaseSearchTools,
  ],
  controllers: [ShowcaseController],
  exports: [
    ShowcaseCoordinatorService,
    ShowcaseMetricsService,
    ShowcaseAnalysisService,
    ShowcaseContentService,
    ShowcaseQualityService,
    ShowcaseNetworkService,
    ShowcaseSearchTools,
  ],
})
export class ShowcaseModule {}
EOF
  echo "✅ Showcase module updated with streaming integration"
fi

# STEP 7: Create business workflow structure
echo ""
echo "📁 Step 7: Creating Business Workflow Structure..."
echo "---------------------------------------------------"

BUSINESS_DIR="$BACKEND_DIR/business-workflows"
mkdir -p "$BUSINESS_DIR/agents"
mkdir -p "$BUSINESS_DIR/workflows"
mkdir -p "$BUSINESS_DIR/services"
mkdir -p "$BUSINESS_DIR/controllers"

echo "✅ Created business workflow directories"

# Create example business workflow module
cat > "$BUSINESS_DIR/business-workflows.module.ts" << 'EOF'
import { Module } from '@nestjs/common';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { StreamingServiceAdapter } from '@hive-academy/langgraph-streaming';

// TODO: Import real business agents
// import { CustomerSupportAgent } from './agents/customer-support.agent';
// import { CodeReviewAgent } from './agents/code-review.agent';
// import { MarketAnalysisAgent } from './agents/market-analysis.agent';

// TODO: Import real business workflows
// import { CustomerSupportWorkflow } from './workflows/customer-support.workflow';
// import { CodeReviewWorkflow } from './workflows/code-review.workflow';

@Module({
  imports: [
    MultiAgentModule.forRootAsync({
      useFactory: async (streamingAdapter: StreamingServiceAdapter) => ({
        streamingAdapter,
        // Add your business configuration here
      }),
      inject: [StreamingServiceAdapter],
    }),
  ],
  providers: [
    // Add business agents here
  ],
  controllers: [
    // Add business controllers here
  ],
})
export class BusinessWorkflowsModule {}
EOF

# STEP 8: Summary
echo ""
echo "🎉 Backend Cleanup Summary"
echo "=================================================================="
echo ""
echo "✅ Removed:"
echo "   - Test controllers and services"
echo "   - Generic showcase agents (demo, advanced, specialist, etc.)"
echo "   - Test adapters references"
echo ""
echo "✅ Preserved for Refactoring:"
echo "   - Research agent (has Tavily integration)"
echo "   - Analysis agent (has LLM integration)"
echo "   - Content agent (has generation logic)"
echo "   - Core services and tools"
echo ""
echo "✅ Fixed:"
echo "   - Streaming properly wired in app.module.ts"
echo "   - Showcase module now uses StreamingServiceAdapter"
echo "   - Created business workflow structure"
echo ""
echo "📋 Next Steps:"
echo "   1. Create real business agents in business-workflows/agents/"
echo "   2. Implement business workflows with streaming decorators"
echo "   3. Replace showcase controller with business endpoints"
echo "   4. Update remaining agents to solve real problems"
echo "   5. Run 'npm run build' to verify compilation"
echo ""
echo "🚀 Backend ready for real business implementations!"