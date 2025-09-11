#!/usr/bin/env node

/**
 * CI/CD Pipeline Validation Script
 * Comprehensive validation for continuous integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// Simple color utilities (avoiding chalk ES module issues)
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
};

const chalk = colors;

// Import validation functions
const {
  validateTypeScriptCompilation,
  validateESLintCompliance,
  checkForAnyTypes,
  // validateBuild - currently unused
} = require('./validate-types.js');

// Configuration
const LIBRARIES = [
  'nestjs-chromadb',
  'nestjs-neo4j',
  'langgraph-modules/checkpoint',
  'langgraph-modules/memory',
  'langgraph-modules/time-travel',
  'langgraph-modules/multi-agent',
  'langgraph-modules/functional-api',
  'langgraph-modules/monitoring',
  'langgraph-modules/platform',
];

const QUALITY_GATES = {
  maxAnyTypes: 0, // Zero 'any' types allowed
  maxESLintErrors: 0, // Zero ESLint errors allowed
  maxTSErrors: 0, // Zero TypeScript errors allowed
  minTypeCoverage: 95, // Minimum 95% type coverage
  maxBuildTime: 300000, // Max 5 minutes build time per library
  maxBundleIncrease: 5, // Max 5% bundle size increase
};

/**
 * Execute command with timeout and detailed error handling
 */
function executeCommand(command, options = {}) {
  const timeout = options.timeout || 300000; // 5 minutes default

  try {
    const startTime = Date.now();
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout,
      ...options,
    });
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: result,
      duration,
      command,
    };
  } catch (error) {
    const duration = Date.now() - (options.startTime || Date.now());

    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
      duration,
      command,
      exitCode: error.status,
      signal: error.signal,
    };
  }
}

/**
 * Check type coverage for a library
 */
function checkTypeCoverage(library) {
  console.log(chalk.blue(`🔍 Checking type coverage for ${library}...`));

  const libPath = path.join('libs', library, 'src');
  if (!fs.existsSync(libPath)) {
    return {
      success: true,
      coverage: 100,
      warnings: [`Library ${library} src not found`],
    };
  }

  try {
    // Count total lines of TypeScript code (excluding tests)
    const totalLinesResult = executeCommand(
      `find ${libPath} -name "*.ts" ! -name "*.spec.ts" ! -name "*.test.ts" -exec wc -l {} + | tail -1 | awk '{print $1}'`
    );

    if (!totalLinesResult.success) {
      return { success: false, error: 'Failed to count total lines' };
    }

    const totalLines = parseInt(totalLinesResult.output.trim()) || 1;

    // Count lines with 'any' types
    const anyLinesResult = executeCommand(
      `grep -r "\\bany\\b" ${libPath} --include="*.ts" --exclude="*.spec.ts" --exclude="*.test.ts" | wc -l || echo 0`
    );

    const anyLines = parseInt(anyLinesResult.output.trim()) || 0;
    const coverage = Math.max(0, ((totalLines - anyLines) / totalLines) * 100);

    console.log(
      chalk.green(`✅ ${library}: Type coverage ${coverage.toFixed(1)}%`)
    );

    return {
      success: true,
      coverage: coverage,
      totalLines,
      anyLines,
      meetsThreshold: coverage >= QUALITY_GATES.minTypeCoverage,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Measure bundle size impact
 */
function measureBundleSize(library) {
  console.log(chalk.blue(`📦 Measuring bundle size for ${library}...`));

  const projectName = library.replace('/', '-');
  const distPath = path.join('dist', 'libs', library);

  // Build the library
  const buildResult = executeCommand(`npx nx build ${projectName}`);
  if (!buildResult.success) {
    return {
      success: false,
      error: 'Build failed',
      buildOutput: buildResult.output,
    };
  }

  // Measure bundle size
  if (!fs.existsSync(distPath)) {
    return { success: false, error: 'Dist directory not found' };
  }

  try {
    const sizeResult = executeCommand(`du -sb ${distPath} | cut -f1`);
    const bundleSize = parseInt(sizeResult.output.trim()) || 0;

    console.log(
      chalk.green(
        `✅ ${library}: Bundle size ${(bundleSize / 1024).toFixed(1)} KB`
      )
    );

    return {
      success: true,
      bundleSize,
      buildTime: buildResult.duration,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Run comprehensive validation for a library
 */
async function validateLibrary(library) {
  console.log(chalk.magenta(`\n📦 Comprehensive validation for: ${library}`));
  console.log(chalk.gray('-'.repeat(50)));

  const results = {
    library,
    passed: true,
    errors: [],
    warnings: [],
    metrics: {},
  };

  // 1. TypeScript Compilation
  console.log(chalk.blue('1️⃣  TypeScript Compilation Check'));
  const tsResult = validateTypeScriptCompilation(library);
  results.metrics.typescript = tsResult;
  if (!tsResult.success) {
    results.passed = false;
    results.errors.push(
      `TypeScript compilation failed: ${tsResult.errors?.join(', ')}`
    );
  }

  // 2. ESLint Validation
  console.log(chalk.blue('2️⃣  ESLint Validation'));
  const eslintResult = validateESLintCompliance(library);
  results.metrics.eslint = eslintResult;
  if (!eslintResult.success) {
    results.passed = false;
    results.errors.push(
      `ESLint validation failed: ${eslintResult.errors?.join(', ')}`
    );
  }

  // 3. Any Types Check
  console.log(chalk.blue('3️⃣  Any Types Check'));
  const anyResult = checkForAnyTypes(library);
  results.metrics.anyTypes = anyResult;
  if (!anyResult.success && anyResult.anyCount > QUALITY_GATES.maxAnyTypes) {
    results.passed = false;
    results.errors.push(
      `Found ${anyResult.anyCount} 'any' types (max allowed: ${QUALITY_GATES.maxAnyTypes})`
    );
  }

  // 4. Type Coverage Check
  console.log(chalk.blue('4️⃣  Type Coverage Check'));
  const coverageResult = checkTypeCoverage(library);
  results.metrics.typeCoverage = coverageResult;
  if (coverageResult.success && !coverageResult.meetsThreshold) {
    results.passed = false;
    results.errors.push(
      `Type coverage ${coverageResult.coverage.toFixed(1)}% below threshold ${
        QUALITY_GATES.minTypeCoverage
      }%`
    );
  }

  // 5. Build Validation
  console.log(chalk.blue('5️⃣  Build Validation'));
  const buildResult = measureBundleSize(library);
  results.metrics.build = buildResult;
  if (!buildResult.success) {
    results.passed = false;
    results.errors.push(`Build failed: ${buildResult.error}`);
  } else if (buildResult.buildTime > QUALITY_GATES.maxBuildTime) {
    results.warnings.push(
      `Build time ${buildResult.buildTime}ms exceeds threshold ${QUALITY_GATES.maxBuildTime}ms`
    );
  }

  // Add warnings
  [tsResult, eslintResult, anyResult, coverageResult, buildResult].forEach(
    (result) => {
      if (result.warnings) {
        results.warnings.push(...result.warnings);
      }
    }
  );

  return results;
}

/**
 * Generate comprehensive CI report
 */
function generateCIReport(results) {
  console.log(chalk.cyan('\n📊 CI/CD VALIDATION REPORT'));
  console.log(chalk.cyan('='.repeat(60)));

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  // Summary
  console.log(
    chalk.green(`✅ Passed: ${passed.length}/${results.length} libraries`)
  );
  console.log(
    chalk.red(`❌ Failed: ${failed.length}/${results.length} libraries`)
  );
  console.log(chalk.yellow(`⚠️  Total Warnings: ${totalWarnings}`));

  // Failed libraries details
  if (failed.length > 0) {
    console.log(chalk.red('\n❌ FAILED LIBRARIES:'));
    failed.forEach((result) => {
      console.log(chalk.red(`\n  📦 ${result.library}:`));
      result.errors.forEach((error) => {
        console.log(chalk.red(`    • ${error}`));
      });
    });
  }

  // Quality metrics summary
  console.log(chalk.cyan('\n📈 QUALITY METRICS:'));
  results.forEach((result) => {
    if (result.metrics.typeCoverage?.success) {
      const coverage = result.metrics.typeCoverage.coverage.toFixed(1);
      const color =
        coverage >= QUALITY_GATES.minTypeCoverage ? chalk.green : chalk.red;
      console.log(color(`  ${result.library}: ${coverage}% type coverage`));
    }
  });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      warnings: totalWarnings,
    },
    qualityGates: QUALITY_GATES,
    results: results,
  };

  fs.writeFileSync(
    'ci-validation-report.json',
    JSON.stringify(report, null, 2)
  );
  console.log(
    chalk.cyan('\n📄 Detailed report saved to ci-validation-report.json')
  );

  return failed.length === 0;
}

/**
 * Main CI validation function
 */
async function main() {
  console.log(chalk.cyan('🚀 CI/CD Pipeline Validation'));
  console.log(chalk.cyan('='.repeat(50)));

  const startTime = Date.now();
  const results = [];

  // Validate each library
  for (const library of LIBRARIES) {
    try {
      const result = await validateLibrary(library);
      results.push(result);
    } catch (error) {
      console.error(chalk.red(`💥 Failed to validate ${library}:`), error);
      results.push({
        library,
        passed: false,
        errors: [`Validation script error: ${error.message}`],
        warnings: [],
        metrics: {},
      });
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(
    chalk.cyan(`\n⏱️  Total validation time: ${(totalTime / 1000).toFixed(1)}s`)
  );

  // Generate report and determine exit code
  const allPassed = generateCIReport(results);

  if (allPassed) {
    console.log(chalk.green('\n🎉 All CI/CD validations passed!'));
    process.exit(0);
  } else {
    console.log(
      chalk.red('\n💥 CI/CD validation failed! Please fix the errors above.')
    );
    process.exit(1);
  }
}

// Handle CLI usage
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('💥 CI validation script failed:'), error);
    process.exit(1);
  });
}

module.exports = {
  validateLibrary,
  checkTypeCoverage,
  measureBundleSize,
  QUALITY_GATES,
};
