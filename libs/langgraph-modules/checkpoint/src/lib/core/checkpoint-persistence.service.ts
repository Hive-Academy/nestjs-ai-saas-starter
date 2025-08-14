import { Injectable, Inject } from '@nestjs/common';
import {
  EnhancedCheckpointMetadata,
  EnhancedCheckpoint,
  EnhancedCheckpointTuple,
  ListCheckpointsOptions,
  CheckpointSaveError,
  CheckpointLoadError,
} from '../interfaces/checkpoint.interface';
import type {
  ICheckpointPersistenceService,
  ICheckpointRegistryService,
  ICheckpointMetricsService,
} from '../interfaces/checkpoint-services.interface';
import { BaseCheckpointService } from '../interfaces/checkpoint-services.interface';

/**
 * Core persistence service for checkpoint operations
 * Handles the primary checkpoint save/load operations with metadata enrichment
 */
@Injectable()
export class CheckpointPersistenceService
  extends BaseCheckpointService
  implements ICheckpointPersistenceService
{
  constructor(
    @Inject('ICheckpointRegistryService')
    private readonly registryService: ICheckpointRegistryService,
    @Inject('ICheckpointMetricsService')
    private readonly metricsService: ICheckpointMetricsService
  ) {
    super(CheckpointPersistenceService.name);
  }

  /**
   * Save checkpoint with metadata enrichment
   */
  async saveCheckpoint<T extends Record<string, unknown> = Record<string, unknown>>(
    threadId: string,
    checkpoint: unknown,
    metadata?: EnhancedCheckpointMetadata,
    saverName?: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.validateSaveInput(threadId, checkpoint);

      const saver = this.registryService.getSaver(saverName);
      const actualSaverName = saverName || this.registryService.getDefaultSaverName() || 'default';

      // Enrich metadata with additional information
      const enrichedMetadata = this.enrichMetadata(threadId, metadata);

      // Create enhanced checkpoint with size and checksum
      const enhancedCheckpoint = this.createEnhancedCheckpoint<T>(checkpoint, enrichedMetadata);

      // Save to storage backend
      await saver.put(
        { configurable: { thread_id: threadId } },
        enhancedCheckpoint as any,
        enrichedMetadata as any,
        {} as any // newVersions parameter
      );

      const duration = Date.now() - startTime;

      // Record metrics
      this.metricsService.recordSaveMetrics(actualSaverName, duration, true);

      this.logger.debug(
        `Checkpoint saved for thread ${threadId}: ${(checkpoint as any).id} (${duration}ms)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const actualSaverName = saverName || this.registryService.getDefaultSaverName() || 'default';

      // Record metrics for failed operation
      this.metricsService.recordSaveMetrics(actualSaverName, duration, false);

      this.logger.error(
        `Failed to save checkpoint for thread ${threadId} (${duration}ms):`,
        error
      );

      throw this.createSaveError(error as Error, threadId, (checkpoint as any)?.id);
    }
  }

  /**
   * Load checkpoint with version support
   */
  async loadCheckpoint<T extends Record<string, unknown> = Record<string, unknown>>(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<EnhancedCheckpoint<T> | null> {
    const startTime = Date.now();

    try {
      this.validateLoadInput(threadId);

      const saver = this.registryService.getSaver(saverName);
      const actualSaverName = saverName || this.registryService.getDefaultSaverName() || 'default';

      const config = {
        configurable: {
          thread_id: threadId,
          ...(checkpointId && { checkpoint_id: checkpointId }),
        },
      };

      const checkpoint = await saver.get(config) as EnhancedCheckpoint<T> | null;

      const duration = Date.now() - startTime;

      // Record metrics
      this.metricsService.recordLoadMetrics(actualSaverName, duration, true);

      if (checkpoint) {
        this.logger.debug(
          `Checkpoint loaded for thread ${threadId}: ${checkpoint.id} (${duration}ms)`
        );

        // Verify checksum if available
        this.verifyCheckpointIntegrity(checkpoint);
      } else {
        this.logger.debug(
          `No checkpoint found for thread ${threadId} (${duration}ms)`
        );
      }

      return checkpoint;
    } catch (error) {
      const duration = Date.now() - startTime;
      const actualSaverName = saverName || this.registryService.getDefaultSaverName() || 'default';

      // Record metrics for failed operation
      this.metricsService.recordLoadMetrics(actualSaverName, duration, false);

      this.logger.error(
        `Failed to load checkpoint for thread ${threadId} (${duration}ms):`,
        error
      );

      throw this.createLoadError(error as Error, threadId, checkpointId);
    }
  }

  /**
   * List checkpoints for time travel with enhanced filtering
   */
  async listCheckpoints(
    threadId: string,
    options: ListCheckpointsOptions = {},
    saverName?: string
  ): Promise<EnhancedCheckpointTuple[]> {
    try {
      this.validateListInput(threadId, options);

      const saver = this.registryService.getSaver(saverName);

      const config = { configurable: { thread_id: threadId } };
      const checkpointGenerator = saver.list(config, options);
      const checkpoints: EnhancedCheckpointTuple[] = [];

      // Convert async generator to array
      for await (const checkpoint of checkpointGenerator) {
        checkpoints.push(checkpoint as any as EnhancedCheckpointTuple);
      }

      // Apply enhanced filtering
      const filteredCheckpoints = this.applyAdvancedFiltering(checkpoints, options);

      // Apply sorting
      const sortedCheckpoints = this.applySorting(filteredCheckpoints, options);

      // Apply pagination
      return this.applyPagination(sortedCheckpoints, options);
    } catch (error) {
      this.logger.error(
        `Failed to list checkpoints for thread ${threadId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Enrich metadata with additional information
   */
  enrichMetadata(
    threadId: string,
    metadata?: EnhancedCheckpointMetadata
  ): EnhancedCheckpointMetadata {
    const baseMetadata: EnhancedCheckpointMetadata = {
      source: metadata?.source || 'input',
      step: metadata?.step || 0,
      parents: metadata?.parents || {},
    };

    return {
      ...baseMetadata,
      ...metadata,
      threadId,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Create enhanced checkpoint with size and checksum
   */
  createEnhancedCheckpoint<T extends Record<string, unknown> = Record<string, unknown>>(
    checkpoint: unknown,
    metadata: EnhancedCheckpointMetadata
  ): EnhancedCheckpoint<T> {
    return {
      ...(checkpoint as any),
      metadata,
      size: this.calculateCheckpointSize(checkpoint),
      checksum: this.calculateChecksum(checkpoint),
      compression: 'none',
    } as EnhancedCheckpoint<T>;
  }

  /**
   * Validate save input parameters
   */
  private validateSaveInput(threadId: string, checkpoint: unknown): void {
    if (!threadId || typeof threadId !== 'string') {
      throw this.createError(
        'Thread ID is required and must be a string',
        'INVALID_THREAD_ID'
      );
    }

    if (!checkpoint) {
      throw this.createError(
        'Checkpoint is required',
        'MISSING_CHECKPOINT'
      );
    }

    if (!checkpoint || typeof checkpoint !== 'object' || !(checkpoint as any).id) {
      throw this.createError(
        'Checkpoint ID is required',
        'MISSING_CHECKPOINT_ID'
      );
    }
  }

  /**
   * Validate load input parameters
   */
  private validateLoadInput(threadId: string): void {
    if (!threadId || typeof threadId !== 'string') {
      throw this.createError(
        'Thread ID is required and must be a string',
        'INVALID_THREAD_ID'
      );
    }
  }

  /**
   * Validate list input parameters
   */
  private validateListInput(threadId: string, options: ListCheckpointsOptions): void {
    if (!threadId || typeof threadId !== 'string') {
      throw this.createError(
        'Thread ID is required and must be a string',
        'INVALID_THREAD_ID'
      );
    }

    if (options.limit && (options.limit < 1 || options.limit > 1000)) {
      throw this.createError(
        'Limit must be between 1 and 1000',
        'INVALID_LIMIT'
      );
    }

    if (options.offset && options.offset < 0) {
      throw this.createError(
        'Offset must be non-negative',
        'INVALID_OFFSET'
      );
    }
  }

  /**
   * Apply advanced filtering to checkpoints
   */
  private applyAdvancedFiltering(
    checkpoints: EnhancedCheckpointTuple[],
    options: ListCheckpointsOptions
  ): EnhancedCheckpointTuple[] {
    let filtered = checkpoints;

    if (options.workflowName) {
      filtered = filtered.filter(
        ([, , metadata]) => metadata.workflowName === options.workflowName
      );
    }

    if (options.branchName) {
      filtered = filtered.filter(
        ([, , metadata]) => metadata.branchName === options.branchName
      );
    }

    if (options.dateRange) {
      filtered = filtered.filter(([, , metadata]) => {
        if (!metadata.timestamp) {return true;}
        const checkpointDate = new Date(metadata.timestamp);
        const { from, to } = options.dateRange as { from?: Date; to?: Date };
        return (
          (!from || checkpointDate >= from) && (!to || checkpointDate <= to)
        );
      });
    }

    // Apply field inclusion/exclusion
    if (options.includeFields || options.excludeFields) {
      filtered = filtered.map(([config, checkpoint, metadata]) => {
        const filteredMetadata = this.filterMetadataFields(
          metadata,
          options.includeFields,
          options.excludeFields
        );
        return [config, checkpoint, filteredMetadata] as EnhancedCheckpointTuple;
      });
    }

    return filtered;
  }

  /**
   * Apply sorting to checkpoints
   */
  private applySorting(
    checkpoints: EnhancedCheckpointTuple[],
    options: ListCheckpointsOptions
  ): EnhancedCheckpointTuple[] {
    if (!options.sortBy) {
      return checkpoints;
    }

    return checkpoints.sort((a, b) => {
      const [, , metadataA] = a;
      const [, , metadataB] = b;

      let valueA: string | number | Date;
      let valueB: string | number | Date;

      switch (options.sortBy) {
        case 'timestamp':
          valueA = new Date(metadataA.timestamp || 0).getTime();
          valueB = new Date(metadataB.timestamp || 0).getTime();
          break;
        case 'executionDuration':
          valueA = metadataA.executionDuration || 0;
          valueB = metadataB.executionDuration || 0;
          break;
        case 'stepName':
          valueA = metadataA.stepName || '';
          valueB = metadataB.stepName || '';
          break;
        default:
          return 0;
      }

      const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return options.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Apply pagination to checkpoints
   */
  private applyPagination(
    checkpoints: EnhancedCheckpointTuple[],
    options: ListCheckpointsOptions
  ): EnhancedCheckpointTuple[] {
    const offset = options.offset || 0;
    const limit = options.limit || checkpoints.length;

    return checkpoints.slice(offset, offset + limit);
  }

  /**
   * Filter metadata fields based on include/exclude options
   */
  private filterMetadataFields(
    metadata: EnhancedCheckpointMetadata,
    includeFields?: string[],
    excludeFields?: string[]
  ): EnhancedCheckpointMetadata {
    let filtered = { ...metadata };

    if (includeFields && includeFields.length > 0) {
      const included: Partial<EnhancedCheckpointMetadata> = {};
      for (const field of includeFields) {
        if (field in filtered) {
          (included as any)[field] = (filtered as any)[field];
        }
      }
      filtered = included as EnhancedCheckpointMetadata;
    }

    if (excludeFields && excludeFields.length > 0) {
      for (const field of excludeFields) {
        delete (filtered as any)[field];
      }
    }

    return filtered;
  }

  /**
   * Verify checkpoint integrity
   */
  private verifyCheckpointIntegrity<T>(checkpoint: EnhancedCheckpoint<T>): void {
    if (checkpoint.checksum) {
      const calculatedChecksum = this.calculateChecksum(checkpoint);
      if (calculatedChecksum !== checkpoint.checksum) {
        this.logger.warn(
          `Checksum mismatch for checkpoint ${checkpoint.id}. Expected: ${checkpoint.checksum}, Calculated: ${calculatedChecksum}`
        );
      }
    }
  }

  /**
   * Create standardized save error
   */
  private createSaveError(
    originalError: Error,
    threadId: string,
    checkpointId?: string
  ): CheckpointSaveError {
    const saveError: CheckpointSaveError = new Error(
      `Failed to save checkpoint: ${originalError.message}`
    ) as CheckpointSaveError;
    
    saveError.code = 'CHECKPOINT_SAVE_FAILED';
    saveError.threadId = threadId;
    saveError.checkpointId = checkpointId;
    saveError.cause = originalError;
    saveError.retryable = this.isRetryableError(originalError);

    return saveError;
  }

  /**
   * Create standardized load error
   */
  private createLoadError(
    originalError: Error,
    threadId: string,
    checkpointId?: string
  ): CheckpointLoadError {
    const loadError: CheckpointLoadError = new Error(
      `Failed to load checkpoint: ${originalError.message}`
    ) as CheckpointLoadError;
    
    loadError.code = 'CHECKPOINT_LOAD_FAILED';
    loadError.threadId = threadId;
    loadError.checkpointId = checkpointId;
    loadError.cause = originalError;

    return loadError;
  }
}