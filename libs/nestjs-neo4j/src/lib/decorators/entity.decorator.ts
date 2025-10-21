import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_METADATA_KEYS,
  type EntityConfig,
  type PropertyMapping,
  type RelationshipMapping,
} from '../interfaces/decorator-metadata.interface';
import type { ModelRelatedNodesI } from 'neogma';

/**
 * Configuration for the @Neo4jEntity decorator
 */
export interface Neo4jEntityConfig {
  /** Primary Neo4j label for this entity */
  label: string;
  /** Additional labels to apply */
  additionalLabels?: string[];
  /** ID generation strategy */
  idStrategy?: 'uuid' | 'auto' | 'custom';
  /** Property name for the ID field */
  idProperty?: string;
  /** Description for documentation */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Constraint configuration */
  constraints?: {
    /** Unique constraints */
    unique?: string[][];
    /** Index configuration */
    index?: string[];
    /** Node key constraints */
    key?: string[];
  };
  /** Whether to create actual Neogma model (NEW) */
  createNeogmaModel?: boolean;
  /** Neogma model statics configuration (NEW) */
  statics?: Record<string, any>;
  /** Neogma model methods configuration (NEW) */
  methods?: Record<string, any>;
}

/**
 * Configuration for the @Neo4jProp decorator
 */
export interface Neo4jPropertyConfig {
  /** Property name in Neo4j (defaults to TypeScript property name) */
  name?: string;
  /** Whether this property should be serialized as JSON */
  serialized?: boolean;
  /** Default value for this property */
  defaultValue?: any;
  /** Whether this property is optional */
  optional?: boolean;
  /** Transformation functions */
  transform?: {
    /** Transform value when saving to Neo4j */
    toNeo4j?: (value: any) => any;
    /** Transform value when loading from Neo4j */
    fromNeo4j?: (value: any) => any;
  };
  /** Validation function */
  validate?: (value: any) => boolean | string;
  /** Description for documentation */
  description?: string;
}

/**
 * Configuration for the @Neo4jRelationship decorator
 */
export interface Neo4jRelationshipConfig {
  /** Relationship type in Neo4j */
  type: string;
  /** Direction of the relationship */
  direction: 'IN' | 'OUT' | 'BOTH';
  /** Target entity type factory (alias: target) */
  targetType?: () => any;
  /** Target entity type factory (alias: targetType) */
  target?: () => any;
  /** Whether this relationship is optional */
  optional?: boolean;
  /** Whether this is a collection of relationships */
  isArray?: boolean;
  /** Relationship properties type factory */
  propertiesType?: () => any;
  /** Eager loading configuration */
  eager?: boolean;
  /** Cascade operations */
  cascade?: ('create' | 'update' | 'delete')[];
  /** Description for documentation */
  description?: string;
}

/**
 *  @Neo4jEntity decorator for entity mapping
 *
 * Features:
 * - Automatic property and relationship mapping
 * - Type-safe entity definitions
 * - Flexible ID generation strategies
 * - Support for multiple labels
 * - Serialization/deserialization hooks
 * - String shorthand for simple entities
 * - Smart defaults for common patterns
 *
 * @example
 * ```typescript
 * // String shorthand (NEW)
 * @Neo4jEntity('User')
 * export class User {
 *   @Neo4jProp() // Smart defaults applied
 *   id: string;
 *
 *   @Neo4jProp() // Auto-detects email field
 *   email: string;
 *
 *   @Neo4jProp() // Auto-detects timestamp field
 *   createdAt: Date;
 * }
 *
 * // Full configuration (existing approach)
 * @Neo4jEntity({
 *   label: 'User',
 *   additionalLabels: ['Person'],
 *   idStrategy: 'uuid'
 * })
 * export class DetailedUser {
 *   @Neo4jProp()
 *   id: string;
 *
 *   @Neo4jProp({ name: 'fullName' })
 *   name: string;
 *
 *   @Neo4jRelationship({
 *     type: 'AUTHORED',
 *     direction: 'OUT',
 *     targetType: () => Post,
 *     isArray: true
 *   })
 *   posts: Post[];
 * }
 * ```
 */
// Existing signature (unchanged)
export function Neo4jEntity(config: Neo4jEntityConfig): ClassDecorator;
// NEW: String shorthand signature
export function Neo4jEntity(
  label: string,
  config?: Partial<Neo4jEntityConfig>
): ClassDecorator;
// Implementation (enhanced but same decorator)
export function Neo4jEntity(
  labelOrConfig: string | Neo4jEntityConfig,
  optionalConfig?: Partial<Neo4jEntityConfig>
): ClassDecorator {
  return (constructor: any) => {
    // NEW: Handle string shorthand
    const config: Neo4jEntityConfig =
      typeof labelOrConfig === 'string'
        ? {
            label: labelOrConfig,
            idStrategy: 'uuid', // Smart default
            idProperty: 'id', // Smart default
            createNeogmaModel: true, // NEW: Default to creating Neogma models
            ...optionalConfig,
          }
        : { createNeogmaModel: true, ...labelOrConfig };

    // Validate configuration
    validateEntityConfig(config);

    // Create entity metadata
    const metadata: EntityConfig = {
      id: `Entity:${constructor.name}`,
      label: config.label,
      additionalLabels: config.additionalLabels,
      idStrategy: config.idStrategy || 'auto',
      idProperty: config.idProperty || 'id',
      description: config.description || `Entity mapping for ${config.label}`,
      tags: config.tags || ['entity', config.label.toLowerCase()],
      enabled: true,
    };

    // Use direct Reflect.defineMetadata for better compatibility
    // This ensures metadata survives when other decorators create newConstructor
    Reflect.defineMetadata(
      DECORATOR_METADATA_KEYS.ENTITY,
      metadata,
      constructor
    );

    // Also use SetMetadata for NestJS compatibility (belt and suspenders approach)
    SetMetadata(DECORATOR_METADATA_KEYS.ENTITY, metadata)(constructor);

    // NEW: Create actual Neogma model if enabled
    if (config.createNeogmaModel) {
      createNeogmaModel(constructor, config, metadata);
    }

    // Add utility methods to the prototype
    addEntityMethods(constructor.prototype, metadata);

    return constructor;
  };
}

/**
 *  @Neo4jProp decorator for property mapping
 *
 * Features:
 * - Automatic type inference
 * - Custom serialization/deserialization
 * - Property validation
 * - Default value support
 * - Optional property handling
 * - Smart defaults based on property names
 */
export function Neo4jProp(config?: Neo4jPropertyConfig): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const finalConfig = config || {};
    // Get property type information (optional - requires experimental decorators)
    let propertyType: any;
    try {
      propertyType = Reflect.getMetadata('design:type', target, propertyKey);
    } catch (error) {
      // Fallback when design:type metadata is not available
      propertyType = undefined;
    }

    // Apply smart defaults based on property name and type
    const enhancedConfig = applySmartDefaults(
      String(propertyKey),
      propertyType,
      finalConfig
    );

    // Create property metadata
    const metadata: PropertyMapping = {
      neo4jName: enhancedConfig.name || String(propertyKey),
      tsName: String(propertyKey),
      serialized: enhancedConfig.serialized || false,
      defaultValue: enhancedConfig.defaultValue,
      type: {
        type: () => propertyType,
        optional: enhancedConfig.optional,
        validate: enhancedConfig.validate
          ? (value: any) => Boolean(enhancedConfig.validate!(value))
          : undefined,
        transform: enhancedConfig.transform?.fromNeo4j,
      },
      transform: enhancedConfig.transform,
    };

    // Store property metadata
    let existingProperties: Map<string | symbol, any>;
    try {
      existingProperties =
        Reflect.getMetadata(DECORATOR_METADATA_KEYS.PROPERTY, target) ||
        new Map();
    } catch (error) {
      existingProperties = new Map();
    }
    existingProperties.set(propertyKey, metadata);

    // Use direct Reflect.defineMetadata for property decorators
    // Property decorators don't use SetMetadata the same way as method decorators
    Reflect.defineMetadata(
      DECORATOR_METADATA_KEYS.PROPERTY,
      existingProperties,
      target
    );
  };
}

/**
 *  @Neo4jRelationship decorator for relationship mapping
 *
 * Features:
 * - Type-safe relationship definitions
 * - Bidirectional relationship support
 * - Relationship properties mapping
 * - Eager/lazy loading configuration
 * - Cascade operations
 */
export function Neo4jRelationship(
  config?: Neo4jRelationshipConfig
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    // Validate relationship configuration
    validateRelationshipConfig(config);

    // Create relationship metadata
    const metadata: RelationshipMapping = {
      type: config!.type,
      direction: config!.direction,
      targetType: config!.targetType || config!.target || (() => Object),
      optional: config!.optional || false,
      isArray: config!.isArray || false,
      propertiesType: config!.propertiesType,
    };

    // Store relationship metadata
    let existingRelationships: Map<string | symbol, any>;
    try {
      existingRelationships =
        Reflect.getMetadata(DECORATOR_METADATA_KEYS.RELATIONSHIP, target) ||
        new Map();
    } catch (error) {
      existingRelationships = new Map();
    }
    existingRelationships.set(propertyKey, metadata);

    // Use direct Reflect.defineMetadata for property decorators
    // Property decorators don't use SetMetadata the same way as method decorators
    Reflect.defineMetadata(
      DECORATOR_METADATA_KEYS.RELATIONSHIP,
      existingRelationships,
      target
    );

    // Add relationship management methods
    addRelationshipMethods(target, propertyKey, metadata);
  };
}

/**
 * Shorthand decorators for common property types
 */

/**
 * @Id decorator for ID properties
 */
export function Id(
  config?: Omit<Neo4jPropertyConfig, 'name'>
): PropertyDecorator {
  return Neo4jProp({
    ...(config || {}),
    name: 'id',
  });
}

/**
 * @CreatedAt decorator for creation timestamp
 */
export function CreatedAt(
  config?: Omit<Neo4jPropertyConfig, 'transform'>
): PropertyDecorator {
  return Neo4jProp({
    ...(config || {}),
    transform: {
      toNeo4j: (date: Date) => date?.toISOString(),
      fromNeo4j: (str: string) => (str ? new Date(str) : null),
    },
  });
}

/**
 * @UpdatedAt decorator for update timestamp
 */
export function UpdatedAt(
  config?: Omit<Neo4jPropertyConfig, 'transform'>
): PropertyDecorator {
  return Neo4jProp({
    ...(config || {}),
    transform: {
      toNeo4j: (date: Date) => date?.toISOString(),
      fromNeo4j: (str: string) => (str ? new Date(str) : null),
    },
  });
}

/**
 * @JsonProperty decorator for JSON serialized properties
 */
export function JsonProperty(
  config?: Omit<Neo4jPropertyConfig, 'serialized' | 'transform'>
): PropertyDecorator {
  return Neo4jProp({
    ...(config || {}),
    serialized: true,
    transform: {
      toNeo4j: (obj: any) => (obj ? JSON.stringify(obj) : null),
      fromNeo4j: (str: string) => {
        try {
          return str ? JSON.parse(str) : null;
        } catch {
          return str;
        }
      },
    },
  });
}

/**
 * Add utility methods to entity prototype
 */
function addEntityMethods(prototype: any, metadata: EntityConfig): void {
  // Add toNeo4j method for serialization
  if (!prototype.toNeo4j) {
    prototype.toNeo4j = function (): Record<string, any> {
      const result: Record<string, any> = {};
      let properties: Map<string, any>;
      try {
        properties =
          Reflect.getMetadata(DECORATOR_METADATA_KEYS.PROPERTY, this) ||
          new Map();
      } catch (error) {
        properties = new Map();
      }

      properties.forEach(
        (propertyMetadata: PropertyMapping, propertyKey: string | symbol) => {
          if (typeof propertyKey !== 'string') return;
          const value = this[propertyKey];

          if (value !== undefined) {
            const neo4jName = propertyMetadata.neo4jName || propertyKey;

            if (propertyMetadata.transform?.toNeo4j) {
              result[neo4jName] = propertyMetadata.transform.toNeo4j(value);
            } else if (propertyMetadata.serialized) {
              result[neo4jName] = JSON.stringify(value);
            } else {
              result[neo4jName] = value;
            }
          }
        }
      );

      return result;
    };
  }

  // Add fromNeo4j static method for deserialization
  if (!prototype.constructor.fromNeo4j) {
    prototype.constructor.fromNeo4j = function (
      data: Record<string, any>
    ): any {
      const instance = new this();
      let properties: Map<string, any>;
      try {
        properties =
          Reflect.getMetadata(DECORATOR_METADATA_KEYS.PROPERTY, instance) ||
          new Map();
      } catch (error) {
        properties = new Map();
      }

      properties.forEach(
        (propertyMetadata: PropertyMapping, propertyKey: string | symbol) => {
          if (typeof propertyKey !== 'string') return;
          const neo4jName = propertyMetadata.neo4jName || propertyKey;
          const value = data[neo4jName];

          if (value !== undefined) {
            if (propertyMetadata.transform?.fromNeo4j) {
              instance[propertyKey] =
                propertyMetadata.transform.fromNeo4j(value);
            } else if (propertyMetadata.serialized) {
              try {
                instance[propertyKey] = JSON.parse(value);
              } catch {
                instance[propertyKey] = value;
              }
            } else {
              instance[propertyKey] = value;
            }
          } else if (propertyMetadata.defaultValue !== undefined) {
            instance[propertyKey] = propertyMetadata.defaultValue;
          }
        }
      );

      return instance;
    };
  }

  // Add getLabel method
  if (!prototype.getLabel) {
    prototype.getLabel = function (): string {
      return metadata.label;
    };
  }

  // Add getLabels method
  if (!prototype.getLabels) {
    prototype.getLabels = function (): string[] {
      const labels = [metadata.label];
      if (metadata.additionalLabels) {
        labels.push(...metadata.additionalLabels);
      }
      return labels;
    };
  }
}

/**
 * Add relationship management methods
 */
function addRelationshipMethods(
  prototype: any,
  propertyKey: string | symbol,
  metadata: RelationshipMapping
): void {
  const methodPrefix = String(propertyKey);

  // Add relationship query method
  const queryMethodName = `get${capitalize(methodPrefix)}Query`;
  if (!prototype[queryMethodName]) {
    prototype[queryMethodName] = function (): string {
      const relationshipPattern =
        metadata.direction === 'BOTH'
          ? `-[:${metadata.type}]-`
          : metadata.direction === 'IN'
          ? `<-[:${metadata.type}]-`
          : `-[:${metadata.type}]->`;

      return `MATCH (source) ${relationshipPattern} (target) WHERE source.id = $sourceId RETURN target`;
    };
  }
}

/**
 * Validate entity configuration
 */
function validateEntityConfig(config: Neo4jEntityConfig): void {
  if (!config.label || typeof config.label !== 'string') {
    throw new Error('Neo4jEntity decorator requires a valid label string');
  }

  if (config.label.trim().length === 0) {
    throw new Error('Neo4jEntity label cannot be empty');
  }

  // Validate label format (basic Neo4j label rules)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.label)) {
    throw new Error('Neo4jEntity label must be a valid Neo4j identifier');
  }

  if (config.additionalLabels) {
    config.additionalLabels.forEach((label) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
        throw new Error(`Invalid additional label: ${label}`);
      }
    });
  }
}

/**
 * Validate relationship configuration
 */
function validateRelationshipConfig(config?: Neo4jRelationshipConfig): void {
  if (!config) {
    throw new Error('Neo4jRelationship decorator requires configuration');
  }

  if (!config.type || typeof config.type !== 'string') {
    throw new Error('Neo4jRelationship decorator requires a valid type string');
  }

  if (!['IN', 'OUT', 'BOTH'].includes(config.direction)) {
    throw new Error('Neo4jRelationship direction must be IN, OUT, or BOTH');
  }

  // Validate target/targetType if provided (optional - defaults to Object)
  const targetFunction = config.targetType || config.target;
  if (targetFunction && typeof targetFunction !== 'function') {
    throw new Error(
      'Neo4jRelationship target or targetType must be a function when provided'
    );
  }

  // Validate relationship type format
  if (!/^[A-Z_][A-Z0-9_]*$/.test(config.type)) {
    throw new Error(
      'Neo4jRelationship type should follow UPPER_CASE convention'
    );
  }
}

/**
 * Apply smart defaults based on property name patterns and types
 */
function applySmartDefaults(
  propertyName: string,
  propertyType: any,
  config: Neo4jPropertyConfig
): Neo4jPropertyConfig {
  const defaults = { ...config };

  // Smart defaults based on property name patterns
  if (propertyName === 'id' && !config.name) {
    defaults.name = 'id';
    // Smart default for ID generation
    if (
      !config.defaultValue &&
      typeof crypto !== 'undefined' &&
      crypto.randomUUID
    ) {
      defaults.defaultValue = () => crypto.randomUUID();
    } else if (!config.defaultValue) {
      defaults.defaultValue = () => generateId();
    }
  }

  // Timestamp fields - auto-detect and apply ISO string transformation
  if (propertyName.endsWith('At') && !config.transform && !config.serialized) {
    // Likely a timestamp field (createdAt, updatedAt, deletedAt, etc.)
    if (
      propertyType === Date ||
      !propertyType ||
      propertyName.match(/^(created|updated|deleted|modified|last|first)At$/i)
    ) {
      defaults.transform = {
        toNeo4j: (date: Date) => date?.toISOString() || null,
        fromNeo4j: (str: string) => (str ? new Date(str) : null),
      };
      if (!config.description) {
        defaults.description = `Auto-detected timestamp field: ${propertyName}`;
      }
    }
  }

  // Email fields - auto-detect and apply normalization
  if (
    propertyName.toLowerCase().includes('email') &&
    !config.transform &&
    (propertyType === String || !propertyType)
  ) {
    defaults.transform = {
      toNeo4j: (email: string) => email?.toLowerCase()?.trim() || null,
      fromNeo4j: (email: string) => email?.toLowerCase()?.trim() || null,
    };
    if (!config.description) {
      defaults.description = `Auto-detected email field: ${propertyName}`;
    }
  }

  // URL fields - auto-detect and apply normalization
  if (
    (propertyName.toLowerCase().includes('url') ||
      propertyName.toLowerCase().includes('link')) &&
    !config.transform &&
    (propertyType === String || !propertyType)
  ) {
    defaults.transform = {
      toNeo4j: (url: string) => url?.trim() || null,
      fromNeo4j: (url: string) => url?.trim() || null,
    };
    if (!config.description) {
      defaults.description = `Auto-detected URL field: ${propertyName}`;
    }
  }

  // JSON fields - auto-detect based on property type
  if (!config.serialized && !config.transform) {
    // If it's an Object type and not a Date/String/Number/Boolean, assume JSON
    if (
      propertyType === Object ||
      propertyType === Array ||
      (propertyType &&
        typeof propertyType === 'function' &&
        !['String', 'Number', 'Boolean', 'Date'].includes(propertyType.name))
    ) {
      defaults.serialized = true;
      defaults.transform = {
        toNeo4j: (obj: any) => (obj ? JSON.stringify(obj) : null),
        fromNeo4j: (str: string) => {
          try {
            return str ? JSON.parse(str) : null;
          } catch {
            return str; // Return original string if parse fails
          }
        },
      };
      if (!config.description) {
        defaults.description = `Auto-detected JSON field: ${propertyName}`;
      }
    }
  }

  // Boolean fields - ensure proper transformation
  if (
    (propertyType === Boolean ||
      (!propertyType && propertyName.toLowerCase().includes('is'))) &&
    !config.transform
  ) {
    defaults.transform = {
      toNeo4j: (value: boolean) => value === true,
      fromNeo4j: (value: any) => Boolean(value),
    };
  }

  // Number fields - ensure proper transformation for Neo4j integers
  if (
    (propertyType === Number ||
      (!propertyType &&
        (propertyName.toLowerCase().includes('count') ||
          propertyName.toLowerCase().includes('num')))) &&
    !config.transform
  ) {
    // For integer-like fields, use Neo4j's int() function pattern
    if (
      propertyName.match(
        /^(count|num|index|position|order|rank|level|depth|height|width|size|length|total|sum)$/i
      )
    ) {
      defaults.transform = {
        toNeo4j: (value: number) =>
          value != null ? Math.floor(Number(value)) : null,
        fromNeo4j: (value: any) => (value != null ? Number(value) : null),
      };
      if (!config.description) {
        defaults.description = `Auto-detected integer field: ${propertyName}`;
      }
    }
  }

  // Version fields - special handling
  if (
    propertyName.toLowerCase() === 'version' &&
    !config.defaultValue &&
    !config.transform
  ) {
    defaults.defaultValue = 1;
    defaults.transform = {
      toNeo4j: (version: number) => version || 1,
      fromNeo4j: (version: number) => version || 1,
    };
    if (!config.description) {
      defaults.description = `Auto-detected version field for optimistic locking`;
    }
  }

  // Status/State fields - suggest enum-like handling
  if (
    (propertyName.toLowerCase().includes('status') ||
      propertyName.toLowerCase().includes('state')) &&
    propertyType === String &&
    !config.description
  ) {
    defaults.description = `Auto-detected status/state field: ${propertyName}`;
  }

  return defaults;
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a unique ID (fallback for environments without crypto.randomUUID)
 */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * NEW: Create actual Neogma model from entity configuration
 */
function createNeogmaModel(
  constructor: any,
  config: Neo4jEntityConfig,
  metadata: EntityConfig
): void {
  // Extract property mappings from entity
  const properties: Map<string, PropertyMapping> =
    Reflect.getMetadata(
      DECORATOR_METADATA_KEYS.PROPERTY,
      constructor.prototype
    ) || new Map();

  const relationships: Map<string, RelationshipMapping> =
    Reflect.getMetadata(
      DECORATOR_METADATA_KEYS.RELATIONSHIP,
      constructor.prototype
    ) || new Map();

  // Build Neogma model schema from property mappings
  const neogmaSchema: Record<string, any> = {};
  const neogmaRelationships: Record<string, ModelRelatedNodesI<any, any>> = {};

  // Process properties
  properties.forEach((propertyMapping, key) => {
    if (
      typeof key === 'string' &&
      key !== undefined &&
      propertyMapping.neo4jName
    ) {
      neogmaSchema[propertyMapping.neo4jName] = {
        type: propertyMapping.serialized
          ? 'string'
          : inferNeogmaType(propertyMapping),
        required: !propertyMapping.type?.optional,
        default: propertyMapping.defaultValue,
      };
    }
  });

  // Process relationships
  relationships.forEach((relationshipMapping, key) => {
    if (typeof key === 'string') {
      neogmaRelationships[key] = {
        model: relationshipMapping.targetType,
        direction: relationshipMapping.direction.toLowerCase() as 'in' | 'out',
        name: relationshipMapping.type,
        properties: relationshipMapping.propertiesType
          ? {
              model: relationshipMapping.propertiesType,
            }
          : undefined,
      } as any;
    }
  });

  // Create Neogma model configuration
  const neogmaModelConfig = {
    label: metadata.label,
    schema: neogmaSchema,
    relationships: neogmaRelationships,
    primaryKeyField: metadata.idProperty,
    statics: config.statics || {},
    methods: config.methods || {},
  };

  // Store Neogma model configuration for DI registration
  Reflect.defineMetadata('NEOGMA_MODEL_CONFIG', neogmaModelConfig, constructor);

  // Store model token for dependency injection
  const modelToken = `${constructor.name}Model`;
  Reflect.defineMetadata('NEOGMA_MODEL_TOKEN', modelToken, constructor);

  // Add static method to get Neogma model configuration
  if (!constructor.getNeogmaModelConfig) {
    constructor.getNeogmaModelConfig = () => neogmaModelConfig;
  }

  // Add static method to get model token
  if (!constructor.getModelToken) {
    constructor.getModelToken = () => modelToken;
  }
}

/**
 * Infer Neogma type from property mapping
 */
function inferNeogmaType(propertyMapping: PropertyMapping): string {
  // If property has explicit type information
  if (propertyMapping.type?.type) {
    const typeConstructor = propertyMapping.type.type();
    if (typeConstructor === String) return 'string';
    if (typeConstructor === Number) return 'number';
    if (typeConstructor === Boolean) return 'boolean';
    if (typeConstructor === Date) return 'datetime';
    if (typeConstructor === Array) return 'array';
  }

  // If property is serialized, it's stored as string
  if (propertyMapping.serialized) return 'string';

  // If property has transform functions, analyze them
  if (propertyMapping.transform?.toNeo4j) {
    // Try to infer from transform function
    const transformStr = propertyMapping.transform.toNeo4j.toString();
    if (transformStr.includes('toISOString')) return 'datetime';
    if (transformStr.includes('JSON.stringify')) return 'string';
    if (transformStr.includes('Number(')) return 'number';
    if (transformStr.includes('Boolean(')) return 'boolean';
  }

  // Default to string for safety
  return 'string';
}

/**
 * Enhanced @Neo4jEntity namespace with helper methods (same decorator, different configs)
 */
export namespace Neo4jEntity {
  /**
   * Timestamped entity helper - adds createdAt and updatedAt automatically
   */
  export const Timestamped = (
    label: string,
    config?: Partial<Neo4jEntityConfig>
  ) =>
    Neo4jEntity(label, {
      idStrategy: 'uuid',
      createNeogmaModel: true,
      ...config,
      additionalLabels: ['Timestamped', ...(config?.additionalLabels || [])],
      description:
        config?.description ||
        `Timestamped ${label} entity with automatic createdAt/updatedAt`,
    });

  /**
   * Soft delete entity helper - supports logical deletion
   */
  export const SoftDelete = (
    label: string,
    config?: Partial<Neo4jEntityConfig>
  ) =>
    Neo4jEntity(label, {
      idStrategy: 'uuid',
      createNeogmaModel: true,
      ...config,
      additionalLabels: ['SoftDelete', ...(config?.additionalLabels || [])],
      description:
        config?.description ||
        `Soft delete ${label} entity with logical deletion support`,
    });

  /**
   * Auditable entity helper - full audit trail
   */
  export const Auditable = (
    label: string,
    config?: Partial<Neo4jEntityConfig>
  ) =>
    Neo4jEntity(label, {
      idStrategy: 'uuid',
      createNeogmaModel: true,
      ...config,
      additionalLabels: [
        'Auditable',
        'Timestamped',
        ...(config?.additionalLabels || []),
      ],
      description:
        config?.description ||
        `Auditable ${label} entity with full audit trail`,
    });

  /**
   * Tenanted entity helper - multi-tenancy support
   */
  export const Tenanted = (
    label: string,
    config?: Partial<Neo4jEntityConfig>
  ) =>
    Neo4jEntity(label, {
      idStrategy: 'uuid',
      createNeogmaModel: true,
      ...config,
      additionalLabels: ['Tenanted', ...(config?.additionalLabels || [])],
      description: config?.description || `Multi-tenant ${label} entity`,
    });
}
