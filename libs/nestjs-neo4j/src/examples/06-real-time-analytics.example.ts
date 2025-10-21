/**
 * @fileoverview Real-Time Analytics and Streaming Example
 *
 * Demonstrates:
 * - Real-time data processing
 * - Live analytics dashboards
 * - Event-driven architecture
 * - Stream processing patterns
 * - WebSocket integration
 * - Time-series analysis
 * - Performance optimization for high-throughput
 */

import {
  Injectable,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  NotNull,
  Neo4jRepositoryBase,
  InjectNeogma,
  NeogmaService,
  Safe,
  Authorize,
  CypherQuery,
  Transactional,
  PropIndex,
} from '../index';

// ============================================================================
// 1. REAL-TIME ANALYTICS ENTITIES
// ============================================================================

@Neo4jEntity('Event')
export class Event {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'event_type_index' })
  eventType:
    | 'page_view'
    | 'click'
    | 'purchase'
    | 'sign_up'
    | 'conversion'
    | 'api_call'
    | 'error';

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'event_source_index' })
  source: 'web' | 'mobile' | 'api' | 'system';

  @Neo4jProp()
  @PropIndex({ name: 'event_user_index' })
  userId?: string;

  @Neo4jProp()
  @PropIndex({ name: 'event_session_index' })
  sessionId: string;

  @Neo4jProp()
  @PropIndex({ name: 'event_tenant_index' })
  tenantId?: string;

  @Neo4jProp()
  properties: {
    page?: string;
    element?: string;
    value?: number;
    currency?: string;
    category?: string;
    metadata?: Record<string, any>;
  };

  @Neo4jProp()
  context: {
    userAgent: string;
    ipAddress: string;
    referrer?: string;
    country?: string;
    city?: string;
    device: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
  };

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'event_value_index' })
  value: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'event_timestamp_index' })
  timestamp: Date;

  @CreatedAt()
  createdAt: Date;

  [key: string]: any;
}

@Neo4jEntity('Session')
export class Session {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @PropIndex({ name: 'session_user_index' })
  userId?: string;

  @Neo4jProp()
  @PropIndex({ name: 'session_tenant_index' })
  tenantId?: string;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'session_start_index' })
  startTime: Date;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'session_end_index' })
  endTime?: Date;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'session_duration_index' })
  duration?: number; // in seconds

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'session_events_index' })
  eventCount: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'session_value_index' })
  totalValue: number;

  @Neo4jProp()
  @PropIndex({ name: 'session_device_index' })
  device: 'desktop' | 'mobile' | 'tablet';

  @Neo4jProp()
  @PropIndex({ name: 'session_country_index' })
  country?: string;

  @Neo4jProp()
  @PropIndex({ name: 'session_source_index' })
  acquisitionSource?: string;

  @Neo4jProp()
  @PropIndex({ name: 'session_converted_index' })
  converted: boolean;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  [key: string]: any;
}

@Neo4jEntity('MetricSnapshot')
export class MetricSnapshot {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'metric_name_index' })
  metricName: string;

  @Neo4jProp()
  @PropIndex({ name: 'metric_tenant_index' })
  tenantId?: string;

  @Neo4jProp()
  @PropIndex({ name: 'metric_category_index' })
  category: 'business' | 'technical' | 'user_engagement' | 'performance';

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'metric_value_index' })
  value: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'metric_timestamp_index' })
  timestamp: Date;

  @Neo4jProp()
  aggregationType: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'percentile';

  @Neo4jProp()
  timeWindow: 'minute' | 'hour' | 'day' | 'week' | 'month';

  @Neo4jProp()
  dimensions: Record<string, string>; // Additional grouping dimensions

  @CreatedAt()
  createdAt: Date;

  [key: string]: any;
}

// ============================================================================
// 2. REAL-TIME ANALYTICS INTERFACES
// ============================================================================

export interface EventInput {
  eventType: Event['eventType'];
  source: Event['source'];
  userId?: string;
  sessionId: string;
  tenantId?: string;
  properties?: Event['properties'];
  context: Event['context'];
  value?: number;
}

export interface RealTimeMetrics {
  currentUsers: number;
  eventsPerSecond: number;
  sessionsActive: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number }>;
  topEvents: Array<{ eventType: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  geoBreakdown: Record<string, number>;
  revenueTotal: number;
  errorRate: number;
}

export interface TrendAnalysis {
  metric: string;
  timeRange: 'hour' | 'day' | 'week' | 'month';
  dataPoints: Array<{
    timestamp: Date;
    value: number;
    change?: number; // Percentage change from previous period
  }>;
  summary: {
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
    seasonalityDetected: boolean;
    anomaliesDetected: number;
  };
}

export interface FunnelAnalysis {
  steps: Array<{
    name: string;
    eventType: string;
    users: number;
    dropoffRate: number;
    conversionRate: number;
  }>;
  overallConversionRate: number;
  bottleneck: string;
  recommendations: string[];
}

// ============================================================================
// 3. HIGH-PERFORMANCE EVENT REPOSITORY
// ============================================================================

/**
 * EventRepository - demonstrates TypeORM-style inheritance pattern
 *
 * Inherited CRUD methods from Neo4jRepositoryBase<Event>:
 * - findById(id: string): Promise<Event | null>
 * - findAll(options?: FindOptions<Event>): Promise<Event[]>
 * - findOne(options: FindOptions<Event>): Promise<Event | null>
 * - create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event>
 * - update(id: string, updates: Partial<Event>): Promise<Event | null>
 * - delete(id: string, detach?: boolean): Promise<boolean>
 * - count(where?: Partial<Event>): Promise<number>
 * - exists(id: string): Promise<boolean>
 * - save(data: Partial<Event>): Promise<Event>
 */
@Injectable()
export class EventRepository extends Neo4jRepositoryBase<Event> {
  // NO manual CRUD delegation needed - all inherited from base class!

  /**
   * Batch insert events for high throughput
   * Uses inherited executeQuery() method
   */
  @Safe({ strict: true })
  @Transactional()
  async batchInsertEvents(events: EventInput[]): Promise<number> {
    if (events.length === 0) return 0;

    const queryBuilder = this.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Prepare events with timestamps
    const preparedEvents = events.map((event) => ({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      createdAt: new Date(),
    }));

    const eventsParam = bindParam.add(preparedEvents);

    queryBuilder
      .unwind(`$${eventsParam} as eventData`)
      .create(
        `(e:Event {
        id: eventData.id,
        eventType: eventData.eventType,
        source: eventData.source,
        userId: eventData.userId,
        sessionId: eventData.sessionId,
        tenantId: eventData.tenantId,
        properties: eventData.properties,
        context: eventData.context,
        value: eventData.value,
        timestamp: eventData.timestamp,
        createdAt: eventData.createdAt
      })`
      )
      .return('count(e) as insertedCount');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.executeQuery(cypher, params);
    return result.records[0]?.get('insertedCount').toNumber() || 0;
  }

  /**
   * Get events in time range with efficient pagination
   * Uses inherited executeQuery() method
   */
  @Safe({ strict: true })
  @CypherQuery({ cache: '30s' }) // 30 second cache for recent data
  async getEventsInTimeRange(
    startTime: Date,
    endTime: Date,
    filters?: {
      eventType?: Event['eventType'];
      source?: Event['source'];
      tenantId?: string;
      userId?: string;
    },
    limit = 1000
  ): Promise<Event[]> {
    const queryBuilder = this.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Add time range parameters
    const startTimeParam = bindParam.add(startTime);
    const endTimeParam = bindParam.add(endTime);

    queryBuilder.match('(e:Event)');

    // Time range filter
    queryBuilder.where(
      `e.timestamp >= $${startTimeParam} AND e.timestamp <= $${endTimeParam}`
    );

    // Additional filters
    const filterConditions: string[] = [];

    if (filters?.eventType) {
      const eventTypeParam = bindParam.add(filters.eventType);
      filterConditions.push(`e.eventType = $${eventTypeParam}`);
    }

    if (filters?.source) {
      const sourceParam = bindParam.add(filters.source);
      filterConditions.push(`e.source = $${sourceParam}`);
    }

    if (filters?.tenantId) {
      const tenantIdParam = bindParam.add(filters.tenantId);
      filterConditions.push(`e.tenantId = $${tenantIdParam}`);
    }

    if (filters?.userId) {
      const userIdParam = bindParam.add(filters.userId);
      filterConditions.push(`e.userId = $${userIdParam}`);
    }

    if (filterConditions.length > 0) {
      queryBuilder.where(filterConditions.join(' AND '));
    }

    queryBuilder.return('e').orderBy('e.timestamp DESC').limit(limit);

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.executeQuery(cypher, params);
    return result.records.map((record) => record.get('e').properties as Event);
  }

  /**
   * Real-time aggregation query for live metrics
   * Uses inherited createQueryBuilder() and executeQuery() methods
   */
  @Safe({ strict: true })
  async getLiveMetrics(timeWindow = 300): Promise<RealTimeMetrics> {
    // 5 minutes default
    const windowStart = new Date(Date.now() - timeWindow * 1000);

    // Main metrics query
    const mainBuilder = this.createQueryBuilder();
    const mainBindParam = mainBuilder.getBindParam();
    const windowStartParam = mainBindParam.add(windowStart);
    const timeWindowSecondsParam = mainBindParam.add(timeWindow);

    mainBuilder
      .match('(e:Event)')
      .where(`e.timestamp >= $${windowStartParam}`)
      .raw('OPTIONAL MATCH (s:Session)')
      .where(`s.startTime >= $${windowStartParam} AND s.endTime IS NULL`)
      .return(`
        count(DISTINCT e.userId) as currentUsers,
        count(e) / $${timeWindowSecondsParam} as eventsPerSecond,
        count(DISTINCT s) as sessionsActive,
        sum(CASE WHEN e.eventType = 'conversion' THEN 1 ELSE 0 END) /
          count(DISTINCT e.sessionId) as conversionRate,
        sum(CASE WHEN e.eventType = 'purchase' THEN e.value ELSE 0 END) as revenueTotal,
        sum(CASE WHEN e.eventType = 'error' THEN 1 ELSE 0 END) / count(e) as errorRate,
        collect(DISTINCT {page: e.properties.page, device: e.context.device}) as pageDeviceData
      `);

    const mainCypher = mainBuilder.getStatement();
    const mainParams = mainBindParam.get();
    const result = await this.executeQuery(mainCypher, mainParams);
    const record = result.records[0];

    // Get top pages separately for better performance
    const topPagesBuilder = this.createQueryBuilder();
    const topPagesBindParam = topPagesBuilder.getBindParam();
    const windowStartParam2 = topPagesBindParam.add(windowStart);

    topPagesBuilder
      .match('(e:Event)')
      .where(
        `e.timestamp >= $${windowStartParam2} AND e.properties.page IS NOT NULL`
      )
      .return('e.properties.page as page, count(*) as views')
      .orderBy('views DESC')
      .limit(10);

    const topPagesCypher = topPagesBuilder.getStatement();
    const topPagesParams = topPagesBindParam.get();
    const topPagesResult = await this.executeQuery(
      topPagesCypher,
      topPagesParams
    );
    const topPages = topPagesResult.records.map((r) => ({
      page: r.get('page'),
      views: r.get('views').toNumber(),
    }));

    // Get top events
    const topEventsBuilder = this.createQueryBuilder();
    const topEventsBindParam = topEventsBuilder.getBindParam();
    const windowStartParam3 = topEventsBindParam.add(windowStart);

    topEventsBuilder
      .match('(e:Event)')
      .where(`e.timestamp >= $${windowStartParam3}`)
      .return('e.eventType as eventType, count(*) as count')
      .orderBy('count DESC')
      .limit(10);

    const topEventsCypher = topEventsBuilder.getStatement();
    const topEventsParams = topEventsBindParam.get();
    const topEventsResult = await this.executeQuery(
      topEventsCypher,
      topEventsParams
    );
    const topEvents = topEventsResult.records.map((r) => ({
      eventType: r.get('eventType'),
      count: r.get('count').toNumber(),
    }));

    // Process device breakdown
    const deviceBreakdown: Record<string, number> = {};
    const geoBreakdown: Record<string, number> = {};

    // These would be calculated from pageDeviceData or separate queries

    return {
      currentUsers: record.get('currentUsers').toNumber(),
      eventsPerSecond: record.get('eventsPerSecond').toNumber(),
      sessionsActive: record.get('sessionsActive').toNumber(),
      conversionRate: record.get('conversionRate').toNumber(),
      topPages,
      topEvents,
      deviceBreakdown,
      geoBreakdown,
      revenueTotal: record.get('revenueTotal').toNumber(),
      errorRate: record.get('errorRate').toNumber(),
    };
  }
}

// ============================================================================
// 4. REAL-TIME ANALYTICS SERVICE
// ============================================================================

@Injectable()
export class RealTimeAnalyticsService {
  private readonly eventBuffer: EventInput[] = [];
  private readonly flushInterval = 5000; // 5 seconds

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly eventEmitter: EventEmitter2,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {
    // No model registration needed - @Repository decorator handles it
    this.startEventFlusher();
  }

  /**
   * Track event with buffering for high throughput
   */
  @Safe({ strict: true })
  async trackEvent(eventData: EventInput): Promise<void> {
    // Add to buffer for batch processing
    this.eventBuffer.push({
      ...eventData,
    });

    // Emit for real-time processing
    this.eventEmitter.emit('event.tracked', eventData);

    // Flush immediately if buffer is getting large
    if (this.eventBuffer.length >= 100) {
      await this.flushEvents();
    }
  }

  /**
   * Get real-time metrics with live updates
   */
  @Safe({ strict: true })
  async getRealTimeMetrics(timeWindow = 300): Promise<RealTimeMetrics> {
    return this.eventRepo.getLiveMetrics(timeWindow);
  }

  /**
   * Trend analysis with statistical insights
   */
  @Safe({ strict: true })
  @CypherQuery({ cache: '1m' }) // 1 minute cache
  async getTrendAnalysis(
    metric: string,
    timeRange: 'hour' | 'day' | 'week' | 'month',
    tenantId?: string
  ): Promise<TrendAnalysis> {
    // Calculate time intervals
    const now = new Date();
    let startTime: Date;
    // let intervalSize: number;
    // let intervals: number;

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        // intervalSize = 5 * 60 * 1000; // 5 minutes
        // intervals = 12;
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // intervalSize = 60 * 60 * 1000; // 1 hour
        // intervals = 24;
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        // intervalSize = 24 * 60 * 60 * 1000; // 1 day
        // intervals = 7;
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        // intervalSize = 24 * 60 * 60 * 1000; // 1 day
        // intervals = 30;
        break;
    }

    // Generate time series data
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const metricParam = bindParam.add(metric);
    const startTimeParam = bindParam.add(startTime);
    const timeWindowParam = bindParam.add(timeRange);

    let whereClause = `m.metricName = $${metricParam} AND m.timestamp >= $${startTimeParam} AND m.timeWindow = $${timeWindowParam}`;

    if (tenantId) {
      const tenantIdParam = bindParam.add(tenantId);
      whereClause += ` AND m.tenantId = $${tenantIdParam}`;
    }

    queryBuilder
      .match('(m:MetricSnapshot)')
      .where(whereClause)
      .return(
        `
        m.timestamp as timestamp,
        m.value as value
      `
      )
      .orderBy('timestamp ASC');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    const dataPoints = result.records.map((record) => ({
      timestamp: record.get('timestamp'),
      value: record.get('value').toNumber(),
    }));

    // Calculate changes and trends
    const dataPointsWithChanges = dataPoints.map((point, index: number) => {
      const change =
        index > 0
          ? ((point.value - dataPoints[index - 1].value) /
              dataPoints[index - 1].value) *
            100
          : 0;

      return { ...point, change };
    });

    // Analyze trend
    const values = dataPoints.map((p: any) => p.value);
    const avgChange =
      dataPointsWithChanges
        .filter((p: any) => p.change !== 0)
        .reduce((sum: number, p: any) => sum + p.change, 0) /
      (dataPointsWithChanges.length - 1);

    const trend = avgChange > 5 ? 'up' : avgChange < -5 ? 'down' : 'stable';

    // Detect anomalies (simple threshold-based)
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    const anomaliesDetected = values.filter(
      (v) => Math.abs(v - mean) > 2 * stdDev
    ).length;

    return {
      metric,
      timeRange,
      dataPoints: dataPointsWithChanges,
      summary: {
        trend,
        changePercent: avgChange,
        seasonalityDetected: false, // Would need more sophisticated analysis
        anomaliesDetected,
      },
    };
  }

  /**
   * Funnel analysis for conversion tracking
   */
  @Safe({ strict: true })
  async getFunnelAnalysis(
    funnelSteps: Array<{ name: string; eventType: string }>,
    timeRange: { start: Date; end: Date },
    tenantId?: string
  ): Promise<FunnelAnalysis> {
    const steps = [];
    let previousStepUsers = 0;

    for (let i = 0; i < funnelSteps.length; i++) {
      const step = funnelSteps[i];

      // Count users who completed this step
      const stepBuilder = this.neogma.createQueryBuilder();
      const stepBindParam = stepBuilder.getBindParam();

      const eventTypeParam = stepBindParam.add(step.eventType);
      const startTimeParam = stepBindParam.add(timeRange.start);
      const endTimeParam = stepBindParam.add(timeRange.end);

      let whereClause = `e.eventType = $${eventTypeParam} AND e.timestamp >= $${startTimeParam} AND e.timestamp <= $${endTimeParam}`;

      if (tenantId) {
        const tenantIdParam = stepBindParam.add(tenantId);
        whereClause += ` AND e.tenantId = $${tenantIdParam}`;
      }

      stepBuilder
        .match('(e:Event)')
        .where(whereClause)
        .return('count(DISTINCT e.userId) as users');

      const stepCypher = stepBuilder.getStatement();
      const stepParams = stepBindParam.get();
      const stepResult = await this.neogma.run(stepCypher, stepParams);
      const users = stepResult.records[0]?.get('users').toNumber() || 0;

      const dropoffRate =
        i > 0 ? ((previousStepUsers - users) / previousStepUsers) * 100 : 0;
      const conversionRate = i > 0 ? (users / previousStepUsers) * 100 : 100;

      steps.push({
        name: step.name,
        eventType: step.eventType,
        users,
        dropoffRate,
        conversionRate,
      });

      previousStepUsers = users;
    }

    // Calculate overall conversion rate
    const overallConversionRate =
      steps.length > 1
        ? (steps[steps.length - 1].users / steps[0].users) * 100
        : 0;

    // Find bottleneck (step with highest dropoff rate)
    const bottleneck =
      steps
        .filter((step) => step.dropoffRate > 0)
        .sort((a, b) => b.dropoffRate - a.dropoffRate)[0]?.name ||
      'None identified';

    // Generate recommendations
    const recommendations: string[] = [];
    steps.forEach((step) => {
      if (step.dropoffRate > 30) {
        recommendations.push(
          `Optimize ${
            step.name
          } - high dropoff rate of ${step.dropoffRate.toFixed(1)}%`
        );
      }
    });

    return {
      steps,
      overallConversionRate,
      bottleneck,
      recommendations,
    };
  }

  /**
   * Store metric snapshot for historical tracking
   */
  @Safe({ strict: true })
  @Transactional()
  async storeMetricSnapshot(
    metricName: string,
    value: number,
    category: MetricSnapshot['category'],
    aggregationType: MetricSnapshot['aggregationType'],
    timeWindow: MetricSnapshot['timeWindow'],
    tenantId?: string,
    dimensions?: Record<string, string>
  ): Promise<MetricSnapshot> {
    // Create MetricSnapshot using QueryBuilder
    const createBuilder = this.neogma.createQueryBuilder();
    const createBindParam = createBuilder.getBindParam();

    const metricNameParam = createBindParam.add(metricName);
    const valueParam = createBindParam.add(value);
    const categoryParam = createBindParam.add(category);
    const aggregationTypeParam = createBindParam.add(aggregationType);
    const timeWindowParam = createBindParam.add(timeWindow);
    const tenantIdParam = createBindParam.add(tenantId);
    const dimensionsParam = createBindParam.add(dimensions || {});
    const nowParam = createBindParam.add(new Date());

    createBuilder
      .create('(m:MetricSnapshot)')
      .set(
        `m.id = randomUUID(),
            m.metricName = $${metricNameParam},
            m.value = $${valueParam},
            m.category = $${categoryParam},
            m.aggregationType = $${aggregationTypeParam},
            m.timeWindow = $${timeWindowParam},
            m.tenantId = $${tenantIdParam},
            m.dimensions = $${dimensionsParam},
            m.timestamp = $${nowParam},
            m.createdAt = $${nowParam}`
      )
      .return('m');

    const createCypher = createBuilder.getStatement();
    const createParams = createBindParam.get();
    const result = await this.neogma.run(createCypher, createParams);
    return result.records[0].get('m').properties as MetricSnapshot;
  }

  // ============================================================================
  // EVENT LISTENERS FOR REAL-TIME PROCESSING
  // ============================================================================

  @OnEvent('event.tracked')
  handleEventTracked(eventData: EventInput): void {
    // Real-time processing for immediate insights
    this.processEventRealTime(eventData);
  }

  @OnEvent('session.started')
  handleSessionStarted(sessionData: any): void {
    // Update real-time session metrics
    this.eventEmitter.emit('metrics.updated', {
      type: 'session_count',
      increment: 1,
    });
  }

  @OnEvent('session.ended')
  handleSessionEnded(sessionData: any): void {
    // Update session metrics and calculate duration
    this.eventEmitter.emit('metrics.updated', {
      type: 'session_count',
      increment: -1,
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private startEventFlusher(): void {
    setInterval(async () => {
      await this.flushEvents();
    }, this.flushInterval);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = this.eventBuffer.splice(0); // Clear buffer

    try {
      await this.eventRepo.batchInsertEvents(eventsToFlush);

      // Emit metrics update
      this.eventEmitter.emit('metrics.updated', {
        type: 'events_processed',
        count: eventsToFlush.length,
      });
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Could implement retry logic or dead letter queue
    }
  }

  private processEventRealTime(eventData: EventInput): void {
    // Immediate processing for real-time metrics
    // This could include:
    // - Updating in-memory counters
    // - Triggering alerts
    // - Publishing to WebSocket clients
    // - Updating real-time dashboards

    this.eventEmitter.emit('realtime.metric.update', {
      eventType: eventData.eventType,
      source: eventData.source,
      value: eventData.value || 1,
    });
  }
}

// ============================================================================
// 5. WEBSOCKET GATEWAY FOR REAL-TIME UPDATES
// ============================================================================

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
  },
})
export class AnalyticsWebSocketGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly analyticsService: RealTimeAnalyticsService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Listen for real-time metric updates
    this.eventEmitter.on('realtime.metric.update', (data) => {
      this.broadcastMetricUpdate(data);
    });

    // Send periodic metric updates
    setInterval(async () => {
      const metrics = await this.analyticsService.getRealTimeMetrics();
      this.server.emit('metrics:update', metrics);
    }, 10000); // Every 10 seconds
  }

  @SubscribeMessage('subscribe:metrics')
  async handleSubscribeMetrics(
    @MessageBody() data: { tenantId?: string }
  ): Promise<void> {
    const metrics = await this.analyticsService.getRealTimeMetrics();
    this.server.emit('metrics:initial', metrics);
  }

  @SubscribeMessage('subscribe:trends')
  async handleSubscribeTrends(
    @MessageBody()
    data: {
      metric: string;
      timeRange: 'hour' | 'day' | 'week' | 'month';
      tenantId?: string;
    }
  ): Promise<void> {
    const trends = await this.analyticsService.getTrendAnalysis(
      data.metric,
      data.timeRange,
      data.tenantId
    );
    this.server.emit('trends:update', trends);
  }

  private broadcastMetricUpdate(data: any): void {
    this.server.emit('metric:realtime', data);
  }
}

// ============================================================================
// 6. CONTROLLER FOR ANALYTICS API
// ============================================================================

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: RealTimeAnalyticsService) {}

  @Post('events')
  @Safe({ strict: true })
  async trackEvent(@Body() eventData: EventInput) {
    await this.analyticsService.trackEvent(eventData);
    return { success: true, timestamp: new Date() };
  }

  @Get('realtime')
  @Authorize({ roles: ['admin', 'analyst'] })
  async getRealTimeMetrics(@Query('window') timeWindow?: number) {
    return this.analyticsService.getRealTimeMetrics(timeWindow);
  }

  @Get('trends/:metric')
  @Authorize({ roles: ['admin', 'analyst'] })
  async getTrends(
    @Param('metric') metric: string,
    @Query('timeRange') timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('tenantId') tenantId?: string
  ) {
    return this.analyticsService.getTrendAnalysis(metric, timeRange, tenantId);
  }

  @Post('funnel')
  @Authorize({ roles: ['admin', 'analyst'] })
  async getFunnelAnalysis(
    @Body()
    data: {
      steps: Array<{ name: string; eventType: string }>;
      timeRange: { start: string; end: string };
      tenantId?: string;
    }
  ) {
    return this.analyticsService.getFunnelAnalysis(
      data.steps,
      {
        start: new Date(data.timeRange.start),
        end: new Date(data.timeRange.end),
      },
      data.tenantId
    );
  }
}

// ============================================================================
// 7. USAGE EXAMPLE
// ============================================================================

export class RealTimeAnalyticsExample {
  constructor(private readonly analyticsService: RealTimeAnalyticsService) {}

  async demonstrateUsage(): Promise<void> {
    // Track various events
    await this.analyticsService.trackEvent({
      eventType: 'page_view',
      source: 'web',
      userId: 'user-123',
      sessionId: 'session-456',
      tenantId: 'tenant-1',
      properties: {
        page: '/dashboard',
        category: 'analytics',
      },
      context: {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.100',
        country: 'US',
        city: 'San Francisco',
        device: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
      },
      value: 1,
    });

    await this.analyticsService.trackEvent({
      eventType: 'purchase',
      source: 'web',
      userId: 'user-123',
      sessionId: 'session-456',
      tenantId: 'tenant-1',
      properties: {
        category: 'electronics',
        metadata: {
          productId: 'product-789',
          quantity: 2,
        },
      },
      context: {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.100',
        country: 'US',
        city: 'San Francisco',
        device: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
      },
      value: 199.99,
    });

    // Get real-time metrics
    const realTimeMetrics = await this.analyticsService.getRealTimeMetrics(300);
    console.log('Real-time metrics:', realTimeMetrics);

    // Analyze trends
    const trends = await this.analyticsService.getTrendAnalysis(
      'page_views',
      'day',
      'tenant-1'
    );
    console.log('Trend analysis:', trends);

    // Funnel analysis
    const funnelAnalysis = await this.analyticsService.getFunnelAnalysis(
      [
        { name: 'Landing Page', eventType: 'page_view' },
        { name: 'Product View', eventType: 'page_view' },
        { name: 'Add to Cart', eventType: 'click' },
        { name: 'Purchase', eventType: 'purchase' },
      ],
      {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date(),
      },
      'tenant-1'
    );
    console.log('Funnel analysis:', funnelAnalysis);

    // Store metric snapshots
    await this.analyticsService.storeMetricSnapshot(
      'daily_revenue',
      1999.5,
      'business',
      'sum',
      'day',
      'tenant-1',
      { source: 'web', country: 'US' }
    );

    console.log('Real-time analytics demonstration completed');
  }
}
