import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { Observable, Subject, debounceTime, groupBy, scan } from 'rxjs';
import {
  StreamUpdate,
  StreamEventType,
} from '../interfaces/streaming.interface';

/**
 * Service for processing and aggregating stream events
 * Provides event batching, filtering, and transformation capabilities
 */
@Injectable()
export class EventStreamProcessorService {
  private readonly logger = new Logger(EventStreamProcessorService.name);
  private readonly eventBuffer = new Map<string, StreamUpdate[]>();
  private readonly aggregators = new Map<string, Subject<any>>();

  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Process stream events with batching
   */
  processBatch(
    events: StreamUpdate[],
    batchSize = 10,
    debounceMs = 100
  ): Observable<StreamUpdate[]> {
    const subject = new Subject<StreamUpdate>();

    // Push events to subject
    events.forEach((event) => {
      subject.next(event);
    });

    return subject.pipe(
      scan((batch, event) => {
        batch.push(event);
        if (batch.length >= batchSize) {
          return [];
        }
        return batch;
      }, [] as StreamUpdate[]),
      debounceTime(debounceMs)
    );
  }

  /**
   * Group events by type and execution
   */
  groupEventsByType(
    events: Observable<StreamUpdate>
  ): Observable<Observable<StreamUpdate>> {
    return events.pipe(
      groupBy((event) => `${event.metadata?.executionId}_${event.type}`)
    );
  }

  /**
   * Aggregate events by execution
   */
  aggregateByExecution(
    executionId: string,
    events: StreamUpdate[]
  ): Map<StreamEventType, StreamUpdate[]> {
    const aggregated = new Map<StreamEventType, StreamUpdate[]>();

    events.forEach((event) => {
      if (event.metadata?.executionId === executionId) {
        const typeEvents = aggregated.get(event.type) || [];
        typeEvents.push(event);
        aggregated.set(event.type, typeEvents);
      }
    });

    return aggregated;
  }

  /**
   * Filter events by criteria
   */
  filterEvents(
    events: StreamUpdate[],
    criteria: {
      types?: StreamEventType[];
      executionId?: string;
      nodeId?: string;
      startTime?: Date;
      endTime?: Date;
    }
  ): StreamUpdate[] {
    return events.filter((event) => {
      if (criteria.types && !criteria.types.includes(event.type)) {
        return false;
      }

      if (
        criteria.executionId &&
        event.metadata?.executionId !== criteria.executionId
      ) {
        return false;
      }

      if (criteria.nodeId && event.metadata?.nodeId !== criteria.nodeId) {
        return false;
      }

      if (
        criteria.startTime &&
        event.metadata?.timestamp &&
        event.metadata.timestamp < criteria.startTime
      ) {
        return false;
      }

      if (
        criteria.endTime &&
        event.metadata?.timestamp &&
        event.metadata.timestamp > criteria.endTime
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Transform events to specific format
   */
  transformEvents<T>(
    events: StreamUpdate[],
    transformer: (event: StreamUpdate) => T
  ): T[] {
    return events.map(transformer);
  }

  /**
   * Buffer events for replay
   */
  bufferEvents(executionId: string, event: StreamUpdate): void {
    const buffer = this.eventBuffer.get(executionId) || [];
    buffer.push(event);

    // Limit buffer size to prevent memory issues
    if (buffer.length > 1000) {
      buffer.shift();
    }

    this.eventBuffer.set(executionId, buffer);
  }

  /**
   * Replay buffered events
   */
  replayEvents(executionId: string, fromSequence?: number): StreamUpdate[] {
    const buffer = this.eventBuffer.get(executionId) || [];

    if (fromSequence !== undefined) {
      return buffer.filter(
        (event) => (event.metadata?.sequenceNumber || 0) >= fromSequence
      );
    }

    return [...buffer];
  }

  /**
   * Clear event buffer
   */
  clearBuffer(executionId?: string): void {
    if (executionId) {
      this.eventBuffer.delete(executionId);
      this.logger.log(`Cleared buffer for execution ${executionId}`);
    } else {
      this.eventBuffer.clear();
      this.logger.log('Cleared all event buffers');
    }
  }

  /**
   * Get event statistics
   */
  getEventStats(executionId: string): Record<StreamEventType, number> {
    const buffer = this.eventBuffer.get(executionId) || [];
    const stats: Partial<Record<StreamEventType, number>> = {};

    buffer.forEach((event) => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });

    return stats as Record<StreamEventType, number>;
  }

  /**
   * Handle workflow stream events
   */
  @OnEvent('workflow.stream.*')
  handleWorkflowStream(data: any): void {
    const executionId = data.executionId || 'unknown';
    this.logger.debug(`Received workflow stream event for ${executionId}`);

    // Process and emit transformed event
    this.eventEmitter.emit('stream.processed', {
      executionId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Handle token events
   */
  @OnEvent('workflow.token.*')
  handleTokenEvent(data: any): void {
    const executionId = data.executionId || 'unknown';
    this.logger.debug(`Received token event for ${executionId}`);

    // Aggregate tokens
    const aggregator = this.getOrCreateAggregator(executionId);
    aggregator.next(data);
  }

  /**
   * Handle progress events
   */
  @OnEvent('workflow.progress.*')
  handleProgressEvent(data: any): void {
    const executionId = data.metadata?.executionId || 'unknown';
    this.logger.debug(
      `Progress update for ${executionId}: ${data.data?.progress}%`
    );

    // Emit progress to connected clients
    this.eventEmitter.emit('client.progress', {
      executionId,
      progress: data.data?.progress,
      message: data.data?.message,
    });
  }

  /**
   * Handle milestone events
   */
  @OnEvent('workflow.milestone.*')
  handleMilestoneEvent(data: any): void {
    const executionId = data.metadata?.executionId || 'unknown';
    const milestone = data.data?.milestone || 'unknown';

    this.logger.log(`Milestone reached for ${executionId}: ${milestone}`);

    // Store milestone in buffer for history
    this.bufferEvents(executionId, data);

    // Emit milestone notification
    this.eventEmitter.emit('client.milestone', {
      executionId,
      milestone,
      timestamp: new Date(),
    });
  }

  /**
   * Get or create aggregator for execution
   */
  private getOrCreateAggregator(executionId: string): Subject<any> {
    if (!this.aggregators.has(executionId)) {
      const aggregator = new Subject<any>();

      // Setup aggregation pipeline
      aggregator
        .pipe(
          scan((acc, value) => {
            acc.push(value);
            return acc;
          }, [] as any[]),
          debounceTime(500)
        )
        .subscribe((aggregated) => {
          this.eventEmitter.emit('tokens.aggregated', {
            executionId,
            tokens: aggregated,
            totalCount: aggregated.length,
          });
        });

      this.aggregators.set(executionId, aggregator);
    }

    return this.aggregators.get(executionId)!;
  }

  /**
   * Cleanup aggregator
   */
  cleanupAggregator(executionId: string): void {
    const aggregator = this.aggregators.get(executionId);
    if (aggregator) {
      aggregator.complete();
      this.aggregators.delete(executionId);
    }
  }

  /**
   * Get buffer size
   */
  getBufferSize(executionId?: string): number {
    if (executionId) {
      return this.eventBuffer.get(executionId)?.length || 0;
    }

    let total = 0;
    this.eventBuffer.forEach((buffer) => {
      total += buffer.length;
    });
    return total;
  }
}
