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

# =============================================================================
# CHROMADB CONFIGURATION (REQUIRED)
# =============================================================================
# ChromaDB Connection - REQUIRED in production, no defaults
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
CHROMADB_SSL=false
CHROMADB_TENANT=default_tenant
CHROMADB_DATABASE=default_database

# HTTP Configuration
CHROMADB_TIMEOUT=30000
CHROMADB_MAX_RETRIES=3
CHROMADB_RETRY_DELAY=1000
CHROMADB_RETRY_BACKOFF_FACTOR=2

# Embedding Provider Configuration
# Choose one: openai, huggingface, cohere, custom
EMBEDDING_PROVIDER=openai

# OpenAI Embedding Configuration (if using openai provider)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_ENDPOINT=https://api.openai.com/v1/embeddings
OPENAI_ORGANIZATION=your_organization_id
OPENAI_EMBEDDING_DIMENSIONS=1536
OPENAI_BATCH_SIZE=100
OPENAI_MAX_INPUT_TOKENS=8191

# HuggingFace Embedding Configuration (if using huggingface provider)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
HUGGINGFACE_MODEL=sentence-transformers/all-MiniLM-L6-v2
HUGGINGFACE_API_ENDPOINT=https://router.huggingface.co/hf-inference/pipeline/feature-extraction
HUGGINGFACE_DIMENSIONS=384
HUGGINGFACE_BATCH_SIZE=50

# Cohere Embedding Configuration (if using cohere provider)
COHERE_API_KEY=your_cohere_api_key_here
COHERE_MODEL=embed-english-v3.0
COHERE_API_ENDPOINT=https://api.cohere.ai/v1/embed
COHERE_DIMENSIONS=1024
COHERE_BATCH_SIZE=96

# Text Processing Configuration
TEXT_CHUNK_SIZE=1000
TEXT_CHUNK_OVERLAP=200
TEXT_MAX_LENGTH=8000

# Collection Configuration
DEFAULT_COLLECTION_NAME=documents
DEFAULT_BATCH_SIZE=100

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# Logging Configuration
LOG_CONNECTION_DETAILS=true
LOG_EMBEDDING_OPERATIONS=false

# =============================================================================
# OTHER APPLICATION SETTINGS
# =============================================================================

# Debug Configuration
DEBUG_ENABLED=true
DEBUG_LOG_LEVEL=info
LANGGRAPH_DEBUG=false

# Checkpoint Module (App-level settings)
CHECKPOINT_ENABLED=true
CHECKPOINT_STORAGE=memory
CHECKPOINT_MAX_COUNT=100
CHECKPOINT_INTERVAL_MS=1000
CHECKPOINT_MAX_AGE=604800000          # 7 days in milliseconds
CHECKPOINT_MAX_PER_THREAD=100         # Max checkpoints per thread
CHECKPOINT_CLEANUP_INTERVAL=3600000   # 1 hour in milliseconds
CHECKPOINT_SQLITE_PATH=./data/checkpoints.db
CHECKPOINT_REDIS_PREFIX=checkpoints:
CHECKPOINT_REDIS_TTL=86400            # 24 hours in seconds

# Redis configuration (if using redis storage for checkpoints)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL configuration (if using postgres storage for checkpoints)
POSTGRES_CONNECTION_STRING=
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=checkpoints
POSTGRES_USER=
POSTGRES_PASSWORD=

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
