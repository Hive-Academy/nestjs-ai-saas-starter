import { Injectable, Logger } from '@nestjs/common';
import type {
  MemoryEntry,
  MemoryMetadata,
} from '../interfaces/memory.interface';
import { MemoryFacadeService } from '../services/memory-facade.service';

// Define the adapter interface types that bridge to nestjs-langgraph
interface AdapterMemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface AdapterMemoryEntryInput {
  content: string;
  metadata?: Record<string, unknown>;
}

interface AdapterMemoryRetrieveOptions {
  limit?: number;
  includeMetadata?: boolean;
}

interface IMemoryAdapterFacade {
  retrieveContext(
    userId: string,
    threadId: string,
    options?: AdapterMemoryRetrieveOptions
  ): Promise<readonly AdapterMemoryEntry[]>;
  storeEntry(
    entry: AdapterMemoryEntryInput,
    userId: string,
    threadId: string
  ): Promise<AdapterMemoryEntry>;
}

/**
 * Bridge service that implements the IMemoryAdapterFacade contract
 *
 * This service acts as an adapter between the agentic-memory module
 * and the nestjs-langgraph memory adapter interface. It transforms
 * data between the two different memory formats and ensures proper
 * contract compliance.
 *
 * Key responsibilities:
 * - Implement the IMemoryAdapterFacade interface (2 methods)
 * - Transform between agentic memory and adapter interface formats
 * - Provide graceful error handling and fallbacks
 * - Maintain backward compatibility
 *
 * This follows the Adapter pattern to bridge incompatible interfaces
 * and enables loose coupling between the memory module and langgraph.
 */
@Injectable()
export class MemoryAdapterBridgeService implements IMemoryAdapterFacade {
  private readonly logger = new Logger(MemoryAdapterBridgeService.name);

  constructor(private readonly memoryFacade: MemoryFacadeService) {}

  /**
   * Retrieve context for a specific user and thread
   * Transforms internal memory format to adapter interface format
   */
  async retrieveContext(
    userId: string,
    threadId: string,
    options?: AdapterMemoryRetrieveOptions
  ): Promise<readonly AdapterMemoryEntry[]> {
    try {
      this.logger.debug(
        `Retrieving context for user ${userId}, thread ${threadId}`
      );

      // Use internal facade to get memories
      const internalMemories = await this.memoryFacade.retrieve(
        threadId,
        options?.limit || 50
      );

      // Transform to adapter interface format
      const adapterMemories = internalMemories.map((memory) =>
        this.transformToAdapterFormat(memory)
      );

      this.logger.debug(
        `Retrieved ${adapterMemories.length} memories for thread ${threadId}`
      );
      return adapterMemories;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve context for user ${userId}, thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Store a memory entry for a specific user and thread
   * Transforms adapter interface format to internal memory format
   */
  async storeEntry(
    entry: AdapterMemoryEntryInput,
    userId: string,
    threadId: string
  ): Promise<AdapterMemoryEntry> {
    try {
      this.logger.debug(
        `Storing memory entry for user ${userId}, thread ${threadId}`
      );

      // Transform from adapter interface format to internal format
      const internalEntry = this.transformFromAdapterFormat(entry, threadId);

      // Use internal facade to store memory
      const storedMemory = await this.memoryFacade.store(
        threadId,
        entry.content,
        internalEntry.metadata,
        userId
      );

      // Transform back to adapter interface format for return
      const adapterMemory = this.transformToAdapterFormat(storedMemory);

      this.logger.debug(
        `Stored memory entry ${adapterMemory.id} for thread ${threadId}`
      );
      return adapterMemory;
    } catch (error) {
      this.logger.error(
        `Failed to store memory entry for user ${userId}, thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Transform internal memory entry to adapter interface format
   */
  private transformToAdapterFormat(
    internalMemory: MemoryEntry
  ): AdapterMemoryEntry {
    return {
      id: internalMemory.id,
      content: internalMemory.content,
      metadata: {
        threadId: internalMemory.threadId,
        type: internalMemory.metadata?.type || 'conversation',
        source: internalMemory.metadata?.source || 'user',
        timestamp:
          internalMemory.createdAt?.toISOString() || new Date().toISOString(),
        importance: internalMemory.metadata?.importance || 0.5,
        tags: internalMemory.metadata?.tags || [],
        // Include additional metadata while preserving structure
        ...this.extractAdditionalMetadata(internalMemory.metadata),
      },
      createdAt: internalMemory.createdAt || new Date(),
      updatedAt:
        internalMemory.lastAccessedAt || internalMemory.createdAt || new Date(),
    };
  }

  /**
   * Transform adapter interface format to internal memory format
   */
  private transformFromAdapterFormat(
    adapterEntry: AdapterMemoryEntryInput,
    threadId: string
  ): Partial<MemoryEntry> {
    return {
      content: adapterEntry.content,
      threadId,
      metadata: {
        type:
          (adapterEntry.metadata?.type as MemoryMetadata['type']) ||
          'conversation',
        source: (adapterEntry.metadata?.source as string) || 'user',
        importance: (adapterEntry.metadata?.importance as number) || 0.5,
        tags: (adapterEntry.metadata?.tags as string[]) || [],
        persistent: (adapterEntry.metadata?.persistent as boolean) || false,
        // Include any additional metadata from the adapter
        ...this.extractAdditionalMetadata(adapterEntry.metadata),
      } as MemoryMetadata,
    };
  }

  /**
   * Extract additional metadata while filtering out known fields
   */
  private extractAdditionalMetadata(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const knownFields = new Set([
      'type',
      'source',
      'threadId',
      'timestamp',
      'importance',
      'tags',
      'persistent',
    ]);

    return Object.fromEntries(
      Object.entries(metadata).filter(([key]) => !knownFields.has(key))
    );
  }

  /**
   * Get bridge service status for diagnostics
   */
  getStatus(): {
    isReady: boolean;
    facadeAvailable: boolean;
    lastError?: string;
  } {
    return {
      isReady: !!this.memoryFacade,
      facadeAvailable: !!this.memoryFacade,
      lastError: undefined, // Could track last error if needed
    };
  }
}
