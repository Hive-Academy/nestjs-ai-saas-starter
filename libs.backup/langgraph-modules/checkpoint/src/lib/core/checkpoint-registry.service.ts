import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { EnhancedBaseCheckpointSaver } from '../interfaces/checkpoint.interface';
import type { ICheckpointRegistryService } from '../interfaces/checkpoint-services.interface';
import { BaseCheckpointService } from '../interfaces/checkpoint-services.interface';

/**
 * Registry service for managing multiple checkpoint savers
 * Implements the Registry pattern for checkpoint saver management
 */
@Injectable()
export class CheckpointRegistryService
  extends BaseCheckpointService
  implements ICheckpointRegistryService, OnModuleDestroy
{
  private readonly checkpointSavers = new Map<
    string,
    EnhancedBaseCheckpointSaver
  >();
  private defaultSaver: EnhancedBaseCheckpointSaver | null = null;
  private defaultSaverName: string | null = null;

  constructor() {
    super(CheckpointRegistryService.name);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.closeAllSavers();
  }

  /**
   * Register a checkpoint saver
   */
  public registerSaver(
    name: string,
    saver: EnhancedBaseCheckpointSaver,
    isDefault = false
  ): void {
    if (!name) {
      throw this.createError('Saver name is required', 'MISSING_SAVER_NAME');
    }

    if (!saver) {
      throw this.createError(
        'Saver instance is required',
        'MISSING_SAVER_INSTANCE'
      );
    }

    if (this.checkpointSavers.has(name)) {
      this.logger.warn(`Replacing existing checkpoint saver: ${name}`);
    }

    this.checkpointSavers.set(name, saver);

    if (isDefault ?? !this.defaultSaver) {
      this.setDefaultSaver(name);
    }

    this.logger.log(
      `Registered checkpoint saver: ${name}${isDefault ? ' (default)' : ''}`
    );
  }

  /**
   * Get a checkpoint saver by name
   */
  public getSaver(name?: string): EnhancedBaseCheckpointSaver {
    if (name) {
      const saver = this.checkpointSavers.get(name);
      if (!saver) {
        throw this.createError(
          `Checkpoint saver not found: ${name}`,
          'SAVER_NOT_FOUND',
          undefined,
          { saverName: name, availableSavers: this.getAvailableSavers() }
        );
      }
      return saver;
    }

    return this.getDefaultSaver();
  }

  /**
   * Get the default checkpoint saver
   */
  public getDefaultSaver(): EnhancedBaseCheckpointSaver {
    if (!this.defaultSaver) {
      throw this.createError(
        'No default checkpoint saver available',
        'NO_DEFAULT_SAVER',
        undefined,
        { availableSavers: this.getAvailableSavers() }
      );
    }

    return this.defaultSaver;
  }

  /**
   * Get all available saver names
   */
  public getAvailableSavers(): string[] {
    return Array.from(this.checkpointSavers.keys());
  }

  /**
   * Check if a saver exists
   */
  public hasSaver(name: string): boolean {
    return this.checkpointSavers.has(name);
  }

  /**
   * Remove a saver from the registry
   */
  public removeSaver(name: string): boolean {
    const saver = this.checkpointSavers.get(name);
    if (!saver) {
      return false;
    }

    // Close the saver if it has a close method
    this.closeSaver(saver, name);

    const removed = this.checkpointSavers.delete(name);

    // If this was the default saver, select a new default
    if (name === this.defaultSaverName) {
      this.selectNewDefaultSaver();
    }

    if (removed) {
      this.logger.log(`Removed checkpoint saver: ${name}`);
    }

    return removed;
  }

  /**
   * Clear all savers
   */
  public clearSavers(): void {
    this.logger.log('Clearing all checkpoint savers');

    // Close all savers
    for (const [name, saver] of this.checkpointSavers) {
      this.closeSaver(saver, name);
    }

    this.checkpointSavers.clear();
    this.defaultSaver = null;
    this.defaultSaverName = null;
  }

  /**
   * Set default saver by name
   */
  public setDefaultSaver(name: string): void {
    const saver = this.checkpointSavers.get(name);
    if (!saver) {
      throw this.createError(
        `Cannot set default saver: ${name} not found`,
        'SAVER_NOT_FOUND',
        undefined,
        { saverName: name, availableSavers: this.getAvailableSavers() }
      );
    }

    this.defaultSaver = saver;
    this.defaultSaverName = name;
    this.logger.log(`Set default checkpoint saver: ${name}`);
  }

  /**
   * Get default saver name
   */
  public getDefaultSaverName(): string | null {
    return this.defaultSaverName;
  }

  /**
   * Get saver info
   */
  public getSaverInfo(name?: string): {
    name: string;
    isDefault: boolean;
    type: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  } {
    const saver = this.getSaver(name);
    const saverName = name ?? this.defaultSaverName ?? 'unknown';

    return {
      name: saverName,
      isDefault: saverName === this.defaultSaverName,
      type: this.getSaverType(saver),
      status: 'unknown', // Will be determined by health service
    };
  }

  /**
   * Get all savers info
   */
  public getAllSaversInfo(): Array<{
    name: string;
    isDefault: boolean;
    type: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  }> {
    return this.getAvailableSavers().map((name) => this.getSaverInfo(name));
  }

  /**
   * Get savers by type
   */
  public getSaversByType(
    type: string
  ): Array<{ name: string; saver: EnhancedBaseCheckpointSaver }> {
    const result: Array<{ name: string; saver: EnhancedBaseCheckpointSaver }> =
      [];

    for (const [name, saver] of this.checkpointSavers) {
      if (this.getSaverType(saver) === type) {
        result.push({ name, saver });
      }
    }

    return result;
  }

  /**
   * Get registry statistics
   */
  public getRegistryStats(): {
    totalSavers: number;
    defaultSaver: string | null;
    saverTypes: Record<string, number>;
    availableSavers: string[];
  } {
    const saverTypes: Record<string, number> = {};

    for (const [, saver] of this.checkpointSavers) {
      const type = this.getSaverType(saver);
      saverTypes[type] = (saverTypes[type] ?? 0) + 1;
    }

    return {
      totalSavers: this.checkpointSavers.size,
      defaultSaver: this.defaultSaverName,
      saverTypes,
      availableSavers: this.getAvailableSavers(),
    };
  }

  /**
   * Validate saver configuration
   */
  public validateSavers(): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (this.checkpointSavers.size === 0) {
      issues.push('No checkpoint savers registered');
    }

    if (!this.defaultSaver) {
      issues.push('No default checkpoint saver available');
    }

    // Check for duplicate types without proper naming
    const typeCount: Record<string, number> = {};
    for (const [, saver] of this.checkpointSavers) {
      const type = this.getSaverType(saver);
      typeCount[type] = (typeCount[type] ?? 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCount)) {
      if (count > 1) {
        warnings.push(
          `Multiple savers of type '${type}' registered (${count})`
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Select a new default saver when current default is removed
   */
  private selectNewDefaultSaver(): void {
    const availableSavers = this.getAvailableSavers();

    if (availableSavers.length > 0) {
      // Prefer memory saver as default, then the first available
      const memorySaver = availableSavers.find((name) => {
        const saver = this.checkpointSavers.get(name);
        return saver && this.getSaverType(saver) === 'memory';
      });

      const newDefaultName = memorySaver ?? availableSavers[0];
      this.setDefaultSaver(newDefaultName);
    } else {
      this.defaultSaver = null;
      this.defaultSaverName = null;
    }
  }

  /**
   * Get saver type
   */
  private getSaverType(saver: EnhancedBaseCheckpointSaver): string {
    // Try to determine type from constructor name or other properties
    const constructorName = saver.constructor.name.toLowerCase();

    if (constructorName.includes('memory')) {
      return 'memory';
    }
    if (constructorName.includes('redis')) {
      return 'redis';
    }
    if (constructorName.includes('postgres')) {
      return 'postgres';
    }
    if (constructorName.includes('sqlite')) {
      return 'sqlite';
    }

    return 'unknown';
  }

  /**
   * Close a single saver safely
   */
  private async closeSaver(
    saver: EnhancedBaseCheckpointSaver,
    name: string
  ): Promise<void> {
    try {
      if (
        'close' in saver &&
        typeof (saver as { close?: () => Promise<void> }).close === 'function'
      ) {
        await (saver as { close: () => Promise<void> }).close();
        this.logger.debug(`Closed checkpoint saver: ${name}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to close checkpoint saver ${name}:`, error);
    }
  }

  /**
   * Close all savers safely
   */
  private async closeAllSavers(): Promise<void> {
    const closePromises: Array<Promise<void>> = [];

    for (const [name, saver] of this.checkpointSavers) {
      closePromises.push(this.closeSaver(saver, name));
    }

    await Promise.allSettled(closePromises);
  }
}
