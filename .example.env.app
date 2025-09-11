# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
# This file contains only application-specific settings
# All library/module configurations are in their respective .env files:
#   - .env.chromadb   (ChromaDB + Memory configuration)
#   - .env.neo4j      (Neo4j configuration)
#   - .env.llm        (LLM providers configuration)
#   - .env.platform   (LangGraph platform configuration)
# =============================================================================

# Application Settings
PORT=3000
NODE_ENV=development

# Debug Configuration  
DEBUG_ENABLED=true
DEBUG_LOG_LEVEL=info
LANGGRAPH_DEBUG=false

# Checkpoint Module (App-level settings)
CHECKPOINT_ENABLED=true
CHECKPOINT_STORAGE=memory
CHECKPOINT_MAX_COUNT=100
CHECKPOINT_INTERVAL_MS=1000

# Redis configuration (if using redis storage for checkpoints)
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring Module (App-level settings)
MONITORING_ENABLED=true
MONITORING_WORKFLOW=true
MONITORING_AGENTS=true
MONITORING_PERFORMANCE=true
MONITORING_ALERTING_ENABLED=true
MONITORING_ERROR_RATE_THRESHOLD=0.05
MONITORING_LATENCY_THRESHOLD_MS=5000

# Time Travel Module (App-level settings)
TIME_TRAVEL_ENABLED=true
TIME_TRAVEL_MAX_SNAPSHOTS=50
TIME_TRAVEL_DEBUG_MODE=false

# Streaming Module (App-level settings)
STREAMING_ENABLED=true
STREAMING_TOKENS=true
STREAMING_EVENTS=true
STREAMING_PROGRESS=true

# WebSocket Configuration (App-level settings)
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001
WEBSOCKET_CORS=true

# HITL (Human-in-the-Loop) Module (App-level settings)
HITL_ENABLED=true
HITL_CONFIDENCE_THRESHOLD=0.7
HITL_RISK_LOW=0.3
HITL_RISK_MEDIUM=0.6
HITL_RISK_HIGH=0.8
HITL_RISK_CRITICAL=0.95
HITL_TIMEOUT_MS=1800000

# Tool System (App-level settings)
TOOLS_AUTO_DISCOVER=true
TOOLS_VALIDATION=true
TOOLS_CACHE=true

# Compilation (App-level settings)
COMPILATION_CACHE=true
COMPILATION_EAGER=false
COMPILATION_MAX_CACHE_SIZE=50