import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Environment configuration loader utility
 * Supports loading multiple .env files with proper precedence and encapsulation
 */
export class EnvLoader {
  private static loaded = false;
  private static loadedFiles: string[] = [];

  /**
   * Load environment files with proper precedence
   * @param options Configuration options
   */
  static load(
    options: {
      /** Root directory to search for .env files */
      rootDir?: string;
      /** Specific environment files to load (in order of precedence) */
      envFiles?: string[];
      /** Override existing environment variables */
      override?: boolean;
      /** Enable variable expansion (e.g., ${VAR}) */
      expand?: boolean;
    } = {}
  ) {
    if (this.loaded && !options.override) {
      return { loadedFiles: this.loadedFiles };
    }

    const {
      rootDir = process.cwd(),
      envFiles = this.getDefaultEnvFiles(),
      override = false,
      expand: enableExpand = true,
    } = options;

    const loadedFiles: string[] = [];
    const errors: string[] = [];

    // Load files in reverse order so later files have higher precedence
    const filesToLoad = [...envFiles].reverse();

    for (const envFile of filesToLoad) {
      const filePath = join(rootDir, envFile);

      if (existsSync(filePath)) {
        try {
          const result = config({
            path: filePath,
            override: override || false,
          });

          if (result.error) {
            errors.push(`Error loading ${envFile}: ${result.error.message}`);
          } else {
            loadedFiles.push(envFile);

            // Apply variable expansion if enabled
            if (enableExpand && result.parsed) {
              expand({ parsed: result.parsed });
            }
          }
        } catch (error) {
          errors.push(
            `Failed to load ${envFile}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    this.loaded = true;
    this.loadedFiles = loadedFiles;

    return { loadedFiles, errors };
  }

  /**
   * Get default environment files in order of precedence (lowest to highest)
   */
  private static getDefaultEnvFiles(): string[] {
    const nodeEnv = process.env.NODE_ENV || 'development';

    return [
      // Base configurations (lowest precedence)
      '.env.chromadb',
      '.env.neo4j',
      '.env.llm',
      '.env.platform',

      // Main environment file (highest precedence)
      '.env.app',
    ];
  }

  /**
   * Load environment configuration for a specific module
   */
  static loadModuleConfig(
    moduleName: string,
    rootDir?: string
  ): {
    loadedFiles: string[];
    errors: string[];
  } {
    const envFiles = [`.env.${moduleName}`, '.env.local', '.env'];

    const result = this.load({
      rootDir,
      envFiles,
      override: false,
    });

    return {
      loadedFiles: result.loadedFiles,
      errors: result.errors || [],
    };
  }

  /**
   * Get configuration for a specific provider/service
   */
  static getProviderConfig<T extends Record<string, any>>(
    prefix: string,
    defaults: T = {} as T
  ): T {
    const config: Record<string, any> = { ...defaults };

    // Get all environment variables that start with the prefix
    const prefixPattern = `${prefix.toUpperCase()}_`;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefixPattern)) {
        // Remove prefix and convert to camelCase
        const configKey = key
          .slice(prefixPattern.length)
          .toLowerCase()
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        // Type conversion
        config[configKey] = this.convertValue(value);
      }
    }

    return config as T;
  }

  /**
   * Convert string environment values to appropriate types
   */
  private static convertValue(value: string | undefined): any {
    if (value === undefined || value === '') {
      return undefined;
    }

    // Boolean conversion
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number conversion
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // JSON conversion for objects/arrays
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        // If JSON parsing fails, return as string
      }
    }

    return value;
  }

  /**
   * Reset loader state (useful for testing)
   */
  static reset(): void {
    this.loaded = false;
    this.loadedFiles = [];
  }

  /**
   * Get loaded files information
   */
  static getLoadedFiles(): string[] {
    return [...this.loadedFiles];
  }

  /**
   * Check if a specific environment file was loaded
   */
  static wasFileLoaded(fileName: string): boolean {
    return this.loadedFiles.includes(fileName);
  }
}

/**
 * Configuration interfaces for type safety
 */
export interface ChromaDbConfig {
  host: string;
  port: number;
  ssl: boolean;
  tenant: string;
  database: string;
  defaultCollection: string;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  healthCheck: boolean;
}

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
  maxPoolSize: number;
  connectionTimeout: number;
  maxRetryTime: number;
  encrypted: boolean;
  healthCheck: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export interface LlmConfig {
  provider:
    | 'openai'
    | 'anthropic'
    | 'openrouter'
    | 'google'
    | 'local'
    | 'azure-openai'
    | 'cohere';
  model: string;
  temperature: number;
  maxTokens: number;
  // Provider-specific API keys
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  googleApiKey?: string;
  azureOpenaiApiKey?: string;
  cohereApiKey?: string;
}

export interface PlatformConfig {
  url: string;
  apiKey?: string;
  timeout: number;
  retryMaxAttempts: number;
  retryBackoffFactor: number;
  webhooksEnabled: boolean;
  webhookSecret?: string;
  webhookRetryMaxAttempts: number;
}

/**
 * Helper functions for getting typed configurations
 */
export const getChromaDbConfig = (): ChromaDbConfig =>
  EnvLoader.getProviderConfig<ChromaDbConfig>('CHROMADB', {
    host: 'localhost',
    port: 8000,
    ssl: false,
    tenant: 'default_tenant',
    database: 'default_database',
    defaultCollection: 'documents',
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 1000,
    healthCheck: true,
  });

export const getNeo4jConfig = (): Neo4jConfig =>
  EnvLoader.getProviderConfig<Neo4jConfig>('NEO4J', {
    uri: 'bolt://localhost:7687',
    username: 'neo4j',
    password: 'password',
    database: 'neo4j',
    maxPoolSize: 100,
    connectionTimeout: 60000,
    maxRetryTime: 30000,
    encrypted: false,
    healthCheck: true,
    retryAttempts: 5,
    retryDelay: 5000,
  });

export const getLlmConfig = (): LlmConfig =>
  EnvLoader.getProviderConfig<LlmConfig>('LLM', {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
  });

export const getPlatformConfig = (): PlatformConfig =>
  EnvLoader.getProviderConfig<PlatformConfig>('LANGGRAPH_PLATFORM', {
    url: 'https://api.langgraph.com',
    timeout: 30000,
    retryMaxAttempts: 3,
    retryBackoffFactor: 2,
    webhooksEnabled: true,
    webhookRetryMaxAttempts: 3,
  });
