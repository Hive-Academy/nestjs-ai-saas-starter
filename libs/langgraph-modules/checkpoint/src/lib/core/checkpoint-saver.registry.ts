import { Injectable, Logger } from '@nestjs/common';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import {
  ICheckpointSaverRegistry,
  CheckpointSaverConfig,
  CheckpointSaverMetadata,
} from '../interfaces/checkpoint-saver-registry.interface';

/**
 * Registry service for managing checkpoint savers
 * Allows users to register their own checkpoint saver instances
 */
@Injectable()
export class CheckpointSaverRegistry implements ICheckpointSaverRegistry {
  private readonly logger = new Logger(CheckpointSaverRegistry.name);
  private readonly savers = new Map<string, BaseCheckpointSaver>();
  private readonly metadata = new Map<string, CheckpointSaverMetadata>();
  private defaultSaverName?: string;

  /**
   * Register a checkpoint saver
   */
  registerSaver(config: CheckpointSaverConfig): void {
    if (this.savers.has(config.name)) {
      this.logger.warn(
        `Checkpoint saver '${config.name}' is already registered. Overwriting.`
      );
    }

    this.savers.set(config.name, config.saver);

    if (config.metadata) {
      this.metadata.set(config.name, config.metadata);
    }

    if (config.default || this.savers.size === 1) {
      this.defaultSaverName = config.name;
      this.logger.log(`Set '${config.name}' as default checkpoint saver`);
    }

    this.logger.log(`Registered checkpoint saver: ${config.name}`);
  }

  /**
   * Get a checkpoint saver by name
   */
  getSaver(name?: string): BaseCheckpointSaver | undefined {
    if (!name) {
      return this.getDefaultSaver();
    }

    const saver = this.savers.get(name);
    if (!saver) {
      this.logger.warn(`Checkpoint saver '${name}' not found`);
    }
    return saver;
  }

  /**
   * Get the default checkpoint saver
   */
  getDefaultSaver(): BaseCheckpointSaver | undefined {
    if (!this.defaultSaverName) {
      this.logger.warn('No default checkpoint saver configured');
      return undefined;
    }

    return this.savers.get(this.defaultSaverName);
  }

  /**
   * Get all registered saver names
   */
  getAvailableSavers(): string[] {
    return Array.from(this.savers.keys());
  }

  /**
   * Get metadata for a saver
   */
  getSaverMetadata(name: string): CheckpointSaverMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Check if a saver is registered
   */
  hasSaver(name: string): boolean {
    return this.savers.has(name);
  }

  /**
   * Remove a saver from the registry
   */
  removeSaver(name: string): boolean {
    const removed = this.savers.delete(name);
    this.metadata.delete(name);

    if (this.defaultSaverName === name) {
      // Set another saver as default if available
      const availableSavers = this.getAvailableSavers();
      this.defaultSaverName =
        availableSavers.length > 0 ? availableSavers[0] : undefined;

      if (this.defaultSaverName) {
        this.logger.log(
          `Set '${this.defaultSaverName}' as new default checkpoint saver`
        );
      } else {
        this.logger.warn('No checkpoint savers remaining after removal');
      }
    }

    if (removed) {
      this.logger.log(`Removed checkpoint saver: ${name}`);
    }

    return removed;
  }

  /**
   * Get the default saver name
   */
  getDefaultSaverName(): string | undefined {
    return this.defaultSaverName;
  }

  /**
   * Get all saver configurations
   */
  getAllSaverConfigs(): CheckpointSaverConfig[] {
    return Array.from(this.savers.entries()).map(([name, saver]) => ({
      name,
      saver,
      default: name === this.defaultSaverName,
      metadata: this.metadata.get(name),
    }));
  }

  /**
   * Clear all registered savers
   */
  clear(): void {
    this.savers.clear();
    this.metadata.clear();
    this.defaultSaverName = undefined;
    this.logger.log('Cleared all checkpoint savers');
  }

  /**
   * Lists all registered checkpoint savers
   */
  public listSavers(): Array<{
    name: string;
    default: boolean;
    metadata?: CheckpointSaverMetadata;
  }> {
    return Array.from(this.savers.entries()).map(([name]) => ({
      name,
      default: this.defaultSaverName === name,
      metadata: this.metadata.get(name),
    }));
  }

  /**
   * Gets the number of registered savers
   */
  public getSaverCount(): number {
    return this.savers.size;
  }

  /**
   * Clears all registered savers (useful for testing)
   */
  public clearSavers(): void {
    this.clear();
  }
}
