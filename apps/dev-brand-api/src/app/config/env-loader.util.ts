import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Environment configuration loader utility
 * Supports loading multiple .env files with proper precedence and encapsulation
 * Includes smart path resolution for different deployment scenarios
 */
export class EnvLoader {
  private static loaded = false;
  private static loadedFiles: string[] = [];
  private static readonly ENV_FILENAME = '.env';

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

  /**
   * Find the .env file using a deterministic path resolution strategy
   * Integrated from EnvPathResolver for unified environment handling
   * @returns Absolute path to the .env file
   * @throws Error if .env file cannot be located
   */
  static findEnvFilePath(): string {
    // Strategy 1: Look in current working directory (runtime context)
    const cwdPath = join(process.cwd(), this.ENV_FILENAME);
    if (existsSync(cwdPath)) {
      return cwdPath;
    }

    // Strategy 2: Look relative to the built application file (__dirname)
    const builtAppPath = join(__dirname, this.ENV_FILENAME);
    if (existsSync(builtAppPath)) {
      return builtAppPath;
    }

    // Strategy 3: Look in project root from dist directory structure
    // apps/dev-brand-api/dist -> ../../../.env
    const projectRootFromDist = join(__dirname, '../../../', this.ENV_FILENAME);
    if (existsSync(projectRootFromDist)) {
      return projectRootFromDist;
    }

    // Strategy 4: Look in workspace root (monorepo scenario)
    const workspaceRoot = join(process.cwd(), '../../../', this.ENV_FILENAME);
    if (existsSync(workspaceRoot)) {
      return workspaceRoot;
    }

    // Strategy 5: Search up the directory tree from current location
    const searchUpPath = this.searchUpDirectoryTree(__dirname);
    if (searchUpPath) {
      return searchUpPath;
    }

    // Log all attempted paths for debugging
    const attemptedPaths = [
      cwdPath,
      builtAppPath,
      projectRootFromDist,
      workspaceRoot,
    ];

    throw new Error(
      `Could not locate .env file. Searched in:\n${attemptedPaths.join(
        '\n'
      )}\n\nPlease ensure .env file exists in your project root.`
    );
  }

  /**
   * Search up the directory tree from starting directory to find .env file
   * @param startDir Starting directory for search
   * @param maxLevels Maximum levels to search up (prevent infinite loops)
   * @returns Path to .env file or null if not found
   */
  private static searchUpDirectoryTree(
    startDir: string,
    maxLevels = 10
  ): string | null {
    let currentDir = startDir;

    for (let level = 0; level < maxLevels; level++) {
      const envPath = join(currentDir, this.ENV_FILENAME);

      if (existsSync(envPath)) {
        return envPath;
      }

      const parentDir = join(currentDir, '..');

      // Reached filesystem root
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Validate that the .env file is readable and contains expected content
   * @param envPath Path to the .env file
   * @returns true if file is valid, false otherwise
   */
  static validateEnvFile(envPath: string): boolean {
    try {
      const stats = require('fs').statSync(envPath);

      if (!stats.isFile()) {
        return false;
      }

      if (stats.size === 0) {
        return false;
      }

      // Try to read a few bytes to ensure file is readable
      const fs = require('fs');
      const fd = fs.openSync(envPath, 'r');
      const buffer = Buffer.alloc(10);
      fs.readSync(fd, buffer, 0, 10, 0);
      fs.closeSync(fd);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the resolved .env file path with validation
   * @returns Validated absolute path to .env file
   */
  static getValidatedEnvPath(): string {
    const envPath = this.findEnvFilePath();

    if (!this.validateEnvFile(envPath)) {
      throw new Error(`Invalid .env file at: ${envPath}`);
    }

    return envPath;
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
