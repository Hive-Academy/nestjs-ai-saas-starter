import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '@hive-academy/langgraph-workflow-engine';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 📁 FILE OPERATION TOOLS - LOCAL REPORT MANAGEMENT
 *
 * Provides tools for creating, saving, and managing research reports
 * stored as markdown files with YAML frontmatter metadata.
 *
 * Features:
 * - Create markdown reports with metadata
 * - Save and update existing reports
 * - List all saved reports with metadata
 * - Read report content and metadata
 * - Automatic directory management
 */
@Injectable()
export class FileOperationTools {
  private readonly logger = new Logger(FileOperationTools.name);
  private readonly reportsDir: string;

  constructor() {
    // Reports directory at app root
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.access(this.reportsDir);
    } catch {
      await fs.mkdir(this.reportsDir, { recursive: true });
      this.logger.log(`📁 Created reports directory: ${this.reportsDir}`);
    }
  }

  @Tool({
    name: 'create-report',
    description:
      'Create a new markdown research report with title, content, and metadata. Automatically generates filename from title and adds YAML frontmatter.',
  })
  async createReport({
    title,
    content,
    metadata = {},
  }: {
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{
    filepath: string;
    filename: string;
    success: boolean;
    error?: string;
  }> {
    this.logger.log(`📝 Creating report: "${title}"`);

    try {
      await this.ensureReportsDirectory();

      // Generate filename from title (slugify)
      const filename = this.slugify(title) + '.md';
      const filepath = path.join(this.reportsDir, filename);

      // Check if file already exists
      try {
        await fs.access(filepath);
        this.logger.warn(`⚠️ Report already exists: ${filename}`);
        return {
          filepath,
          filename,
          success: false,
          error: 'Report with this title already exists',
        };
      } catch {
        // File doesn't exist, proceed
      }

      // Build YAML frontmatter
      const frontmatter = this.buildFrontmatter({
        title,
        createdAt: new Date().toISOString(),
        ...metadata,
      });

      // Combine frontmatter + content
      const fullContent = `${frontmatter}\n\n${content}`;

      // Write file
      await fs.writeFile(filepath, fullContent, 'utf-8');

      this.logger.log(`✅ Report created: ${filename}`);

      return {
        filepath,
        filename,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to create report:`, error.message);
      return {
        filepath: '',
        filename: '',
        success: false,
        error: error.message,
      };
    }
  }

  @Tool({
    name: 'save-report',
    description:
      'Save or update content to an existing report file. Can append or overwrite content.',
  })
  async saveReport({
    filepath,
    content,
    append = false,
  }: {
    filepath: string;
    content: string;
    append?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    this.logger.log(
      `💾 Saving report: ${path.basename(filepath)} (append: ${append})`
    );

    try {
      // Verify file exists
      await fs.access(filepath);

      if (append) {
        // Append to existing content
        await fs.appendFile(filepath, `\n\n${content}`, 'utf-8');
      } else {
        // Overwrite content (preserve frontmatter if exists)
        const existingContent = await fs.readFile(filepath, 'utf-8');
        const frontmatterMatch = existingContent.match(/^---\n([\s\S]*?)\n---/);

        if (frontmatterMatch) {
          // Preserve frontmatter
          const frontmatter = frontmatterMatch[0];
          await fs.writeFile(filepath, `${frontmatter}\n\n${content}`, 'utf-8');
        } else {
          // No frontmatter, just overwrite
          await fs.writeFile(filepath, content, 'utf-8');
        }
      }

      this.logger.log(`✅ Report saved: ${path.basename(filepath)}`);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`❌ Failed to save report:`, error.message);
      return { success: false, error: error.message };
    }
  }

  @Tool({
    name: 'list-reports',
    description:
      'List all saved research reports with metadata (title, created date, etc.)',
  })
  async listReports(): Promise<{
    reports: Array<{
      filename: string;
      filepath: string;
      title: string;
      createdAt: string;
      metadata: Record<string, any>;
    }>;
    totalReports: number;
  }> {
    this.logger.log('📋 Listing all reports');

    try {
      await this.ensureReportsDirectory();

      const files = await fs.readdir(this.reportsDir);
      const markdownFiles = files.filter((file) => file.endsWith('.md'));

      const reports = await Promise.all(
        markdownFiles.map(async (filename) => {
          const filepath = path.join(this.reportsDir, filename);
          const content = await fs.readFile(filepath, 'utf-8');
          const metadata = this.parseFrontmatter(content);

          return {
            filename,
            filepath,
            title: metadata.title || filename.replace('.md', ''),
            createdAt: metadata.createdAt || 'Unknown',
            metadata,
          };
        })
      );

      // Sort by creation date (newest first)
      reports.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.logger.log(`✅ Found ${reports.length} reports`);

      return {
        reports,
        totalReports: reports.length,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to list reports:`, error.message);
      return {
        reports: [],
        totalReports: 0,
      };
    }
  }

  @Tool({
    name: 'read-report',
    description: 'Read the full content and metadata of a saved report',
  })
  async readReport({ filepath }: { filepath: string }): Promise<{
    content: string;
    metadata: Record<string, any>;
    success: boolean;
    error?: string;
  }> {
    this.logger.log(`📖 Reading report: ${path.basename(filepath)}`);

    try {
      const fullContent = await fs.readFile(filepath, 'utf-8');
      const metadata = this.parseFrontmatter(fullContent);

      // Remove frontmatter from content
      const content = fullContent.replace(/^---\n[\s\S]*?\n---\n\n/, '');

      this.logger.log(`✅ Report read: ${path.basename(filepath)}`);

      return {
        content,
        metadata,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to read report:`, error.message);
      return {
        content: '',
        metadata: {},
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Convert string to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Build YAML frontmatter from metadata object
   */
  private buildFrontmatter(metadata: Record<string, any>): string {
    const lines = ['---'];

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}:`);
        value.forEach((item) => {
          lines.push(`  - ${item}`);
        });
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }

    lines.push('---');

    return lines.join('\n');
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      return {};
    }

    const frontmatterText = match[1];
    const metadata: Record<string, any> = {};

    // Simple YAML parsing (not production-grade, but sufficient for our use case)
    frontmatterText.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');

        // Try to parse as JSON for objects/arrays
        try {
          metadata[key] = JSON.parse(value);
        } catch {
          metadata[key] = value;
        }
      }
    });

    return metadata;
  }
}
