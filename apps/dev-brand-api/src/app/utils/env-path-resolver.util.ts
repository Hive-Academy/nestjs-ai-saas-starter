import * as path from 'path';
import * as fs from 'fs';

/**
 * Utility for resolving .env file paths in different deployment scenarios
 * Handles development, build, and production environments
 */
export class EnvPathResolver {
  private static readonly ENV_FILENAME = '.env';

  /**
   * Find the .env file using a deterministic path resolution strategy
   * @returns Absolute path to the .env file
   * @throws Error if .env file cannot be located
   */
  static findEnvFilePath(): string {
    // Strategy 1: Look in current working directory (runtime context)
    const cwdPath = path.resolve(process.cwd(), this.ENV_FILENAME);
    if (fs.existsSync(cwdPath)) {
      console.log(`🔧 Found .env at: ${cwdPath} (current working directory)`);
      return cwdPath;
    }

    // Strategy 2: Look relative to the built application file (__dirname)
    const builtAppPath = path.resolve(__dirname, this.ENV_FILENAME);
    if (fs.existsSync(builtAppPath)) {
      console.log(`🔧 Found .env at: ${builtAppPath} (near built application)`);
      return builtAppPath;
    }

    // Strategy 3: Look in project root from dist directory structure
    // apps/dev-brand-api/dist -> ../../../.env
    const projectRootFromDist = path.resolve(
      __dirname,
      '../../../',
      this.ENV_FILENAME
    );
    if (fs.existsSync(projectRootFromDist)) {
      console.log(
        `🔧 Found .env at: ${projectRootFromDist} (project root from dist)`
      );
      return projectRootFromDist;
    }

    // Strategy 4: Look in workspace root (monorepo scenario)
    // Handle case where cwd might be in a subdirectory
    const workspaceRoot = path.resolve(
      process.cwd(),
      '../../../',
      this.ENV_FILENAME
    );
    if (fs.existsSync(workspaceRoot)) {
      console.log(`🔧 Found .env at: ${workspaceRoot} (workspace root)`);
      return workspaceRoot;
    }

    // Strategy 5: Search up the directory tree from current location
    const searchUpPath = this.searchUpDirectoryTree(__dirname);
    if (searchUpPath) {
      console.log(`🔧 Found .env at: ${searchUpPath} (directory tree search)`);
      return searchUpPath;
    }

    // Log all attempted paths for debugging
    const attemptedPaths = [
      cwdPath,
      builtAppPath,
      projectRootFromDist,
      workspaceRoot,
    ];

    console.error('❌ Failed to locate .env file. Attempted paths:');
    attemptedPaths.forEach((p, i) => console.error(`  ${i + 1}. ${p}`));

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
      const envPath = path.join(currentDir, this.ENV_FILENAME);

      if (fs.existsSync(envPath)) {
        return envPath;
      }

      const parentDir = path.dirname(currentDir);

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
      const stats = fs.statSync(envPath);

      if (!stats.isFile()) {
        console.warn(`⚠️  .env path exists but is not a file: ${envPath}`);
        return false;
      }

      if (stats.size === 0) {
        console.warn(`⚠️  .env file is empty: ${envPath}`);
        return false;
      }

      // Try to read a few bytes to ensure file is readable
      const fd = fs.openSync(envPath, 'r');
      const buffer = Buffer.alloc(10);
      fs.readSync(fd, buffer, 0, 10, 0);
      fs.closeSync(fd);

      console.log(`✅ .env file validated successfully: ${envPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to validate .env file: ${envPath}`, error);
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
