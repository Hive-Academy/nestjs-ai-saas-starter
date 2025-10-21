/**
 * Library Data Service
 *
 * Provides comprehensive information for all 13 libraries:
 * - 2 Databases (ChromaDB, Neo4j)
 * - 11 LangGraph Modules
 */
import { Injectable } from '@angular/core';

export interface LibraryFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface LibraryExample {
  title: string;
  code: string;
  language: string;
  description?: string;
}

export interface LibraryMetric {
  label: string;
  value: string;
  description?: string;
}

export interface Library {
  id: string;
  slug: string;
  name: string;
  category: 'database' | 'langgraph-module';
  tagline: string;
  description: string;
  icon: string;
  color:
    | 'green'
    | 'blue'
    | 'purple'
    | 'orange'
    | 'pink'
    | 'indigo'
    | 'cyan'
    | 'red';
  status: 'production' | 'beta' | 'alpha';
  version: string;
  features: LibraryFeature[];
  useCases: string[];
  examples: LibraryExample[];
  metrics: LibraryMetric[];
  architecture?: string;
  installation?: string;
  documentation?: string;
  github?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LibraryDataService {
  private libraries: Library[] = [
    // === DATABASES ===
    {
      id: 'chromadb',
      slug: 'chromadb',
      name: 'ChromaDB',
      category: 'database',
      tagline: 'Vector Database for Semantic Search',
      description:
        'Production-ready vector database integration with ChromaDB for semantic search, document embeddings, and RAG applications. Supports multiple embedding models and advanced query capabilities.',
      icon: '🔍',
      color: 'green',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Vector Embeddings',
          description:
            'Generate and store document embeddings using OpenAI, Cohere, or custom models',
          icon: '🧬',
        },
        {
          title: 'Semantic Search',
          description:
            'Find similar documents using cosine similarity and advanced query filters',
          icon: '🔎',
        },
        {
          title: 'Collection Management',
          description:
            'Organize documents into collections with metadata filtering',
          icon: '📁',
        },
        {
          title: 'Batch Operations',
          description:
            'Efficiently process large document sets with batching and streaming',
          icon: '⚡',
        },
        {
          title: 'Real-time Updates',
          description:
            'Add, update, and delete documents with immediate index updates',
          icon: '🔄',
        },
        {
          title: 'RAG Integration',
          description:
            'Seamless integration with LangChain for Retrieval-Augmented Generation',
          icon: '🤖',
        },
      ],
      useCases: [
        'Semantic document search',
        'Question-answering systems',
        'RAG applications',
        'Knowledge base search',
        'Document similarity matching',
        'Content recommendation engines',
      ],
      examples: [
        {
          title: 'Basic Document Search',
          language: 'typescript',
          code: `const results = await chromaDB.queryDocuments('my-collection', {
  queryTexts: ['What is machine learning?'],
  nResults: 5,
  where: { category: 'AI' }
});`,
          description:
            'Query documents with semantic search and metadata filters',
        },
      ],
      metrics: [
        {
          label: 'Query Speed',
          value: '<100ms',
          description: 'Average semantic search latency',
        },
        {
          label: 'Embedding Models',
          value: '10+',
          description: 'Supported embedding providers',
        },
        {
          label: 'Max Collection Size',
          value: '10M+',
          description: 'Documents per collection',
        },
      ],
      architecture: '8-service facade pattern with graceful degradation',
      installation: 'npm install @hive-academy/nestjs-chromadb',
      documentation: '/libs/nestjs-chromadb/README.md',
    },
    {
      id: 'neo4j',
      slug: 'neo4j',
      name: 'Neo4j',
      category: 'database',
      tagline: 'Graph Database for Relationship Modeling',
      description:
        'Enterprise-grade graph database integration for complex relationship modeling, knowledge graphs, and network analysis with Cypher query support.',
      icon: '🕸️',
      color: 'blue',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Graph Modeling',
          description:
            'Model complex relationships between entities with nodes and edges',
          icon: '🔗',
        },
        {
          title: 'Cypher Queries',
          description:
            'Powerful graph query language for pattern matching and traversal',
          icon: '📝',
        },
        {
          title: 'Knowledge Graphs',
          description: 'Build and query knowledge graphs for AI applications',
          icon: '🧠',
        },
        {
          title: 'Relationship Analysis',
          description:
            'Analyze connections, paths, and communities in your data',
          icon: '📊',
        },
        {
          title: 'ACID Transactions',
          description: 'Full transactional support for data integrity',
          icon: '🔒',
        },
        {
          title: 'Scalable Architecture',
          description: 'Handle millions of nodes and relationships efficiently',
          icon: '📈',
        },
      ],
      useCases: [
        'Knowledge graph construction',
        'Social network analysis',
        'Recommendation engines',
        'Fraud detection',
        'Network topology mapping',
        'Dependency tracking',
      ],
      examples: [
        {
          title: 'Create Relationships',
          language: 'typescript',
          code: `await neo4j.run(\`
  CREATE (user:User {name: $name})
  -[:FOLLOWS]->(friend:User {name: $friendName})
\`, { name: 'Alice', friendName: 'Bob' });`,
          description: 'Model relationships between entities using Cypher',
        },
      ],
      metrics: [
        {
          label: 'Query Performance',
          value: '<50ms',
          description: 'Graph traversal latency',
        },
        {
          label: 'Max Nodes',
          value: '100M+',
          description: 'Supported graph size',
        },
        {
          label: 'Relationship Types',
          value: 'Unlimited',
          description: 'Flexible schema',
        },
      ],
      architecture: 'Connection pool with automatic retry and health checks',
      installation: 'npm install @hive-academy/nestjs-neo4j',
      documentation: '/libs/nestjs-neo4j/README.md',
    },

    // === LANGGRAPH MODULES ===
    {
      id: 'core',
      slug: 'langgraph-core',
      name: 'LangGraph Core',
      category: 'langgraph-module',
      tagline: 'Foundation for AI Workflow Orchestration',
      description:
        'Core module providing the foundation for building stateful, multi-step AI workflows with graph-based execution, state management, and node orchestration.',
      icon: '⚙️',
      color: 'purple',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Graph-Based Workflows',
          description:
            'Define AI workflows as directed graphs with nodes and edges',
          icon: '🔀',
        },
        {
          title: 'State Management',
          description:
            'Automatic state persistence and transitions between workflow steps',
          icon: '💾',
        },
        {
          title: 'Node Orchestration',
          description:
            'Coordinate execution of workflow nodes with dependencies',
          icon: '🎯',
        },
        {
          title: 'Type-Safe APIs',
          description:
            'Fully typed interfaces for workflow definition and execution',
          icon: '🛡️',
        },
        {
          title: 'Error Handling',
          description: 'Built-in retry logic and error recovery mechanisms',
          icon: '🔄',
        },
        {
          title: 'Extensible Architecture',
          description: 'Plugin system for custom nodes and middleware',
          icon: '🔌',
        },
      ],
      useCases: [
        'Multi-step AI agents',
        'Document processing pipelines',
        'Conversational AI flows',
        'Data transformation workflows',
        'Approval workflows',
        'Complex business logic',
      ],
      examples: [
        {
          title: 'Define Workflow',
          language: 'typescript',
          code: `const workflow = new StateGraph({
  nodes: [analyzeNode, processNode, respondNode],
  edges: [
    { from: 'analyze', to: 'process' },
    { from: 'process', to: 'respond' }
  ]
});`,
          description:
            'Create a stateful workflow with multiple processing steps',
        },
      ],
      metrics: [
        {
          label: 'Execution Speed',
          value: '<10ms',
          description: 'Per-node overhead',
        },
        {
          label: 'Max Nodes',
          value: '1000+',
          description: 'Workflow complexity',
        },
        {
          label: 'State Size',
          value: '10MB+',
          description: 'Per-workflow state',
        },
      ],
      architecture: 'Event-driven graph execution with state snapshots',
      installation: 'npm install @hive-academy/langgraph-core',
      documentation: '/libs/langgraph-modules/core/README.md',
    },
    {
      id: 'memory',
      slug: 'langgraph-memory',
      name: 'Memory',
      category: 'langgraph-module',
      tagline: 'Contextual Memory for Intelligent Agents',
      description:
        'Advanced memory management for AI agents with short-term, long-term, and semantic memory capabilities for maintaining context across conversations.',
      icon: '🧠',
      color: 'pink',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Multi-Tier Memory',
          description: 'Short-term, long-term, and semantic memory layers',
          icon: '📚',
        },
        {
          title: 'Context Windows',
          description: 'Configurable context windows for conversation history',
          icon: '🪟',
        },
        {
          title: 'Semantic Recall',
          description: 'Retrieve relevant memories using vector similarity',
          icon: '🔍',
        },
        {
          title: 'Memory Consolidation',
          description:
            'Automatic summarization and compression of old memories',
          icon: '📦',
        },
        {
          title: 'User Profiles',
          description: 'Per-user memory isolation and personalization',
          icon: '👤',
        },
        {
          title: 'Memory Cleanup',
          description: 'Automatic expiration and garbage collection',
          icon: '🧹',
        },
      ],
      useCases: [
        'Conversational AI with context',
        'Multi-turn dialogue systems',
        'Personalized recommendations',
        'Customer support bots',
        'Educational tutoring agents',
        'Long-running agent interactions',
      ],
      examples: [
        {
          title: 'Store & Retrieve Memory',
          language: 'typescript',
          code: `await memory.store(userId, 'User prefers technical explanations');
const context = await memory.retrieve(userId, query);`,
          description: 'Maintain user context across conversations',
        },
      ],
      metrics: [
        {
          label: 'Recall Speed',
          value: '<50ms',
          description: 'Memory retrieval latency',
        },
        {
          label: 'Context Size',
          value: '100K tokens',
          description: 'Maximum context window',
        },
        {
          label: 'Memory Retention',
          value: '90 days',
          description: 'Default retention period',
        },
      ],
      architecture: '3-tier memory system with vector-backed semantic recall',
      installation: 'npm install @hive-academy/langgraph-memory',
      documentation: '/libs/langgraph-modules/memory/README.md',
    },
    {
      id: 'checkpoint',
      slug: 'langgraph-checkpoint',
      name: 'Checkpoint',
      category: 'langgraph-module',
      tagline: 'State Persistence with Auto-Fallback',
      description:
        'Automagical state persistence with 8-service facade pattern and automatic fallback to in-memory storage for zero-configuration start.',
      icon: '💾',
      color: 'green',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Auto-Fallback Storage',
          description:
            'Automatic fallback to MemorySaver for zero-config development',
          icon: '🔄',
        },
        {
          title: 'Multi-Storage Backends',
          description:
            'Support for SQLite, Redis, Postgres, and in-memory storage',
          icon: '🗄️',
        },
        {
          title: '8-Service Architecture',
          description: 'SOLID facade pattern with graceful degradation',
          icon: '🏗️',
        },
        {
          title: 'Auto-Cleanup',
          description:
            'Configurable retention policies and automatic state cleanup',
          icon: '🧹',
        },
        {
          title: 'Health Monitoring',
          description: 'Real-time health checks and performance metrics',
          icon: '📊',
        },
        {
          title: 'Ecosystem Integration',
          description:
            'Seamless integration with Multi-Agent, HITL, Workflow-Engine',
          icon: '🔗',
        },
      ],
      useCases: [
        'Workflow state persistence',
        'Agent conversation history',
        'Long-running process management',
        'Resume failed executions',
        'Audit trail maintenance',
        'State recovery after crashes',
      ],
      examples: [
        {
          title: 'Zero-Config Checkpoint',
          language: 'typescript',
          code: `const workflow = new StateGraph({
  checkpointSaver: checkpointService.getSaver()
});
// Automatically uses MemorySaver in dev, configured backend in prod`,
          description: 'Zero-config state persistence with auto-fallback',
        },
      ],
      metrics: [
        {
          label: 'Storage',
          value: 'Zero-Config',
          description: 'Auto-fallback to MemorySaver',
        },
        {
          label: 'Backends',
          value: '4+',
          description: 'SQLite, Redis, Postgres, Memory',
        },
        {
          label: 'Save Latency',
          value: '<20ms',
          description: 'Average checkpoint write time',
        },
      ],
      architecture: '8-service facade with MemorySaver fallback',
      installation: 'npm install @hive-academy/langgraph-checkpoint',
      documentation: '/libs/langgraph-modules/checkpoint/README.md',
    },
    {
      id: 'functional-api',
      slug: 'langgraph-functional-api',
      name: 'Functional API',
      category: 'langgraph-module',
      tagline: 'Functional Programming for AI Workflows',
      description:
        'Declarative, composable API for building AI workflows using functional programming patterns with immutable state and pure functions.',
      icon: '🔧',
      color: 'indigo',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Declarative Workflows',
          description: 'Define workflows using pure, composable functions',
          icon: '📝',
        },
        {
          title: 'Immutable State',
          description:
            'State transitions through pure functions without side effects',
          icon: '🔒',
        },
        {
          title: 'Function Composition',
          description: 'Chain and compose workflow nodes naturally',
          icon: '🔗',
        },
        {
          title: 'Type Inference',
          description: 'Automatic type inference for workflow state',
          icon: '🎯',
        },
        {
          title: 'Lazy Evaluation',
          description: 'Optimize execution with lazy evaluation strategies',
          icon: '⚡',
        },
        {
          title: 'Stream Processing',
          description:
            'Process data streams functionally with map/filter/reduce',
          icon: '🌊',
        },
      ],
      useCases: [
        'Data transformation pipelines',
        'Stateless API integrations',
        'Pure business logic workflows',
        'Functional reactive programming',
        'Stream processing applications',
        'Composable AI agents',
      ],
      examples: [
        {
          title: 'Functional Workflow',
          language: 'typescript',
          code: `const workflow = pipe(
  analyze,
  transform,
  validate,
  respond
);
const result = await workflow(input);`,
          description: 'Compose workflow steps as pure functions',
        },
      ],
      metrics: [
        {
          label: 'Composition',
          value: 'Unlimited',
          description: 'Function chaining depth',
        },
        {
          label: 'Performance',
          value: '0ms',
          description: 'Zero-overhead abstraction',
        },
        {
          label: 'Type Safety',
          value: '100%',
          description: 'Fully typed workflows',
        },
      ],
      architecture:
        'Functional programming with immutable state transformations',
      installation: 'npm install @hive-academy/langgraph-functional-api',
      documentation: '/libs/langgraph-modules/functional-api/README.md',
    },
    {
      id: 'multi-agent',
      slug: 'langgraph-multi-agent',
      name: 'Multi-Agent',
      category: 'langgraph-module',
      tagline: 'Coordinate Multiple AI Agents',
      description:
        'Advanced multi-agent coordination system for building teams of specialized AI agents that collaborate to solve complex tasks.',
      icon: '👥',
      color: 'orange',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Agent Orchestration',
          description:
            'Coordinate multiple specialized agents working together',
          icon: '🎭',
        },
        {
          title: 'Task Distribution',
          description:
            'Automatically distribute work across agent capabilities',
          icon: '📋',
        },
        {
          title: 'Inter-Agent Communication',
          description: 'Message passing and shared context between agents',
          icon: '💬',
        },
        {
          title: 'Supervisor Patterns',
          description: 'Hierarchical supervision and delegation strategies',
          icon: '👔',
        },
        {
          title: 'Consensus Building',
          description: 'Aggregate agent responses and reach consensus',
          icon: '🤝',
        },
        {
          title: 'Dynamic Scaling',
          description: 'Add or remove agents based on workload',
          icon: '📊',
        },
      ],
      useCases: [
        'Research assistant teams',
        'Code generation + review workflows',
        'Multi-perspective analysis',
        'Distributed problem solving',
        'Collaborative content creation',
        'Complex decision-making systems',
      ],
      examples: [
        {
          title: 'Agent Team',
          language: 'typescript',
          code: `const team = new AgentTeam([
  researchAgent,
  analysisAgent,
  writerAgent
]);
const result = await team.execute(task);`,
          description: 'Coordinate specialized agents to solve complex tasks',
        },
      ],
      metrics: [
        {
          label: 'Max Agents',
          value: '100+',
          description: 'Concurrent agent capacity',
        },
        {
          label: 'Coordination',
          value: '<50ms',
          description: 'Inter-agent latency',
        },
        {
          label: 'Throughput',
          value: '1000/s',
          description: 'Tasks per second',
        },
      ],
      architecture: 'Event-driven coordination with message bus',
      installation: 'npm install @hive-academy/langgraph-multi-agent',
      documentation: '/libs/langgraph-modules/multi-agent/README.md',
    },
    {
      id: 'platform',
      slug: 'langgraph-platform',
      name: 'Platform',
      category: 'langgraph-module',
      tagline: 'LangGraph Platform Integration',
      description:
        'LangGraph Platform integration with HTTP client for hosted assistants, thread management, and webhook events enabling hybrid cloud+local deployment.',
      icon: '☁️',
      color: 'cyan',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Hosted Assistants',
          description:
            'Manage assistants on LangGraph Platform cloud infrastructure',
          icon: '🤖',
        },
        {
          title: 'Thread Management',
          description:
            'Lifecycle operations with state persistence across sessions',
          icon: '🧵',
        },
        {
          title: 'Run Monitoring',
          description:
            'Execution monitoring with streaming support and real-time updates',
          icon: '📡',
        },
        {
          title: 'Webhook Events',
          description: 'Real-time notifications with secure payload handling',
          icon: '🔔',
        },
        {
          title: 'Retry Policy',
          description: 'Exponential backoff retry (3 retries, 30s max timeout)',
          icon: '🔄',
        },
        {
          title: 'Hybrid Deployment',
          description: 'Run local workflows alongside cloud-hosted assistants',
          icon: '🌐',
        },
      ],
      useCases: [
        'Cloud-hosted AI assistants',
        'Hybrid deployment architectures',
        'Scalable agent hosting',
        'Multi-tenant SaaS platforms',
        'Enterprise AI infrastructure',
        'Global agent distribution',
      ],
      examples: [
        {
          title: 'Hybrid Deployment',
          language: 'typescript',
          code: `// Run workflow locally or on LangGraph Platform
const assistant = await platform.createAssistant(config);
const thread = await platform.createThread();
const result = await platform.run(assistant, thread, input);`,
          description: 'Deploy workflows to LangGraph Platform for scalability',
        },
      ],
      metrics: [
        {
          label: 'Deployment',
          value: 'Hybrid',
          description: 'Local + Cloud hosting',
        },
        {
          label: 'Retry Policy',
          value: '3 retries',
          description: 'Exponential backoff',
        },
        { label: 'Timeout', value: '30s max', description: 'Request timeout' },
      ],
      architecture:
        'HTTP client with exponential backoff and webhook integration',
      installation: 'npm install @hive-academy/langgraph-platform',
      documentation: '/libs/langgraph-modules/platform/README.md',
    },
    {
      id: 'time-travel',
      slug: 'langgraph-time-travel',
      name: 'Time-Travel',
      category: 'langgraph-module',
      tagline: 'Workflow Debugging & Replay',
      description:
        'Sophisticated workflow debugging with replay, branching, and state comparison for temporal navigation through workflow execution history.',
      icon: '⏰',
      color: 'purple',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Workflow Replay',
          description:
            'Replay workflows from any checkpoint with state modifications',
          icon: '▶️',
        },
        {
          title: 'Branch Management',
          description:
            'Create execution branches for experimentation and A/B testing',
          icon: '🌿',
        },
        {
          title: 'State Comparison',
          description:
            'Deep diff analysis between workflow states and executions',
          icon: '🔍',
        },
        {
          title: 'Timeline Visualization',
          description: 'Visual execution history with interactive navigation',
          icon: '📊',
        },
        {
          title: 'Debug Sessions',
          description: 'Isolated debugging environments safe for production',
          icon: '🐛',
        },
        {
          title: 'Environment Settings',
          description: 'Configurable branch limits (3 prod, 10 dev)',
          icon: '⚙️',
        },
      ],
      useCases: [
        'Workflow debugging',
        'A/B testing agent behaviors',
        'Reproducing production bugs',
        'What-if scenario analysis',
        'Audit trail inspection',
        'Training data generation',
      ],
      examples: [
        {
          title: 'Replay Workflow',
          language: 'typescript',
          code: `const checkpoint = await timeTravel.getCheckpoint(runId, stepId);
const result = await timeTravel.replay(checkpoint, {
  modifiedState: { temperature: 0.5 }
});`,
          description:
            'Replay workflow execution from any point with modifications',
        },
      ],
      metrics: [
        {
          label: 'Replay Speed',
          value: '10x',
          description: 'Faster than real-time',
        },
        {
          label: 'Branch Limit',
          value: '3-10',
          description: 'Environment-based settings',
        },
        {
          label: 'History Size',
          value: '1000+',
          description: 'Checkpoints per workflow',
        },
      ],
      architecture: 'Checkpoint-based replay with branch management',
      installation: 'npm install @hive-academy/langgraph-time-travel',
      documentation: '/libs/langgraph-modules/time-travel/README.md',
    },
    {
      id: 'monitoring',
      slug: 'langgraph-monitoring',
      name: 'Monitoring',
      category: 'langgraph-module',
      tagline: 'Production Observability',
      description:
        'Production observability with 5-service facade for real-time metrics, intelligent alerting, and comprehensive health monitoring.',
      icon: '📊',
      color: 'blue',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Real-Time Metrics',
          description:
            'Collect counters, gauges, histograms, and timers in real-time',
          icon: '📈',
        },
        {
          title: 'Intelligent Alerting',
          description:
            'Multi-channel notifications with customizable thresholds',
          icon: '🚨',
        },
        {
          title: 'Health Checks',
          description:
            'Comprehensive health monitoring with dependency tracking',
          icon: '❤️',
        },
        {
          title: 'Anomaly Detection',
          description:
            'Performance baseline analysis and automatic anomaly detection',
          icon: '🔍',
        },
        {
          title: 'Prometheus Backend',
          description: 'Industry-standard metrics with batch processing',
          icon: '🎯',
        },
        {
          title: 'Dashboards',
          description: 'Visualization with customizable widgets and layouts',
          icon: '📊',
        },
      ],
      useCases: [
        'Production monitoring',
        'Performance optimization',
        'SLA compliance tracking',
        'Capacity planning',
        'Incident detection',
        'Cost optimization',
      ],
      examples: [
        {
          title: 'Track Metrics',
          language: 'typescript',
          code: `monitoring.counter('workflow.executions').inc();
monitoring.histogram('workflow.duration').observe(duration);
monitoring.gauge('active.agents').set(count);`,
          description: 'Collect production metrics with Prometheus',
        },
      ],
      metrics: [
        {
          label: 'Collection',
          value: 'Real-Time',
          description: 'Metrics collection frequency',
        },
        {
          label: 'Retention',
          value: '90 days',
          description: 'Historical data retention',
        },
        {
          label: 'Alert Latency',
          value: '<1s',
          description: 'Time to alert trigger',
        },
      ],
      architecture: '5-service facade with Prometheus backend',
      installation: 'npm install @hive-academy/langgraph-monitoring',
      documentation: '/libs/langgraph-modules/monitoring/README.md',
    },
    {
      id: 'hitl',
      slug: 'langgraph-hitl',
      name: 'HITL',
      category: 'langgraph-module',
      tagline: 'Human-in-the-Loop Workflows',
      description:
        'Human-in-the-loop patterns for approval workflows, expert review, and interactive agent supervision with configurable intervention points.',
      icon: '👤',
      color: 'pink',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Approval Workflows',
          description:
            'Pause workflows for human approval before critical actions',
          icon: '✅',
        },
        {
          title: 'Expert Review',
          description: 'Route complex decisions to human experts',
          icon: '👨‍💼',
        },
        {
          title: 'Interactive Supervision',
          description:
            'Real-time agent supervision with intervention capabilities',
          icon: '👁️',
        },
        {
          title: 'Feedback Collection',
          description: 'Capture human feedback for agent improvement',
          icon: '📝',
        },
        {
          title: 'Escalation Policies',
          description: 'Automatic escalation based on confidence thresholds',
          icon: '📢',
        },
        {
          title: 'Audit Trail',
          description: 'Complete logging of human decisions and interventions',
          icon: '📋',
        },
      ],
      useCases: [
        'Content moderation',
        'Financial approval workflows',
        'Medical diagnosis assistance',
        'Legal document review',
        'High-stakes decision making',
        'Quality assurance processes',
      ],
      examples: [
        {
          title: 'Approval Gate',
          language: 'typescript',
          code: `const workflow = new StateGraph({
  nodes: [analyzeNode, approvalGate, executeNode],
  edges: [
    { from: 'analyze', to: 'approval' },
    { from: 'approval', to: 'execute', condition: 'approved' }
  ]
});`,
          description: 'Pause workflow for human approval before execution',
        },
      ],
      metrics: [
        {
          label: 'Response Time',
          value: '<5min',
          description: 'Average approval latency',
        },
        {
          label: 'Escalation Rate',
          value: '5%',
          description: 'Auto-escalated requests',
        },
        {
          label: 'Approval Rate',
          value: '92%',
          description: 'Approved actions',
        },
      ],
      architecture: 'Event-driven with async approval queues',
      installation: 'npm install @hive-academy/langgraph-hitl',
      documentation: '/libs/langgraph-modules/hitl/README.md',
    },
    {
      id: 'streaming',
      slug: 'langgraph-streaming',
      name: 'Streaming',
      category: 'langgraph-module',
      tagline: 'Real-Time Data Processing',
      description:
        'Real-time streaming capabilities for processing data streams, live updates, and progressive workflow execution with backpressure handling.',
      icon: '🌊',
      color: 'cyan',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Stream Processing',
          description: 'Process data streams in real-time with low latency',
          icon: '⚡',
        },
        {
          title: 'Progressive Execution',
          description: 'Stream workflow results as they become available',
          icon: '📊',
        },
        {
          title: 'Backpressure Handling',
          description:
            'Automatic flow control to prevent overwhelming consumers',
          icon: '🚦',
        },
        {
          title: 'Live Updates',
          description: 'Real-time UI updates for long-running workflows',
          icon: '🔄',
        },
        {
          title: 'Event Streaming',
          description: 'Publish workflow events to downstream consumers',
          icon: '📡',
        },
        {
          title: 'Buffer Management',
          description: 'Configurable buffering strategies for optimization',
          icon: '💾',
        },
      ],
      useCases: [
        'Live chat applications',
        'Real-time analytics',
        'Progressive document generation',
        'Streaming transcription',
        'Live data visualization',
        'Event-driven architectures',
      ],
      examples: [
        {
          title: 'Stream Workflow',
          language: 'typescript',
          code: `for await (const chunk of workflow.stream(input)) {
  console.log('Progress:', chunk);
  // Send updates to client in real-time
}`,
          description: 'Stream workflow results progressively to clients',
        },
      ],
      metrics: [
        {
          label: 'Latency',
          value: '<10ms',
          description: 'Stream processing delay',
        },
        {
          label: 'Throughput',
          value: '10K/s',
          description: 'Events per second',
        },
        {
          label: 'Backpressure',
          value: 'Automatic',
          description: 'Flow control',
        },
      ],
      architecture: 'Reactive streams with backpressure support',
      installation: 'npm install @hive-academy/langgraph-streaming',
      documentation: '/libs/langgraph-modules/streaming/README.md',
    },
    {
      id: 'workflow-engine',
      slug: 'langgraph-workflow-engine',
      name: 'Workflow Engine',
      category: 'langgraph-module',
      tagline: 'Central Orchestration Engine',
      description:
        'Central orchestration engine for managing complex workflows, coordinating agents, and integrating all LangGraph modules into cohesive AI systems.',
      icon: '🎯',
      color: 'red',
      status: 'production',
      version: '1.0.0',
      features: [
        {
          title: 'Workflow Orchestration',
          description:
            'Centralized coordination of complex multi-step workflows',
          icon: '🎼',
        },
        {
          title: 'Module Integration',
          description: 'Seamlessly integrate all LangGraph modules',
          icon: '🔗',
        },
        {
          title: 'Execution Planning',
          description:
            'Optimal execution plans based on dependencies and resources',
          icon: '📋',
        },
        {
          title: 'Resource Management',
          description: 'Efficient allocation of compute and memory resources',
          icon: '💪',
        },
        {
          title: 'Error Recovery',
          description: 'Sophisticated retry and fallback strategies',
          icon: '🔄',
        },
        {
          title: 'Performance Optimization',
          description: 'Automatic workflow optimization and caching',
          icon: '⚡',
        },
      ],
      useCases: [
        'Enterprise workflow automation',
        'Complex AI agent systems',
        'Multi-module integration',
        'Business process automation',
        'End-to-end AI pipelines',
        'Orchestrated microservices',
      ],
      examples: [
        {
          title: 'Orchestrate Modules',
          language: 'typescript',
          code: `const engine = new WorkflowEngine({
  modules: [memory, checkpoint, multiAgent, monitoring],
  config: orchestrationConfig
});
const result = await engine.execute(workflow);`,
          description: 'Coordinate all LangGraph modules in unified workflows',
        },
      ],
      metrics: [
        {
          label: 'Orchestration',
          value: '<5ms',
          description: 'Per-step overhead',
        },
        {
          label: 'Module Support',
          value: 'All 11',
          description: 'Integrated modules',
        },
        {
          label: 'Throughput',
          value: '1000/s',
          description: 'Workflow executions',
        },
      ],
      architecture: 'Event-driven orchestration with module registry',
      installation: 'npm install @hive-academy/langgraph-workflow-engine',
      documentation: '/libs/langgraph-modules/workflow-engine/README.md',
    },
  ];

  getAllLibraries(): Library[] {
    return this.libraries;
  }

  getLibraryBySlug(slug: string): Library | undefined {
    return this.libraries.find((lib) => lib.slug === slug);
  }

  getLibrariesByCategory(category: 'database' | 'langgraph-module'): Library[] {
    return this.libraries.filter((lib) => lib.category === category);
  }

  getDatabases(): Library[] {
    return this.getLibrariesByCategory('database');
  }

  getLangGraphModules(): Library[] {
    return this.getLibrariesByCategory('langgraph-module');
  }
}
