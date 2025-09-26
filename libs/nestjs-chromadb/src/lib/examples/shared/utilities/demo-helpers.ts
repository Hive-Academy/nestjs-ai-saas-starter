/**
 * @fileoverview Demo Helper Utilities for ChromaDB Examples
 * 
 * Common utilities and helper functions used across ChromaDB examples.
 * Provides consistent logging, timing, validation, and demo functionality.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ExampleDocument } from '../entities/document.entity';

// Type-only imports to avoid circular dependencies
type ChromaDBFacadeService = any;
type ChromaSearchResult = any;

/**
 * Performance timing utilities
 */
export class PerformanceTimer {
  private timers: Map<string, number> = new Map();
  
  start(label: string): void {
    this.timers.set(label, Date.now());
  }
  
  end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(label);
    return duration;
  }
  
  measure<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    return this.measureSync(label, fn);
  }
  
  async measureSync<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(label);
    try {
      const result = await fn();
      const duration = this.end(label);
      return { result, duration };
    } catch (error) {
      this.end(label); // Clean up timer even if function fails
      throw error;
    }
  }
}

/**
 * Demo logger with consistent formatting
 */
export class DemoLogger {
  private readonly logger = new Logger('ChromaDBExamples');
  
  logStep(step: number, title: string, description?: string): void {
    this.logger.log(`\n📝 Step ${step}: ${title}`);
    if (description) {
      this.logger.log(`   ${description}`);
    }
  }
  
  logResults(operation: string, results: any, duration?: number): void {
    const durationText = duration ? ` (${duration}ms)` : '';
    this.logger.log(`✅ ${operation} completed${durationText}`);
    if (typeof results === 'object' && results !== null) {
      this.logger.log(`   Results: ${JSON.stringify(results, null, 2)}`);
    } else {
      this.logger.log(`   Results: ${results}`);
    }
  }
  
  logError(operation: string, error: Error): void {
    this.logger.error(`❌ ${operation} failed: ${error.message}`);
  }
  
  logInfo(message: string): void {
    this.logger.log(`ℹ️ ${message}`);
  }
  
  logWarning(message: string): void {
    this.logger.warn(`⚠️ ${message}`);
  }
  
  logSeparator(title?: string): void {
    const separator = '='.repeat(50);
    if (title) {
      this.logger.log(`\n${separator}`);
      this.logger.log(`🔹 ${title}`);
      this.logger.log(separator);
    } else {
      this.logger.log(`\n${separator}\n`);
    }
  }
}

/**
 * Collection management helpers
 */
@Injectable()
export class CollectionHelper {
  constructor(
    private readonly chromaDB: ChromaDBFacadeService,
    private readonly logger: DemoLogger = new DemoLogger()
  ) {}
  
  /**
   * Safely create or get collection
   */
  async ensureCollection(
    name: string, 
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.chromaDB.createCollection(name, {
        ...metadata,
        createdBy: 'examples',
        createdAt: new Date().toISOString(),
      });
      this.logger.logInfo(`Collection '${name}' created successfully`);
    } catch (error) {
      // Collection might already exist
      this.logger.logInfo(`Collection '${name}' already exists or creation failed`);
    }
  }
  
  /**
   * Clear collection data for clean demos
   */
  async clearCollection(name: string): Promise<void> {
    try {
      // Get all document IDs
      const documents = await this.chromaDB.getDocuments(name);
      if (documents.ids && documents.ids[0] && documents.ids[0].length > 0) {
        await this.chromaDB.deleteDocuments(name, documents.ids[0]);
        this.logger.logInfo(`Collection '${name}' cleared (${documents.ids[0].length} documents)`);
      } else {
        this.logger.logInfo(`Collection '${name}' is already empty`);
      }
    } catch (error) {
      this.logger.logWarning(`Could not clear collection '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Populate collection with test data
   */
  async populateCollection(name: string, documents: ExampleDocument[]): Promise<void> {
    const timer = new PerformanceTimer();
    const { duration } = await timer.measure('populate-collection', async () => {
      await this.chromaDB.upsertDocuments(name, documents as any);
    });
    
    this.logger.logResults(
      `Populated collection '${name}' with ${documents.length} documents`,
      { documentsAdded: documents.length },
      duration
    );
  }
}

/**
 * Search result formatting utilities
 */
export class SearchResultFormatter {
  static formatSearchResults(results: ChromaSearchResult, maxResults: number = 5): string {
    if (!results.ids || !results.ids[0] || results.ids[0].length === 0) {
      return 'No results found';
    }
    
    const ids = results.ids[0].slice(0, maxResults);
    const distances = results.distances?.[0]?.slice(0, maxResults);
    const documents = results.documents?.[0]?.slice(0, maxResults);
    const metadatas = results.metadatas?.[0]?.slice(0, maxResults);
    
    let output = `Found ${results.ids[0].length} results (showing top ${ids.length}):\n\n`;
    
    ids.forEach((id: string, index: number) => {
      const distance = distances?.[index];
      const document = documents?.[index];
      const metadata = metadatas?.[index];
      
      output += `${index + 1}. ID: ${id}\n`;
      if (distance !== undefined) {
        output += `   Similarity: ${(1 - distance).toFixed(3)}\n`;
      }
      if (document) {
        const preview = document.length > 100 ? document.substring(0, 100) + '...' : document;
        output += `   Content: ${preview}\n`;
      }
      if (metadata && Object.keys(metadata).length > 0) {
        output += `   Metadata: ${JSON.stringify(metadata)}\n`;
      }
      output += '\n';
    });
    
    return output;
  }
  
  static formatSearchSummary(results: ChromaSearchResult): { totalResults: number; avgSimilarity?: number } {
    const totalResults = results.ids?.[0]?.length || 0;
    
    if (results.distances?.[0] && results.distances[0].length > 0) {
      const avgDistance = results.distances[0].reduce((sum: number, d: number) => sum + d, 0) / results.distances[0].length;
      const avgSimilarity = 1 - avgDistance;
      return { totalResults, avgSimilarity: parseFloat(avgSimilarity.toFixed(3)) };
    }
    
    return { totalResults };
  }
}

/**
 * Validation helpers for examples
 */
export class ExampleValidator {
  static validateSearchResults(results: ChromaSearchResult, expectedMinResults: number = 1): boolean {
    return !!(
      results.ids &&
      results.ids[0] &&
      results.ids[0].length >= expectedMinResults
    );
  }
  
  static validateDocumentStructure(document: ExampleDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!document.id) {
      errors.push('Document must have an id');
    }
    
    if (!document.content) {
      errors.push('Document must have content');
    }
    
    if (typeof document.content !== 'string') {
      errors.push('Document content must be a string');
    }
    
    if (document.metadata && typeof document.metadata !== 'object') {
      errors.push('Document metadata must be an object');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static validateCollectionConfiguration(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.name) {
      errors.push('Collection must have a name');
    }
    
    if (typeof config.name !== 'string') {
      errors.push('Collection name must be a string');
    }
    
    if (config.name && !/^[a-zA-Z0-9_-]+$/.test(config.name)) {
      errors.push('Collection name must contain only alphanumeric characters, underscores, and hyphens');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Common demo workflow patterns
 */
export class DemoWorkflow {
  constructor(
    private readonly chromaDB: ChromaDBFacadeService,
    private readonly collectionHelper: CollectionHelper,
    private readonly logger: DemoLogger
  ) {}
  
  /**
   * Standard setup workflow for examples
   */
  async setupExample(
    collectionName: string,
    testData: ExampleDocument[],
    clearFirst: boolean = true
  ): Promise<void> {
    this.logger.logSeparator(`Setting up ${collectionName} example`);
    
    this.logger.logStep(1, 'Creating collection', `Collection: ${collectionName}`);
    await this.collectionHelper.ensureCollection(collectionName);
    
    if (clearFirst) {
      this.logger.logStep(2, 'Clearing existing data');
      await this.collectionHelper.clearCollection(collectionName);
    }
    
    this.logger.logStep(3, 'Populating with test data', `${testData.length} documents`);
    await this.collectionHelper.populateCollection(collectionName, testData);
    
    this.logger.logInfo('Example setup completed successfully');
  }
  
  /**
   * Standard cleanup workflow for examples
   */
  async cleanupExample(collectionName: string): Promise<void> {
    this.logger.logSeparator(`Cleaning up ${collectionName} example`);
    
    try {
      await this.collectionHelper.clearCollection(collectionName);
      this.logger.logInfo('Example cleanup completed successfully');
    } catch (error) {
      this.logger.logError('Cleanup', error as Error);
    }
  }
  
  /**
   * Demonstrate search functionality with timing and formatting
   */
  async demonstrateSearch(
    collectionName: string,
    queries: string[],
    options: any = {}
  ): Promise<void> {
    this.logger.logSeparator('Search Demonstration');
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      this.logger.logStep(i + 1, 'Executing search', `Query: "${query}"`);
      
      const timer = new PerformanceTimer();
      const { result, duration } = await timer.measure('search', async () => {
        return await this.chromaDB.searchDocuments(collectionName, [query], undefined, {
          nResults: 3,
          ...options
        });
      });
      
      const summary = SearchResultFormatter.formatSearchSummary(result);
      this.logger.logResults(
        'Search completed',
        summary,
        duration
      );
      
      const formattedResults = SearchResultFormatter.formatSearchResults(result, 3);
      console.log(formattedResults);
    }
  }
}

/**
 * Export commonly used instances
 */
export const demoLogger = new DemoLogger();
export const performanceTimer = new PerformanceTimer();