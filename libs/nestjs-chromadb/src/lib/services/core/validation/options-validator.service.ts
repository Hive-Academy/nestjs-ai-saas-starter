import { Injectable } from '@nestjs/common';
import type {
  ValidationResult,
  MutableValidationResult,
  ChromaBulkOptions,
  ChromaSearchOptions,
} from '../../../types/core.interface';

/**
 * Options Validation Service
 * 
 * Handles validation of operation options and configuration
 * Following Single Responsibility Principle - only validates options
 */
@Injectable()
export class OptionsValidatorService {

  /**
   * Validate collection name
   */
  validateCollectionName(name: string): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!name || typeof name !== 'string') {
      result.errors.push('Collection name must be a non-empty string');
      result.isValid = false;
      return result;
    }

    if (name.trim().length === 0) {
      result.errors.push('Collection name cannot be empty or whitespace only');
    }

    // ChromaDB naming conventions
    if (name.length > 63) {
      result.errors.push('Collection name cannot exceed 63 characters');
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
      result.errors.push(
        'Collection name must start with alphanumeric character and contain only letters, numbers, dots, hyphens, and underscores'
      );
    }

    if (name.startsWith('.') || name.endsWith('.')) {
      result.errors.push('Collection name cannot start or end with a dot');
    }

    // Reserved names
    const reservedNames = ['system', 'metadata', 'index', 'admin'];
    if (reservedNames.includes(name.toLowerCase())) {
      result.errors.push(`Collection name '${name}' is reserved`);
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate bulk options
   */
  validateBulkOptions(options: ChromaBulkOptions): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (options.batchSize && (options.batchSize <= 0 || options.batchSize > 1000)) {
      result.errors.push('Batch size must be between 1 and 1000');
    }

    if (options.chunkSize && options.chunkSize <= 0) {
      result.errors.push('Chunk size must be greater than 0');
    }

    if (options.chunkOverlap && options.chunkOverlap < 0) {
      result.errors.push('Chunk overlap cannot be negative');
    }

    if (
      options.chunkSize &&
      options.chunkOverlap &&
      options.chunkOverlap >= options.chunkSize
    ) {
      result.errors.push('Chunk overlap must be less than chunk size');
    }

    // Validate chunking strategy
    if (options.chunkingStrategy) {
      const validStrategies = ['recursive', 'token', 'character', 'markdown', 'semantic', 'smart'];
      if (!validStrategies.includes(options.chunkingStrategy)) {
        result.errors.push(`Invalid chunking strategy. Must be one of: ${validStrategies.join(', ')}`);
      }
    }

    // Warn about performance implications
    if (options.batchSize && options.batchSize > 500) {
      result.warnings.push('Large batch sizes may impact performance and memory usage');
    }

    if (options.autoChunk && !options.chunkingStrategy) {
      result.warnings.push('Auto-chunking enabled without specifying chunking strategy, using default');
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate search options
   */
  validateSearchOptions(options: ChromaSearchOptions): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (options.nResults && (options.nResults <= 0 || options.nResults > 10000)) {
      result.errors.push('Number of results must be between 1 and 10000');
    }

    // Validate where clause structure
    if (options.where) {
      const whereValidation = this.validateWhereClause(options.where);
      result.errors.push(...whereValidation.errors);
      result.warnings.push(...whereValidation.warnings);
    }

    // Validate whereDocument clause structure
    if (options.whereDocument) {
      const whereDocValidation = this.validateWhereDocumentClause(options.whereDocument);
      result.errors.push(...whereDocValidation.errors);
      result.warnings.push(...whereDocValidation.warnings);
    }

    // Warn about performance implications
    if (options.nResults && options.nResults > 1000) {
      result.warnings.push('Large result sets may impact performance');
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate where clause structure
   */
  private validateWhereClause(where: Record<string, any>): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!where || typeof where !== 'object') {
      result.errors.push('Where clause must be an object');
      result.isValid = false;
      return result;
    }

    // Check for valid operators
    const validOperators = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$and', '$or'];
    
    Object.entries(where).forEach(([key, value]) => {
      if (key.startsWith('$') && !validOperators.includes(key)) {
        result.errors.push(`Unknown operator '${key}' in where clause`);
      }

      // Validate $in and $nin arrays
      if ((key === '$in' || key === '$nin') && !Array.isArray(value)) {
        result.errors.push(`Operator '${key}' requires an array value`);
      }

      // Validate $and and $or arrays
      if ((key === '$and' || key === '$or') && !Array.isArray(value)) {
        result.errors.push(`Operator '${key}' requires an array of conditions`);
      }
    });

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate whereDocument clause structure
   */
  private validateWhereDocumentClause(whereDocument: Record<string, any>): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!whereDocument || typeof whereDocument !== 'object') {
      result.errors.push('WhereDocument clause must be an object');
      result.isValid = false;
      return result;
    }

    // Check for valid document operators
    const validDocOperators = ['$contains', '$not_contains', '$and', '$or'];
    
    Object.entries(whereDocument).forEach(([key, value]) => {
      if (key.startsWith('$') && !validDocOperators.includes(key)) {
        result.errors.push(`Unknown document operator '${key}' in whereDocument clause`);
      }

      // Validate contains operators require string values
      if ((key === '$contains' || key === '$not_contains') && typeof value !== 'string') {
        result.errors.push(`Operator '${key}' requires a string value`);
      }

      // Validate $and and $or arrays
      if ((key === '$and' || key === '$or') && !Array.isArray(value)) {
        result.errors.push(`Operator '${key}' requires an array of conditions`);
      }
    });

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate pagination options
   */
  validatePaginationOptions(offset?: number, limit?: number): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (offset !== undefined) {
      if (typeof offset !== 'number' || offset < 0) {
        result.errors.push('Offset must be a non-negative number');
      }
    }

    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit <= 0) {
        result.errors.push('Limit must be a positive number');
      }

      if (limit > 10000) {
        result.warnings.push('Large limit values may impact performance');
      }
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate include options
   */
  validateIncludeOptions(include?: string[]): ValidationResult {
    const result: MutableValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (include !== undefined) {
      if (!Array.isArray(include)) {
        result.errors.push('Include must be an array of strings');
        result.isValid = false;
        return result;
      }

      const validIncludes = ['embeddings', 'documents', 'metadatas', 'distances'];
      const invalidIncludes = include.filter(item => !validIncludes.includes(item));
      
      if (invalidIncludes.length > 0) {
        result.errors.push(`Invalid include options: ${invalidIncludes.join(', ')}. Valid options: ${validIncludes.join(', ')}`);
      }
    }

    result.isValid = result.errors.length === 0;

    return result;
  }
}