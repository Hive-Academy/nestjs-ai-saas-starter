/**
 * @fileoverview Neogma Model Factory Service
 *
 * Provides dynamic model creation, registration, and management with full
 * TypeScript support and NestJS dependency injection integration.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Neogma, ModelFactory, type Neo4jSupportedProperties } from 'neogma';
import { NEOGMA_TOKEN } from '../neogma/neogma.constants';

/**
 * Model schema definition
 */
export interface ModelSchema<T> {
  label: string;
  primaryKey?: keyof T;
  properties: {
    [K in keyof T]: PropertyDefinition<T[K]>;
  };
  relationships?: ModelRelationships;
  indexes?: ModelIndex[];
  constraints?: ModelConstraint[];
}

/**
 * Property definition for model fields
 */
export interface PropertyDefinition<T> {
  type: PropertyType;
  required?: boolean;
  unique?: boolean;
  default?: T | (() => T);
  transform?: (value: any) => T;
  validate?: (value: T) => boolean | string;
  index?: boolean;
}

/**
 * Supported property types
 */
export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'point'
  | 'array'
  | 'object'
  | 'uuid';

/**
 * Model relationship definition
 */
export interface ModelRelationships {
  [alias: string]: RelationshipDefinition;
}

/**
 * Individual relationship configuration
 */
export interface RelationshipDefinition {
  type: string;
  direction: 'in' | 'out' | 'both';
  model: string | (() => any);
  properties?: Record<string, PropertyDefinition<any>>;
  eager?: boolean;
  cascade?: boolean;
}

/**
 * Model index definition
 */
export interface ModelIndex {
  type: 'index' | 'unique' | 'text' | 'fulltext' | 'point' | 'range';
  properties: string[];
  name?: string;
}

/**
 * Model constraint definition
 */
export interface ModelConstraint {
  type: 'unique' | 'exists' | 'key';
  property: string;
  name?: string;
}

/**
 * Model configuration options
 */
export interface ModelConfig<T> {
  schema: ModelSchema<T>;
  methods?: ModelMethods<T>;
  statics?: ModelStatics<T>;
  hooks?: ModelHooks<T>;
}

/**
 * Instance methods for models
 */
export interface ModelMethods<T> {
  [key: string]: (this: T, ...args: any[]) => any;
}

/**
 * Static methods for models
 */
export interface ModelStatics<T> {
  [key: string]: (...args: any[]) => any;
}

/**
 * Lifecycle hooks for models
 */
export interface ModelHooks<T> {
  beforeCreate?: (instance: T) => void | Promise<void>;
  afterCreate?: (instance: T) => void | Promise<void>;
  beforeUpdate?: (instance: T, changes: Partial<T>) => void | Promise<void>;
  afterUpdate?: (instance: T) => void | Promise<void>;
  beforeDelete?: (instance: T) => void | Promise<void>;
  afterDelete?: (instance: T) => void | Promise<void>;
  beforeValidate?: (instance: T) => void | Promise<void>;
  afterValidate?: (instance: T) => void | Promise<void>;
}

/**
 * Typed Neogma Model wrapper
 */
export class TypedNeogmaModel<T extends Neo4jSupportedProperties> {
  constructor(
    private model: any,
    private schema: ModelSchema<T>,
    private hooks?: ModelHooks<T>
  ) {}

  /**
   * Find one instance by properties
   */
  async findOne(where: Partial<T>): Promise<T | null> {
    try {
      const result = await this.model.findOne({ where });
      return result ? this.transformInstance(result) : null;
    } catch (error) {
      throw this.handleError('findOne', error);
    }
  }

  /**
   * Find multiple instances
   */
  async findMany(options?: {
    where?: Partial<T>;
    limit?: number;
    skip?: number;
    orderBy?: Array<[keyof T, 'ASC' | 'DESC']>;
  }): Promise<T[]> {
    try {
      const results = await this.model.findMany(options);
      return results.map((r: any) => this.transformInstance(r));
    } catch (error) {
      throw this.handleError('findMany', error);
    }
  }

  /**
   * Create a new instance
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      // Run beforeCreate hook
      if (this.hooks?.beforeCreate) {
        await this.hooks.beforeCreate(data as T);
      }

      // Apply defaults and transformations
      const processedData = this.processCreateData(data);

      // Validate
      this.validateData(processedData);

      const instance = await this.model.createOne(processedData);
      const result = this.transformInstance(instance);

      // Run afterCreate hook
      if (this.hooks?.afterCreate) {
        await this.hooks.afterCreate(result);
      }

      return result;
    } catch (error) {
      throw this.handleError('create', error);
    }
  }

  /**
   * Update an instance
   */
  async update(
    where: Partial<T>,
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | null> {
    try {
      // Find existing instance
      const existing = await this.findOne(where);
      if (!existing) return null;

      // Run beforeUpdate hook
      if (this.hooks?.beforeUpdate) {
        await this.hooks.beforeUpdate(existing, data as Partial<T>);
      }

      // Apply transformations
      const processedData = this.processUpdateData(data);

      // Validate merged data
      const mergedData = { ...existing, ...processedData };
      this.validateData(mergedData);

      const result = await this.model.update(processedData, { where });
      const transformed = result ? this.transformInstance(result) : null;

      // Run afterUpdate hook
      if (this.hooks?.afterUpdate && transformed) {
        await this.hooks.afterUpdate(transformed);
      }

      return transformed;
    } catch (error) {
      throw this.handleError('update', error);
    }
  }

  /**
   * Delete instances
   */
  async delete(where: Partial<T>, detach = true): Promise<number> {
    try {
      // Find instances to delete
      const instances = await this.findMany({ where });

      // Run beforeDelete hooks
      if (this.hooks?.beforeDelete) {
        for (const instance of instances) {
          await this.hooks.beforeDelete(instance);
        }
      }

      const count = await this.model.delete({ where, detach });

      // Run afterDelete hooks
      if (this.hooks?.afterDelete) {
        for (const instance of instances) {
          await this.hooks.afterDelete(instance);
        }
      }

      return count;
    } catch (error) {
      throw this.handleError('delete', error);
    }
  }

  /**
   * Count instances
   */
  async count(where?: Partial<T>): Promise<number> {
    try {
      return await this.model.count({ where });
    } catch (error) {
      throw this.handleError('count', error);
    }
  }

  /**
   * Check if instance exists
   */
  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Get the model label
   */
  getLabel(): string {
    return this.schema.label;
  }

  /**
   * Get the raw Neogma model
   */
  getRawModel(): any {
    return this.model;
  }

  /**
   * Process data for creation
   */
  private processCreateData(data: any): any {
    const processed: any = { ...data };

    for (const [key, def] of Object.entries(this.schema.properties)) {
      const propDef = def as PropertyDefinition<any>;

      // Apply defaults
      if (processed[key] === undefined && propDef.default !== undefined) {
        processed[key] =
          typeof propDef.default === 'function'
            ? propDef.default()
            : propDef.default;
      }

      // Apply transformations
      if (processed[key] !== undefined && propDef.transform) {
        processed[key] = propDef.transform(processed[key]);
      }
    }

    // Add system fields
    processed.id = processed.id || this.generateId();
    processed.createdAt = new Date();
    processed.updatedAt = new Date();

    return processed;
  }

  /**
   * Process data for update
   */
  private processUpdateData(data: any): any {
    const processed: any = { ...data };

    for (const [key, value] of Object.entries(processed)) {
      const propDef = this.schema.properties[
        key as keyof T
      ] as PropertyDefinition<any>;

      if (propDef?.transform && value !== undefined) {
        processed[key] = propDef.transform(value);
      }
    }

    // Update timestamp
    processed.updatedAt = new Date();

    return processed;
  }

  /**
   * Validate data against schema
   */
  private validateData(data: any): void {
    for (const [key, def] of Object.entries(this.schema.properties)) {
      const propDef = def as PropertyDefinition<any>;
      const value = data[key];

      // Check required
      if (propDef.required && value === undefined) {
        throw new Error(`Property '${key}' is required`);
      }

      // Run custom validation
      if (value !== undefined && propDef.validate) {
        const result = propDef.validate(value);
        if (result !== true) {
          const message =
            typeof result === 'string'
              ? result
              : `Validation failed for property '${key}'`;
          throw new Error(message);
        }
      }
    }
  }

  /**
   * Transform instance from database
   */
  private transformInstance(instance: any): T {
    if (!instance) return instance;

    const transformed: any = {};

    // Extract properties or use instance directly
    const data = instance.properties || instance;

    for (const key of Object.keys(this.schema.properties)) {
      if (data[key] !== undefined) {
        transformed[key] = data[key];
      }
    }

    return transformed as T;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle and format errors
   */
  private handleError(operation: string, error: any): Error {
    const message = error?.message || 'Unknown error';
    return new Error(`${this.schema.label}.${operation}: ${message}`);
  }
}

/**
 * Neogma Model Factory Service
 *
 * Manages model creation, registration, and dependency injection
 */
@Injectable()
export class NeogmaModelFactoryService {
  private readonly logger = new Logger(NeogmaModelFactoryService.name);
  private readonly models = new Map<string, TypedNeogmaModel<any>>();
  private readonly rawModels = new Map<string, any>();

  constructor(@Inject(NEOGMA_TOKEN) private readonly neogma: Neogma) {}

  /**
   * Create and register a typed model
   */
  createModel<T extends Neo4jSupportedProperties>(
    config: ModelConfig<T>
  ): TypedNeogmaModel<T> {
    const { schema, methods, statics, hooks } = config;

    try {
      // Build Neogma model configuration
      const neogmaConfig = this.buildNeogmaConfig(schema, methods, statics);

      // Create raw Neogma model
      const rawModel = ModelFactory(neogmaConfig, this.neogma);

      // Create typed wrapper
      const typedModel = new TypedNeogmaModel<T>(rawModel, schema, hooks);

      // Register model
      this.registerModel(schema.label, typedModel);
      this.rawModels.set(schema.label, rawModel);

      this.logger.log(`Created model: ${schema.label}`);

      return typedModel;
    } catch (error) {
      this.logger.error(`Failed to create model ${schema.label}:`, error);
      throw error;
    }
  }

  /**
   * Register a model
   */
  registerModel<T extends Neo4jSupportedProperties>(
    name: string,
    model: TypedNeogmaModel<T>
  ): void {
    this.models.set(name, model);
    this.logger.debug(`Registered model: ${name}`);
  }

  /**
   * Get a registered model
   */
  getModel<T extends Neo4jSupportedProperties>(
    name: string
  ): TypedNeogmaModel<T> {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model '${name}' not found`);
    }
    return model;
  }

  /**
   * Get raw Neogma model
   */
  getRawModel(name: string): any {
    const model = this.rawModels.get(name);
    if (!model) {
      throw new Error(`Raw model '${name}' not found`);
    }
    return model;
  }

  /**
   * Check if model exists
   */
  hasModel(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * Get all registered model names
   */
  getModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Clear all models
   */
  clearModels(): void {
    this.models.clear();
    this.rawModels.clear();
    this.logger.debug('Cleared all models');
  }

  /**
   * Build Neogma configuration from schema
   */
  private buildNeogmaConfig(
    schema: ModelSchema<any>,
    methods?: ModelMethods<any>,
    statics?: ModelStatics<any>
  ): any {
    const config: any = {
      label: schema.label,
      schema: this.buildNeogmaSchema(schema),
      relationships: schema.relationships || {},
      methods: methods || {},
      statics: statics || {},
    };

    if (schema.primaryKey) {
      config.primaryKeyField = schema.primaryKey;
    }

    return config;
  }

  /**
   * Build Neogma schema from our schema
   */
  private buildNeogmaSchema(schema: ModelSchema<any>): any {
    const neogmaSchema: any = {};

    for (const [key, def] of Object.entries(schema.properties)) {
      const propDef = def as PropertyDefinition<any>;
      neogmaSchema[key] = this.convertPropertyDefinition(propDef);
    }

    return neogmaSchema;
  }

  /**
   * Convert property definition to Neogma format
   */
  private convertPropertyDefinition(def: PropertyDefinition<any>): any {
    const neogmaDef: any = {
      type: this.mapPropertyType(def.type),
      required: def.required || false,
    };

    if (def.unique) {
      neogmaDef.unique = true;
    }

    if (def.default !== undefined) {
      neogmaDef.default = def.default;
    }

    if (def.validate) {
      neogmaDef.validate = def.validate;
    }

    return neogmaDef;
  }

  /**
   * Map property type to Neogma type
   */
  private mapPropertyType(type: PropertyType): string {
    const typeMap: Record<PropertyType, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'date',
      datetime: 'datetime',
      point: 'point',
      array: 'array',
      object: 'object',
      uuid: 'string',
    };

    return typeMap[type] || 'string';
  }
}
