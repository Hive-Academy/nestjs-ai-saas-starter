#!/usr/bin/env node

/**
 * Spec Resume Analyzer
 * Analyzes existing Kiro specs and provides context for resuming work
 */
import * as chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
// Try to load chalk, but provide fallback if not installed

class SpecResumeAnalyzer {
  constructor() {
    this.specsDir = path.join(process.cwd(), '.kiro', 'specs');
    this.colors = {
      complete: chalk.default.green,
      inProgress: chalk.default.yellow,
      blocked: chalk.default.red,
      pending: chalk.default.gray,
      info: chalk.default.cyan,
      warning: chalk.default.magenta,
    };
  }

  /**
   * Main entry point
   */
  async analyze(specName, options = {}) {
    try {
      console.log(
        chalk.default.bold.cyan(`\n📊 Analyzing Spec: ${specName}\n`)
      );

      const specPath = path.join(this.specsDir, specName);

      // Check if spec exists
      if (!(await this.fileExists(specPath))) {
        console.error(chalk.default.red(`❌ Spec not found: ${specName}`));
        this.listAvailableSpecs();
        return;
      }

      // Perform analysis
      const analysis = await this.performAnalysis(specPath, specName);

      // Display results
      if (options.detailed) {
        this.displayDetailedAnalysis(analysis);
      } else {
        this.displaySummary(analysis);
      }

      // Generate continuation plan if requested
      if (options.plan) {
        this.generateContinuationPlan(analysis);
      }

      // Export to file if requested
      if (options.export) {
        await this.exportAnalysis(analysis, options.export);
      }
    } catch (error) {
      console.error(chalk.default.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Perform comprehensive spec analysis
   */
  async performAnalysis(specPath, specName) {
    const analysis = {
      specName,
      specPath,
      files: {},
      tasks: {},
      git: {},
      code: {},
      metrics: {},
      recommendations: [],
    };

    // Analyze spec files
    analysis.files = await this.analyzeSpecFiles(specPath);

    // Parse tasks
    analysis.tasks = await this.parseTaskStatus(specPath);

    // Analyze git status
    analysis.git = await this.analyzeGitStatus(specName);

    // Analyze code implementation
    analysis.code = await this.analyzeCodeImplementation(specName);

    // Calculate metrics
    analysis.metrics = this.calculateMetrics(analysis);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analyze spec files
   */
  async analyzeSpecFiles(specPath) {
    const files = {};
    const fileNames = ['requirements.md', 'design.md', 'tasks.md'];

    for (const fileName of fileNames) {
      const filePath = path.join(specPath, fileName);
      if (await this.fileExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);

        files[fileName] = {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime,
          lineCount: content.split('\n').length,
          completion: this.calculateFileCompletion(content, fileName),
        };
      } else {
        files[fileName] = { exists: false };
      }
    }

    return files;
  }

  /**
   * Parse task status from tasks.md
   */
  async parseTaskStatus(specPath) {
    const tasksFile = path.join(specPath, 'tasks.md');
    const tasks = {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      pending: 0,
      items: [],
    };

    if (!(await this.fileExists(tasksFile))) {
      return tasks;
    }

    const content = await fs.readFile(tasksFile, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.match(/^- \[[ x]\]/)) {
        tasks.total++;

        const isCompleted = line.includes('[x]');
        const taskInfo = {
          description: line.replace(/^- \[[ x]\]/, '').trim(),
          completed: isCompleted,
          status: 'pending',
        };

        // Detect status from content
        if (isCompleted) {
          tasks.completed++;
          taskInfo.status = 'completed';
        } else if (
          line.toLowerCase().includes('in-progress') ||
          line.includes('🔄')
        ) {
          tasks.inProgress++;
          taskInfo.status = 'in-progress';
        } else if (
          line.toLowerCase().includes('blocked') ||
          line.includes('🚫')
        ) {
          tasks.blocked++;
          taskInfo.status = 'blocked';
        } else {
          tasks.pending++;
          taskInfo.status = 'pending';
        }

        // Extract task ID if present
        const taskIdMatch = line.match(/TASK-(\d+)/);
        if (taskIdMatch) {
          taskInfo.id = taskIdMatch[0];
        }

        tasks.items.push(taskInfo);
      }
    }

    return tasks;
  }

  /**
   * Analyze git status for the spec
   */
  async analyzeGitStatus(specName) {
    const git = {
      currentBranch: '',
      branches: [],
      uncommittedChanges: [],
      recentCommits: [],
      openPRs: [],
    };

    try {
      // Get current branch
      git.currentBranch = execSync('git branch --show-current', {
        encoding: 'utf-8',
      }).trim();

      // Find related branches
      const allBranches = execSync('git branch -r', {
        encoding: 'utf-8',
      }).split('\n');
      git.branches = allBranches.filter(
        (b) => b.includes(`spec-${specName}`) || b.includes(specName)
      );

      // Check for uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      if (status) {
        git.uncommittedChanges = status.split('\n').filter((l) => l);
      }

      // Get recent commits related to spec
      try {
        const commits = execSync(`git log --oneline -10 --grep="${specName}"`, {
          encoding: 'utf-8',
        });
        git.recentCommits = commits.split('\n').filter((l) => l);
      } catch (e) {
        // No matching commits
      }
    } catch (error) {
      console.warn(
        chalk.default.yellow('⚠️  Git analysis failed (not a git repository?)')
      );
    }

    return git;
  }

  /**
   * Analyze code implementation
   */
  async analyzeCodeImplementation(specName) {
    const code = {
      libsFound: [],
      testsFound: [],
      coverage: null,
      buildStatus: 'unknown',
    };

    // Find related libraries
    try {
      const libsDir = path.join(process.cwd(), 'libs');
      const libs = await fs.readdir(libsDir);

      for (const lib of libs) {
        // Check if lib name relates to spec
        if (
          lib.toLowerCase().includes(specName.toLowerCase().replace(/-/g, ''))
        ) {
          code.libsFound.push(lib);
        }
      }
    } catch (e) {
      // Libs directory might not exist
    }

    // Check test coverage if available
    try {
      const coverageFile = path.join(
        process.cwd(),
        'coverage',
        'coverage-summary.json'
      );
      if (await this.fileExists(coverageFile)) {
        const coverage = JSON.parse(await fs.readFile(coverageFile, 'utf-8'));
        code.coverage = coverage.total;
      }
    } catch (e) {
      // Coverage might not be available
    }

    return code;
  }

  /**
   * Calculate metrics
   */
  calculateMetrics(analysis) {
    const { tasks } = analysis;

    const metrics = {
      overallCompletion: 0,
      requirementsCompletion:
        analysis.files['requirements.md']?.completion || 0,
      designCompletion: analysis.files['design.md']?.completion || 0,
      implementationCompletion: 0,
      momentum: 'unknown',
      estimatedTimeRemaining: 'unknown',
    };

    // Calculate implementation completion
    if (tasks.total > 0) {
      metrics.implementationCompletion = Math.round(
        (tasks.completed / tasks.total) * 100
      );
    }

    // Calculate overall completion (weighted average)
    metrics.overallCompletion = Math.round(
      metrics.requirementsCompletion * 0.2 +
        metrics.designCompletion * 0.3 +
        metrics.implementationCompletion * 0.5
    );

    // Determine momentum
    if (analysis.git.recentCommits.length > 5) {
      metrics.momentum = 'high';
    } else if (analysis.git.recentCommits.length > 0) {
      metrics.momentum = 'moderate';
    } else {
      metrics.momentum = 'stalled';
    }

    // Estimate time remaining (rough estimate)
    const remainingTasks = tasks.pending + tasks.inProgress;
    if (remainingTasks > 0) {
      const hoursPerTask = 3; // Rough estimate
      metrics.estimatedTimeRemaining = `${remainingTasks * hoursPerTask} hours`;
    }

    return metrics;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for stalled work
    if (analysis.metrics.momentum === 'stalled') {
      recommendations.push({
        type: 'warning',
        message:
          'Spec appears stalled. Consider reviewing blockers or reassigning tasks.',
      });
    }

    // Check for uncommitted changes
    if (analysis.git.uncommittedChanges.length > 0) {
      recommendations.push({
        type: 'info',
        message: `Found ${analysis.git.uncommittedChanges.length} uncommitted changes. Commit or stash before continuing.`,
      });
    }

    // Check for blocked tasks
    if (analysis.tasks.blocked > 0) {
      recommendations.push({
        type: 'warning',
        message: `${analysis.tasks.blocked} tasks are blocked. Address blockers to improve velocity.`,
      });
    }

    // Check for missing files
    if (!analysis.files['design.md']?.exists) {
      recommendations.push({
        type: 'critical',
        message:
          'Missing design.md. Create design document before implementation.',
      });
    }

    // Check test coverage
    if (analysis.code.coverage && analysis.code.coverage.lines?.pct < 80) {
      recommendations.push({
        type: 'info',
        message: `Test coverage at ${analysis.code.coverage.lines.pct}%. Target is 80%.`,
      });
    }

    return recommendations;
  }

  /**
   * Display summary analysis
   */
  displaySummary(analysis) {
    const { metrics, tasks, git } = analysis;

    console.log(chalk.default.bold('📈 Completion Status:'));
    this.displayProgressBar('Requirements', metrics.requirementsCompletion);
    this.displayProgressBar('Design', metrics.designCompletion);
    this.displayProgressBar('Implementation', metrics.implementationCompletion);
    this.displayProgressBar('Overall', metrics.overallCompletion);

    console.log(chalk.default.bold('\n📋 Task Summary:'));
    console.log(`  Total Tasks: ${tasks.total}`);
    console.log(`  ${this.colors.complete('✓')} Completed: ${tasks.completed}`);
    console.log(
      `  ${this.colors.inProgress('⚡')} In Progress: ${tasks.inProgress}`
    );
    console.log(`  ${this.colors.blocked('🚫')} Blocked: ${tasks.blocked}`);
    console.log(`  ${this.colors.pending('○')} Pending: ${tasks.pending}`);

    console.log(chalk.default.bold('\n🔧 Git Status:'));
    console.log(`  Current Branch: ${git.currentBranch}`);
    console.log(`  Uncommitted Changes: ${git.uncommittedChanges.length}`);
    console.log(`  Recent Commits: ${git.recentCommits.length}`);

    console.log(chalk.default.bold('\n💡 Recommendations:'));
    for (const rec of analysis.recommendations) {
      const icon =
        rec.type === 'critical' ? '❗' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} ${rec.message}`);
    }
  }

  /**
   * Display detailed analysis
   */
  displayDetailedAnalysis(analysis) {
    console.log(chalk.default.bold.underline('DETAILED SPEC ANALYSIS'));
    console.log('═'.repeat(50));

    // Files section
    console.log(chalk.default.bold('\n📁 SPEC FILES:'));
    for (const [fileName, info] of Object.entries(analysis.files)) {
      if (info.exists) {
        const age = this.getAge(info.lastModified);
        console.log(`  ${fileName}:`);
        console.log(`    Completion: ${info.completion}%`);
        console.log(`    Last Modified: ${age}`);
        console.log(`    Size: ${info.size} bytes`);
      } else {
        console.log(`  ${fileName}: ${chalk.default.red('NOT FOUND')}`);
      }
    }

    // Display full summary
    this.displaySummary(analysis);

    // Additional details
    if (analysis.code.libsFound.length > 0) {
      console.log(chalk.default.bold('\n📦 Related Libraries:'));
      for (const lib of analysis.code.libsFound) {
        console.log(`  - libs/${lib}/`);
      }
    }

    if (analysis.tasks.items.length > 0) {
      console.log(chalk.default.bold('\n📋 Recent Tasks:'));
      const recentTasks = analysis.tasks.items.slice(0, 5);
      for (const task of recentTasks) {
        const statusIcon = this.getStatusIcon(task.status);
        console.log(
          `  ${statusIcon} ${
            task.id || 'TASK-XXX'
          }: ${task.description.substring(0, 50)}...`
        );
      }
    }
  }

  /**
   * Generate continuation plan
   */
  generateContinuationPlan(analysis) {
    console.log(chalk.default.bold.green('\n📋 CONTINUATION PLAN'));
    console.log('═'.repeat(50));

    console.log(chalk.default.bold('\n🎯 Immediate Actions (1-2 hours):'));

    if (analysis.tasks.inProgress > 0) {
      console.log('  1. Complete in-progress tasks');
      const inProgressTasks = analysis.tasks.items.filter(
        (t) => t.status === 'in-progress'
      );
      for (const task of inProgressTasks.slice(0, 3)) {
        console.log(`     - ${task.description.substring(0, 60)}`);
      }
    }

    if (analysis.git.uncommittedChanges.length > 0) {
      console.log('  2. Commit or stash uncommitted changes');
    }

    if (analysis.tasks.blocked > 0) {
      console.log('  3. Address blocked tasks');
    }

    console.log(chalk.default.bold('\n📅 Short-term Goals (Today):'));
    console.log('  - Complete pending high-priority tasks');
    console.log('  - Achieve 80% test coverage');
    console.log('  - Update documentation');

    console.log(chalk.default.bold('\n📆 Long-term Goals (This Week):'));
    console.log('  - Complete all implementation tasks');
    console.log('  - Perform integration testing');
    console.log('  - Deploy to staging');

    console.log(chalk.default.bold('\n▶️  To Resume:'));
    console.log(
      chalk.default.cyan(`  npm run spec:resume ${analysis.specName}`)
    );
  }

  // Utility methods

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  calculateFileCompletion(content, fileName) {
    if (fileName === 'tasks.md') {
      const completed = (content.match(/\[x\]/g) || []).length;
      const total = (content.match(/\[[ x]\]/g) || []).length;
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    // For other files, check for TODO markers
    const todos = (content.match(/TODO|TBD|FIXME/gi) || []).length;
    const sections = (content.match(/^#{1,3} /gm) || []).length;

    if (sections === 0) return 0;
    const incompleteSections = Math.min(todos, sections);
    return Math.round(((sections - incompleteSections) / sections) * 100);
  }

  displayProgressBar(label, percentage) {
    const width = 30;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const color =
      percentage >= 80
        ? chalk.default.green
        : percentage >= 50
        ? chalk.default.yellow
        : chalk.default.red;

    const bar =
      color('█'.repeat(filled)) + chalk.default.gray('░'.repeat(empty));
    console.log(`  ${label.padEnd(15)} ${bar} ${percentage}%`);
  }

  getAge(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'recently';
  }

  getStatusIcon(status) {
    switch (status) {
      case 'completed':
        return this.colors.complete('✓');
      case 'in-progress':
        return this.colors.inProgress('⚡');
      case 'blocked':
        return this.colors.blocked('🚫');
      default:
        return this.colors.pending('○');
    }
  }

  async listAvailableSpecs() {
    console.log(chalk.default.bold('\n📁 Available specs:'));
    try {
      const specs = await fs.readdir(this.specsDir);
      for (const spec of specs) {
        const stat = await fs.stat(path.join(this.specsDir, spec));
        if (stat.isDirectory()) {
          console.log(`  - ${spec}`);
        }
      }
    } catch (e) {
      console.log('  No specs found');
    }
  }

  async exportAnalysis(analysis, outputFile) {
    const output = JSON.stringify(analysis, null, 2);
    await fs.writeFile(outputFile, output);
    console.log(chalk.default.green(`\n✅ Analysis exported to ${outputFile}`));
  }
}

// CLI Interface

const analyzer = new SpecResumeAnalyzer();

const args = process.argv.slice(2);

// Parse command from npm script name
const npmLifecycle = process.env.npm_lifecycle_event;
let defaultOptions = {};

if (npmLifecycle) {
  switch (npmLifecycle) {
    case 'spec:status':
      defaultOptions = { detailed: false, plan: false };
      break;
    case 'spec:analyze':
      defaultOptions = { detailed: true, plan: false };
      break;
    case 'spec:resume':
      defaultOptions = { detailed: true, plan: true };
      break;
    case 'spec:export':
      defaultOptions = {
        detailed: true,
        plan: false,
        export: 'spec-analysis.json',
      };
      break;
    case 'task:list':
      defaultOptions = { detailed: false, plan: true };
      break;
    case 'task:dashboard':
      defaultOptions = { detailed: true, plan: true };
      break;
  }
}

// Get spec name from args
const specName = args.find((arg) => !arg.startsWith('--'));

// Parse additional options
const options = {
  detailed: args.includes('--detailed') || defaultOptions.detailed,
  plan: args.includes('--plan') || defaultOptions.plan,
  export: args.includes('--export')
    ? args[args.indexOf('--export') + 1]
    : defaultOptions.export,
};

if (!specName || specName === '--help' || specName === '-h') {
  console.log(chalk.default.bold.cyan('\n📋 Kiro Spec Resume Analyzer\n'));
  console.log(chalk.default.bold('Usage:'));
  console.log(
    '  Direct:     node scripts/spec-resume.js <spec-name> [options]'
  );
  console.log('  NPM:        npm run spec:analyze <spec-name>');
  console.log('              npm run spec:resume <spec-name>');
  console.log('              npm run task:dashboard <spec-name>');
  console.log('\nOptions:');
  console.log('  --detailed       Show detailed analysis');
  console.log('  --plan          Generate continuation plan');
  console.log('  --export <file> Export analysis to JSON file');
  console.log('\nNPM Commands:');
  console.log('  npm run spec:status <spec>     Quick status overview');
  console.log('  npm run spec:analyze <spec>    Detailed analysis');
  console.log('  npm run spec:resume <spec>     Analysis + continuation plan');
  console.log('  npm run spec:export <spec>     Export to spec-analysis.json');
  console.log('  npm run task:list <spec>       List tasks with plan');
  console.log('  npm run task:dashboard <spec>  Full dashboard view');
  console.log('\nExample:');
  console.log('  npm run spec:analyze ai-saas-starter-ecosystem');
  console.log(
    '  npm run spec:resume -- ai-saas-starter-ecosystem --export report.json'
  );
  console.log('');
  analyzer.listAvailableSpecs();
  process.exit(0);
}

analyzer.analyze(specName, options);

export default SpecResumeAnalyzer;
