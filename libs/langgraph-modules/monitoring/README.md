# @hive-academy/langgraph-modules-monitoring

Enterprise-grade observability and monitoring module for AI workflow systems built with LangGraph.

## Overview

The Monitoring Module provides comprehensive observability for AI agent workflows, enabling production-ready monitoring, alerting, and performance tracking for sophisticated AI applications.

### Core Philosophy

This module follows a **clean separation of concerns** approach - we provide the observability infrastructure, you add the business intelligence. Your AI workflow packages handle the technical operations while you implement monitoring for the metrics that matter to your specific business domain.

```typescript
// ✅ Clean Architecture: Separate concerns
@Module({
  imports: [
    // 🔧 INFRASTRUCTURE: AI workflow building blocks
    NestjsLanggraphModule.forRoot({...}),
    ChromaDBModule.forRoot({...}),
    Neo4jModule.forRoot({...}),

    // 📊 OBSERVABILITY: Monitoring as a separate concern
    LanggraphModulesMonitoringModule.forRoot({...})
  ]
})
export class YourAppModule {}
```

## Key Features

- **🎯 Real-time Metrics**: Collect custom business metrics and performance data
- **🚨 Smart Alerting**: Rule-based alerts with multi-channel notifications (Slack, email, PagerDuty)
- **💊 Health Monitoring**: System and dependency health checks with automatic recovery
- **📈 Performance Tracking**: Anomaly detection and baseline performance analysis
- **📊 Dashboard Integration**: Native support for Grafana, Prometheus, and custom dashboards
- **📋 Compliance**: Audit trails and regulatory compliance reporting
- **🔍 Distributed Tracing**: End-to-end workflow tracing and debugging

## Installation

```bash
npm install @hive-academy/langgraph-modules-monitoring
```

## Quick Start

### Basic Setup

```typescript
@Module({
  imports: [
    LanggraphModulesMonitoringModule.forRoot({
      metrics: {
        backend: 'prometheus',
        exportInterval: 30000,
      },
      alerting: {
        enabled: true,
        channels: ['slack', 'email'],
      },
      healthChecks: {
        enabled: true,
        interval: 60000,
      },
    }),
  ],
  providers: [YourAIService],
})
export class AppModule {}
```

### Business-Focused Monitoring

The real power comes from monitoring **your specific business logic** built on top of our AI packages:

```typescript
@Injectable()
export class ResearcherAgentService {
  constructor(
    private workflow: WorkflowService, // From @hive-academy/nestjs-langgraph
    private chromadb: ChromaDBService, // From @hive-academy/nestjs-chromadb
    private neo4j: Neo4jService, // From @hive-academy/nestjs-neo4j
    private monitoring: MonitoringFacadeService // Your business observability
  ) {}

  async researchTopic(topic: string): Promise<ResearchResult> {
    // 🎯 YOUR business metrics - only YOU know what matters
    await this.monitoring.recordCounter('research.topic.started', 1, {
      topic_category: this.categorize(topic),
      user_tier: this.getUserTier(),
      research_depth: 'comprehensive',
    });

    // Use our packages for the technical work
    const workflow = await this.workflow.execute('research-workflow', { topic });

    // 💰 Track YOUR business value
    await this.monitoring.recordMetric('research.value_generated', this.calculateBusinessValue(workflow.result), {
      research_quality: workflow.confidence,
      sources_found: workflow.sources.length,
      time_saved_hours: this.calculateTimeSaved(workflow),
    });

    return workflow.result;
  }
}
```

## Real-World Examples

### 🏢 Enterprise SaaS Application

```typescript
@Injectable()
export class CustomerSupportBotService {
  constructor(private workflow: WorkflowService, private memory: MemoryService, private chromadb: ChromaDBService, private monitoring: MonitoringFacadeService) {}

  async handleCustomerQuery(query: string, customerId: string): Promise<SupportResponse> {
    // SaaS business metrics
    await this.monitoring.recordCounter('support.interaction.started', 1, {
      customer_tier: await this.getCustomerTier(customerId),
      query_complexity: this.assessComplexity(query),
      support_channel: 'ai_bot',
      tenant_id: this.getTenantId(),
    });

    // Use our AI packages for technical implementation
    const context = await this.chromadb.search(query);
    const customerHistory = await this.memory.getCustomerContext(customerId);
    const response = await this.workflow.execute('support-workflow', {
      query,
      context,
      customerHistory,
    });

    // Track SaaS KPIs
    await this.monitoring.recordMetric('support.resolution.satisfaction', response.confidence, {
      resolution_time_ms: response.duration,
      escalation_needed: response.needsHuman,
      cost_saved_usd: this.calculateCostSavings(response),
      customer_lifetime_value: await this.getCLV(customerId),
    });

    return response;
  }
}
```

### 🎓 Educational Platform

```typescript
@Injectable()
export class LearningAssistantService {
  async provideLearningGuidance(studentQuery: string, studentId: string): Promise<LearningResponse> {
    // Education-specific metrics
    await this.monitoring.recordCounter('learning.session.started', 1, {
      student_level: await this.getStudentLevel(studentId),
      subject_area: this.identifySubject(studentQuery),
      learning_style: await this.getLearningStyle(studentId),
    });

    const guidance = await this.generateGuidance(studentQuery, studentId);

    // Track educational outcomes
    await this.monitoring.recordMetric('learning.comprehension.improvement', guidance.comprehensionScore, {
      engagement_level: guidance.engagementMetrics,
      knowledge_gap_filled: guidance.knowledgeGapsClosed,
      learning_velocity: guidance.learningVelocity,
    });

    return guidance;
  }
}
```

### 🔬 Research Laboratory

```typescript
@Injectable()
export class BiotechResearchService {
  async analyzeCompound(compoundData: CompoundData): Promise<AnalysisResult> {
    // Research-specific metrics
    await this.monitoring.recordCounter('research.compound.analysis.started', 1, {
      compound_type: compoundData.type,
      research_grant: this.getCurrentGrant(),
      lab_equipment_id: compoundData.equipmentUsed,
    });

    const analysis = await this.performAnalysis(compoundData);

    // Scientific outcome tracking
    await this.monitoring.recordMetric('research.discovery.potential', analysis.noveltyScore, {
      statistical_significance: analysis.pValue,
      reproducibility_score: analysis.reproducibility,
      clinical_trial_readiness: analysis.clinicalViability,
      publication_potential: analysis.publicationScore,
    });

    return analysis;
  }
}
```

## Architecture Benefits

### 🎯 **Focused Package Design**

Each package in the ecosystem has a single, clear responsibility:

```typescript
const packageResponsibilities = {
  '@hive-academy/nestjs-langgraph': 'AI workflow orchestration',
  '@hive-academy/nestjs-chromadb': 'Semantic search & vector operations',
  '@hive-academy/nestjs-neo4j': 'Graph relationships & analytics',
  '@hive-academy/langgraph-modules-monitoring': 'Production observability infrastructure',
  '@hive-academy/langgraph-modules-memory': 'AI agent memory management',
};

// ✅ Clean separation - no package tries to do everything
// ✅ Composable - mix and match what you need
// ✅ Business-focused - you define what success looks like
```

### 🧠 **Business Context Awareness**

Only **you** understand your business domain and what metrics actually matter:

```typescript
// 🎯 E-commerce Recommendation Engine
await this.monitoring.recordMetric('recommendation.conversion_impact', revenueGenerated, {
  recommendation_algorithm: 'graph_collaborative_filtering',
  user_segment: 'high_value_customers',
  product_category: 'electronics',
  business_impact: 'revenue_driving',
});

// 🎯 Healthcare Diagnostic Assistant
await this.monitoring.recordMetric('diagnosis.accuracy_confidence', diagnosticConfidence, {
  medical_specialty: 'cardiology',
  patient_risk_level: 'moderate',
  diagnostic_complexity: 'high',
  clinical_validation: 'peer_reviewed',
});

// Our packages can't know these business contexts - only you can!
```

## Monitoring Configuration

### Production Configuration

```typescript
@Module({
  imports: [
    LanggraphModulesMonitoringModule.forRoot({
      // Metrics Configuration
      metrics: {
        backend: 'prometheus',
        exportInterval: 15000,
        maxCardinality: 100000,
        retention: '90d',
      },

      // Alerting Configuration
      alerting: {
        enabled: true,
        evaluationInterval: 30000,
        channels: {
          slack: { webhook: process.env.SLACK_WEBHOOK },
          email: { smtp: process.env.SMTP_CONFIG },
          pagerduty: { routingKey: process.env.PAGERDUTY_KEY },
        },
        rules: [
          {
            name: 'high_error_rate',
            condition: 'workflow.error_rate > 0.05',
            severity: 'critical',
            channels: ['slack', 'pagerduty'],
          },
          {
            name: 'slow_response_time',
            condition: 'workflow.avg_duration > 30000',
            severity: 'warning',
            channels: ['slack'],
          },
        ],
      },

      // Health Checks
      healthChecks: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        dependencies: ['neo4j', 'chromadb', 'redis', 'openai'],
      },

      // Performance Tracking
      performance: {
        tracing: { enabled: true, samplingRate: 0.1 },
        anomalyDetection: true,
        baselineWindow: '24h',
      },
    }),
  ],
})
export class ProductionAppModule {}
```

### Development Configuration

```typescript
// Simpler setup for development
@Module({
  imports: [
    LanggraphModulesMonitoringModule.forRoot({
      metrics: { backend: 'memory' },
      alerting: { enabled: false },
      healthChecks: { enabled: true, interval: 60000 },
    }),
  ],
})
export class DevAppModule {}
```

## API Reference

### MonitoringFacadeService

Primary interface for all monitoring operations:

```typescript
// Record various metric types
await monitoring.recordCounter('workflow.executions', 1, { type: 'research' });
await monitoring.recordGauge('active.sessions', 42);
await monitoring.recordHistogram('response.time', 1250, { endpoint: '/api/search' });
await monitoring.recordTimer('operation.duration', 2500, { operation: 'vector_search' });

// Health check management
await monitoring.registerHealthCheck('custom_service', async () => {
  const isHealthy = await this.checkServiceHealth();
  return { status: isHealthy ? 'up' : 'down' };
});

// Alert management
const alertId = await monitoring.createAlertRule({
  name: 'business_kpi_alert',
  condition: 'revenue.daily < 10000',
  severity: 'high',
  channels: ['slack', 'email'],
});

// Query metrics for dashboards
const metrics = await monitoring.queryMetrics({
  metric: 'user.engagement.score',
  timeRange: '24h',
  aggregation: 'avg',
});
```

## Integration Examples

### Multi-Package AI System

```typescript
@Injectable()
export class IntelligentContentService {
  constructor(
    private workflow: WorkflowService, // LangGraph workflows
    private vectorDB: ChromaDBService, // Semantic search
    private graphDB: Neo4jService, // Relationship data
    private memory: MemoryService, // Conversational memory
    private monitoring: MonitoringFacadeService // Business observability
  ) {}

  async generatePersonalizedContent(userId: string, topic: string): Promise<Content> {
    // Start business tracking
    const startTime = Date.now();
    await this.monitoring.recordCounter('content.generation.started', 1, {
      user_segment: await this.getUserSegment(userId),
      content_type: this.getContentType(topic),
      personalization_level: 'high',
    });

    try {
      // Use multiple packages together
      const userPreferences = await this.vectorDB.findSimilar(`user preferences for ${topic}`);

      const userHistory = await this.graphDB.getUserJourney(userId);
      const conversationalContext = await this.memory.getContext(userId);

      const content = await this.workflow.execute('content-generation', {
        topic,
        preferences: userPreferences,
        history: userHistory,
        context: conversationalContext,
      });

      // Track business success metrics
      await this.monitoring.recordMetric('content.engagement.predicted', content.engagementScore, {
        content_length: content.wordCount,
        personalization_accuracy: content.relevanceScore,
        generation_time_ms: Date.now() - startTime,
      });

      return content;
    } catch (error) {
      await this.monitoring.recordCounter('content.generation.failed', 1, {
        error_type: error.constructor.name,
        failure_stage: this.identifyFailureStage(error),
      });
      throw error;
    }
  }
}
```

## Why This Architecture Works

### 🎯 **Package Focus**

- Each package excels at **one specific capability**
- No package tries to guess your business metrics
- Clean interfaces and clear responsibilities

### 🧠 **Business Intelligence Where It Belongs**

- **You** define what success looks like for your domain
- **You** track the KPIs that matter to your business
- **You** set the alert thresholds based on your SLAs

### 🔧 **Maximum Flexibility**

- Mix and match packages based on your needs
- Implement monitoring that fits your industry
- Scale observability as your application grows

### 🚀 **Enterprise Ready**

- Production-grade monitoring infrastructure
- Support for all major observability backends
- Compliance and audit trail capabilities

## Getting Started

1. **Install the monitoring module**:

   ```bash
   npm install @hive-academy/langgraph-modules-monitoring
   ```

2. **Add basic configuration**:

   ```typescript
   LanggraphModulesMonitoringModule.forRoot({
     metrics: { backend: 'memory' }, // Start simple
     healthChecks: { enabled: true },
   });
   ```

3. **Start tracking YOUR business metrics**:

   ```typescript
   await this.monitoring.recordMetric('your.business.kpi', value, {
     context: 'that matters to you',
   });
   ```

4. **Scale up with production backends**:
   ```typescript
   // When ready, integrate with Prometheus, Grafana, etc.
   metrics: {
     backend: 'prometheus';
   }
   ```

## Support

- 📚 [Full Documentation](./docs/monitoring-guide.md)
- 🎯 [Best Practices](./docs/best-practices.md)
- 🔧 [Configuration Reference](./docs/configuration.md)
- 🚀 [Production Setup](./docs/production-guide.md)

---

**Built with ❤️ for the AI development community**

_Part of the `@hive-academy` ecosystem for building sophisticated AI applications_
