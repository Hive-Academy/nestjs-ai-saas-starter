import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Environment configuration loader utility
 *
 * Loads multiple .env files with proper precedence:
 * - Lower precedence: .env.chromadb, .env.neo4j, .env.llm, .env.platform
 * - Higher precedence: .env.app (overrides all others)
 *
 * Features:
 * - Singleton pattern prevents multiple loads
 * - Variable expansion support (e.g., ${VAR_NAME})
 * - Detailed error reporting
 * - Automatically finds project root (where .env files are located)
 */
export class EnvLoader {
  private static loaded = false;
  private static loadedFiles: string[] = [];
  private static projectRoot: string | null = null;

  /**
   * Load environment files with proper precedence
   *
   * Files are loaded in order of precedence (lowest to highest):
   * 1. .env.chromadb
   * 2. .env.neo4j
   * 3. .env.llm
   * 4. .env.platform
   * 5. .env.app (HIGHEST - overrides all)
   *
   * @param options Configuration options
   * @returns Object with loadedFiles array and errors array
   */
  static load(
    options: {
      /** Root directory to search for .env files (defaults to auto-detected project root) */
      rootDir?: string;
      /** Force reload even if already loaded */
      override?: boolean;
      /** Enable variable expansion like ${VAR_NAME} (default: true) */
      expand?: boolean;
    } = {}
  ): { loadedFiles: string[]; errors: string[] } {
    // Return cached result if already loaded (unless override is true)
    if (this.loaded && !options.override) {
      return { loadedFiles: [...this.loadedFiles], errors: [] };
    }

    const { rootDir = this.findProjectRoot(), expand: enableExpand = true } =
      options;

    const loadedFiles: string[] = [];
    const errors: string[] = [];

    // Files in order of precedence (lowest to highest)
    // Later files override earlier files
    const envFiles = [
      '.env.chromadb', // 1. ChromaDB config (lowest precedence)
      '.env.neo4j', // 2. Neo4j config
      '.env.llm', // 3. LLM config
      '.env.platform', // 4. Platform config
      '.env.app', // 5. App config (HIGHEST precedence)
    ];

    // Load each file sequentially
    // dotenv with override:true means later files override earlier ones
    for (const envFile of envFiles) {
      const filePath = join(rootDir, envFile);

      if (existsSync(filePath)) {
        try {
          // Load with override:true so later files can override earlier ones
          const result = config({
            path: filePath,
            override: true, // Critical: allows .env.app to override others
          });

          if (result.error) {
            errors.push(`Error loading ${envFile}: ${result.error.message}`);
          } else {
            loadedFiles.push(envFile);

            // Apply variable expansion if enabled (e.g., ${VAR_NAME})
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

    // Mark as loaded and cache results
    this.loaded = true;
    this.loadedFiles = [...loadedFiles];

    return { loadedFiles, errors };
  }

  /**
   * Reset loader state (useful for testing)
   */
  static reset(): void {
    this.loaded = false;
    this.loadedFiles = [];
  }

  /**
   * Get list of successfully loaded files
   */
  static getLoadedFiles(): string[] {
    return [...this.loadedFiles];
  }

  /**
   * Check if environment has been loaded
   */
  static isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Find the monorepo root directory by looking for nx.json
   *
   * This walks up the directory tree from the current file location until it finds
   * a directory containing nx.json (indicator of Nx monorepo root)
   *
   * @returns The monorepo root directory path
   */
  private static findProjectRoot(): string {
    if (this.projectRoot) {
      return this.projectRoot;
    }

    // Start from current file location
    let currentDir = __dirname;
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;

    while (depth < maxDepth) {
      // Look specifically for nx.json (only exists at monorepo root)
      const nxJsonPath = join(currentDir, 'nx.json');

      if (existsSync(nxJsonPath)) {
        this.projectRoot = currentDir;
        return currentDir;
      }

      // Move up one directory
      const parentDir = resolve(currentDir, '..');

      // If we've reached the filesystem root, stop
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
      depth++;
    }

    // Fallback to process.cwd() if nx.json not found
    this.projectRoot = process.cwd();
    return this.projectRoot;
  }
}
