import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';

export const CHROMA_ENTITY_METADATA_KEY = 'chroma:entity';
export const CHROMA_PROPERTY_METADATA_KEY = 'chroma:property';
export const CHROMA_EMBEDDING_METADATA_KEY = 'chroma:embedding';

export interface ChromaEntityConfig {
  collection: string;
  description?: string;
  autoEmbed?: boolean;
  embeddingFields?: string[];
  autoTimestamp?: boolean;
  autoGenerateIds?: boolean;
  idStrategy?: 'uuid' | 'auto' | 'custom';
}

export interface ChromaPropertyConfig {
  name?: string;
  serialized?: boolean;
  defaultValue?: any;
  optional?: boolean;
  transform?: {
    toChroma?: (value: any) => any;
    fromChroma?: (value: any) => any;
  };
  validate?: (value: any) => boolean | string;
  description?: string;
}

export interface ChromaMetadataConfig {
  flatten?: boolean;
  serialized?: boolean;
  validate?: (value: any) => boolean | string;
}

export interface ChromaEmbeddingConfig {
  dimension?: number;
  normalize?: boolean;
  validate?: (value: number[]) => boolean | string;
}

export interface EntityMetadata {
  collection: string;
  description?: string;
  autoEmbed: boolean;
  embeddingFields: string[];
  autoTimestamp: boolean;
  autoGenerateIds: boolean;
  idStrategy: 'uuid' | 'auto' | 'custom';
}

export interface PropertyMetadata {
  propertyKey: string;
  chromaName: string;
  serialized: boolean;
  defaultValue?: any;
  optional: boolean;
  transform?: {
    toChroma?: (value: any) => any;
    fromChroma?: (value: any) => any;
  };
  validate?: (value: any) => boolean | string;
  description?: string;
}

export function ChromaEntity(config: ChromaEntityConfig): ClassDecorator {
  return (constructor: any) => {
    validateEntityConfig(config);

    const metadata: EntityMetadata = {
      collection: config.collection,
      description: config.description,
      autoEmbed: config.autoEmbed ?? true,
      embeddingFields: config.embeddingFields || ['content'],
      autoTimestamp: config.autoTimestamp ?? true,
      autoGenerateIds: config.autoGenerateIds ?? true,
      idStrategy: config.idStrategy || 'uuid',
    };

    Reflect.defineMetadata(CHROMA_ENTITY_METADATA_KEY, metadata, constructor);
    SetMetadata(CHROMA_ENTITY_METADATA_KEY, metadata)(constructor);

    addEntityMethods(constructor.prototype, metadata);

    return constructor;
  };
}

export function ChromaProp(config?: ChromaPropertyConfig): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const finalConfig = config || {};

    let propertyType: any;
    try {
      propertyType = Reflect.getMetadata('design:type', target, propertyKey);
    } catch {
      propertyType = undefined;
    }

    const enhancedConfig = applySmartDefaults(
      String(propertyKey),
      propertyType,
      finalConfig
    );

    const metadata: PropertyMetadata = {
      propertyKey: String(propertyKey),
      chromaName: enhancedConfig.name || String(propertyKey),
      serialized: enhancedConfig.serialized || false,
      defaultValue: enhancedConfig.defaultValue,
      optional: enhancedConfig.optional ?? false,
      transform: enhancedConfig.transform,
      validate: enhancedConfig.validate,
      description: enhancedConfig.description,
    };

    const existingProperties: Map<string | symbol, PropertyMetadata> =
      Reflect.getMetadata(CHROMA_PROPERTY_METADATA_KEY, target) || new Map();
    existingProperties.set(propertyKey, metadata);

    Reflect.defineMetadata(
      CHROMA_PROPERTY_METADATA_KEY,
      existingProperties,
      target
    );
  };
}

export function ChromaId(
  config?: Omit<ChromaPropertyConfig, 'name'>
): PropertyDecorator {
  return ChromaProp({
    ...(config || {}),
    name: 'id',
  });
}

export function ChromaMetadata(
  config?: ChromaMetadataConfig
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const metadata = {
      propertyKey: String(propertyKey),
      flatten: config?.flatten ?? false,
      serialized: config?.serialized ?? false,
      validate: config?.validate,
    };

    Reflect.defineMetadata(
      `${CHROMA_PROPERTY_METADATA_KEY}:metadata`,
      metadata,
      target,
      propertyKey
    );
  };
}

export function ChromaEmbedding(
  config?: ChromaEmbeddingConfig
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const metadata = {
      propertyKey: String(propertyKey),
      dimension: config?.dimension,
      normalize: config?.normalize ?? false,
      validate: config?.validate,
    };

    Reflect.defineMetadata(
      CHROMA_EMBEDDING_METADATA_KEY,
      metadata,
      target,
      propertyKey
    );
  };
}

export function CreatedAt(
  config?: Omit<ChromaPropertyConfig, 'transform'>
): PropertyDecorator {
  return ChromaProp({
    ...(config || {}),
    transform: {
      toChroma: (date: Date) => date?.toISOString(),
      fromChroma: (str: string) => (str ? new Date(str) : null),
    },
  });
}

export function UpdatedAt(
  config?: Omit<ChromaPropertyConfig, 'transform'>
): PropertyDecorator {
  return ChromaProp({
    ...(config || {}),
    transform: {
      toChroma: (date: Date) => date?.toISOString(),
      fromChroma: (str: string) => (str ? new Date(str) : null),
    },
  });
}

export function JsonProperty(
  config?: Omit<ChromaPropertyConfig, 'serialized' | 'transform'>
): PropertyDecorator {
  return ChromaProp({
    ...(config || {}),
    serialized: true,
    transform: {
      toChroma: (obj: any) => (obj ? JSON.stringify(obj) : null),
      fromChroma: (str: string) => {
        try {
          return str ? JSON.parse(str) : null;
        } catch {
          return str;
        }
      },
    },
  });
}

function addEntityMethods(prototype: any, metadata: EntityMetadata): void {
  if (!prototype.toChroma) {
    prototype.toChroma = function (): Record<string, any> {
      const result: Record<string, any> = {
        id: this.id,
        content: this.content,
        metadata: {},
      };

      const properties: Map<string, PropertyMetadata> =
        Reflect.getMetadata(CHROMA_PROPERTY_METADATA_KEY, this) || new Map();

      properties.forEach((propertyMetadata, propertyKey) => {
        if (typeof propertyKey !== 'string') return;
        const value = this[propertyKey];

        if (value !== undefined) {
          const chromaName = propertyMetadata.chromaName;

          if (propertyMetadata.transform?.toChroma) {
            result.metadata[chromaName] =
              propertyMetadata.transform.toChroma(value);
          } else if (propertyMetadata.serialized) {
            result.metadata[chromaName] = JSON.stringify(value);
          } else {
            result.metadata[chromaName] = value;
          }
        }
      });

      if (this.embedding) {
        result.embedding = this.embedding;
      }

      if (metadata.autoTimestamp) {
        result.metadata.updatedAt = new Date().toISOString();
        if (!result.metadata.createdAt) {
          result.metadata.createdAt = new Date().toISOString();
        }
      }

      return result;
    };
  }

  if (!prototype.constructor.fromChroma) {
    prototype.constructor.fromChroma = function (
      data: Record<string, any>
    ): any {
      const instance = new this();
      const properties: Map<string, PropertyMetadata> =
        Reflect.getMetadata(CHROMA_PROPERTY_METADATA_KEY, instance) ||
        new Map();

      instance.id = data.id;
      instance.content = data.content || data.document || '';
      instance.metadata = data.metadata || {};
      instance.embedding = data.embedding;

      properties.forEach((propertyMetadata, propertyKey) => {
        if (typeof propertyKey !== 'string') return;
        const chromaName = propertyMetadata.chromaName;
        const value = data.metadata?.[chromaName];

        if (value !== undefined) {
          if (propertyMetadata.transform?.fromChroma) {
            instance[propertyKey] =
              propertyMetadata.transform.fromChroma(value);
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
      });

      return instance;
    };
  }

  if (!prototype.getCollectionName) {
    prototype.getCollectionName = function (): string {
      return metadata.collection;
    };
  }
}

function validateEntityConfig(config: ChromaEntityConfig): void {
  if (!config.collection || typeof config.collection !== 'string') {
    throw new Error('ChromaEntity decorator requires a valid collection name');
  }

  if (config.collection.trim().length === 0) {
    throw new Error('ChromaEntity collection name cannot be empty');
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(config.collection)) {
    throw new Error(
      'ChromaEntity collection name must be a valid ChromaDB identifier'
    );
  }
}

function applySmartDefaults(
  propertyName: string,
  propertyType: any,
  config: ChromaPropertyConfig
): ChromaPropertyConfig {
  const defaults = { ...config };

  if (propertyName === 'id' && !config.defaultValue) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      defaults.defaultValue = () => crypto.randomUUID();
    }
  }

  if (propertyName.endsWith('At') && !config.transform && !config.serialized) {
    if (
      propertyType === Date ||
      !propertyType ||
      propertyName.match(/^(created|updated|deleted|modified)At$/i)
    ) {
      defaults.transform = {
        toChroma: (date: Date) => date?.toISOString() || null,
        fromChroma: (str: string) => (str ? new Date(str) : null),
      };
      if (!config.description) {
        defaults.description = `Auto-detected timestamp field: ${propertyName}`;
      }
    }
  }

  if (
    propertyName.toLowerCase().includes('email') &&
    !config.transform &&
    (propertyType === String || !propertyType)
  ) {
    defaults.transform = {
      toChroma: (email: string) => email?.toLowerCase()?.trim() || null,
      fromChroma: (email: string) => email?.toLowerCase()?.trim() || null,
    };
    if (!config.description) {
      defaults.description = `Auto-detected email field: ${propertyName}`;
    }
  }

  if (!config.serialized && !config.transform) {
    if (
      propertyType === Object ||
      propertyType === Array ||
      (propertyType &&
        typeof propertyType === 'function' &&
        !['String', 'Number', 'Boolean', 'Date'].includes(propertyType.name))
    ) {
      defaults.serialized = true;
      defaults.transform = {
        toChroma: (obj: any) => (obj ? JSON.stringify(obj) : null),
        fromChroma: (str: string) => {
          try {
            return str ? JSON.parse(str) : null;
          } catch {
            return str;
          }
        },
      };
      if (!config.description) {
        defaults.description = `Auto-detected JSON field: ${propertyName}`;
      }
    }
  }

  return defaults;
}
