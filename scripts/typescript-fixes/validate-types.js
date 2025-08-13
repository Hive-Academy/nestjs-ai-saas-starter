#!/usr/bin/env node

/**
 * TypeScript Validation Script
 * Validates type safety across all libraries in the monorepo
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
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Use colors instead of chalk
const chalk = colors;

// Configuration
const LIBRARIES = [
  'nestjs-chromadb',
  'nestjs-neo4j',
  'nestjs-langgraph',
  'langgraph-modules/checkpoint',
  'langgraph-modules/memory',
  'langgraph-modules/time-travel',
  'langgraph-modules/multi-agent',
  'langgraph-modules/functional-api',
  'langgraph-modules/monitoring',
  'langgraph-modules/platform'
];

const VALIDATION_RESULTS = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Execute command and return result
 */
function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message
    };
  }
}

/**
 * Validate TypeScript compilation for a library
 */
function validateTypeScriptCompilation(library) {
  console.log(chalk.blue(`🔍 Validating TypeScript compilation for ${library}...`));

  const libPath = path.join('libs', library);
  if (!fs.existsSync(libPath)) {
    console.log(chalk.yellow(`⚠️  Library ${library} not found, skipping...`));
    return { success: true, warnings: [`Library ${library} not found`] };
  }

  // Check if tsconfig.lib.json exists
  const tsconfigPath = path.join(libPath, 'tsconfig.lib.json');
  if (!fs.existsSync(tsconfigPath)) {
    console.log(chalk.yellow(`⚠️  No tsconfig.lib.json found for ${library}, skipping...`));
    return { success: true, warnings: [`No tsconfig.lib.json found for ${library}`] };
  }

  // Run TypeScript compilation check
  const result = executeCommand(`npx tsc --noEmit --project ${tsconfigPath}`);

  if (result.success) {
    console.log(chalk.green(`✅ ${library}: TypeScript compilation passed`));
    return { success: true, errors: [] };
  } else {
    console.log(chalk.red(`❌ ${library}: TypeScript compilation failed`));
    console.log(chalk.red(result.output));
    return { success: false, errors: [result.output] };
  }
}

/**
 * Validate ESLint compliance for a library
 */
function validateESLintCompliance(library) {
  console.log(chalk.blue(`🔍 Validating ESLint compliance for ${library}...`));

  const libPath = path.join('libs', library);
  if (!fs.existsSync(libPath)) {
    return { success: true, warnings: [`Library ${library} not found`] };
  }

  // Run ESLint check
  const result = executeCommand(`npx nx lint ${library.replace('/', '-')}`);

  if (result.success) {
    console.log(chalk.green(`✅ ${library}: ESLint validation passed`));
    return { success: true, errors: [] };
  } else {
    console.log(chalk.red(`❌ ${library}: ESLint validation failed`));
    console.log(chalk.red(result.output));
    return { success: false, errors: [result.output] };
  }
}

/**
 * Check for 'any' types in a library
 */
function checkForAnyTypes(library) {
  console.log(chalk.blue(`🔍 Checking for 'any' types in ${library}...`));

  const libPath = path.join('libs', library, 'src');
  if (!fs.existsSync(libPath)) {
    return { success: true, warnings: [`Library ${library} src not found`] };
  }

  // Search for 'any' types in TypeScript files
  const result = executeCommand(`grep -r "\\bany\\b" ${libPath} --include="*.ts" --exclude="*.spec.ts" --exclude="*.test.ts" || true`);

  if (result.output.trim() === '') {
    console.log(chalk.green(`✅ ${library}: No 'any' types found`));
    return { success: true, anyCount: 0 };
  } else {
    const anyCount = result.output.split('\n').filter(line => line.trim()).length;
    console.log(chalk.yellow(`⚠️  ${library}: Found ${anyCount} instances of 'any' types`));
    return { success: false, anyCount, details: result.output };
  }
}

/**
 * Validate build process for a library
 */
function validateBuild(library) {
  console.log(chalk.blue(`🔍 Validating build for ${library}...`));

  const projectName = library.replace('/', '-');
  const result = executeCommand(`npx nx build ${projectName}`);

  if (result.success) {
    console.log(chalk.green(`✅ ${library}: Build successful`));
    return { success: true };
  } else {
    console.log(chalk.red(`❌ ${library}: Build failed`));
    console.log(chalk.red(result.output));
    return { success: false, errors: [result.output] };
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log(chalk.cyan('\n📊 VALIDATION REPORT'));
  console.log(chalk.cyan('='.repeat(50)));

  console.log(chalk.green(`✅ Passed: ${VALIDATION_RESULTS.passed.length}`));
  VALIDATION_RESULTS.passed.forEach(lib => {
    console.log(chalk.green(`   - ${lib}`));
  });

  console.log(chalk.red(`❌ Failed: ${VALIDATION_RESULTS.failed.length}`));
  VALIDATION_RESULTS.failed.forEach(lib => {
    console.log(chalk.red(`   - ${lib}`));
  });

  console.log(chalk.yellow(`⚠️  Warnings: ${VALIDATION_RESULTS.warnings.length}`));
  VALIDATION_RESULTS.warnings.forEach(warning => {
    console.log(chalk.yellow(`   - ${warning}`));
  });

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: VALIDATION_RESULTS.passed.length,
      failed: VALIDATION_RESULTS.failed.length,
      warnings: VALIDATION_RESULTS.warnings.length
    },
    details: VALIDATION_RESULTS
  };

  fs.writeFileSync('typescript-validation-report.json', JSON.stringify(report, null, 2));
  console.log(chalk.cyan('\n📄 Report saved to typescript-validation-report.json'));
}

/**
 * Main validation function
 */
async function main() {
  console.log(chalk.cyan('🚀 Starting TypeScript Validation Suite'));
  console.log(chalk.cyan('='.repeat(50)));

  const validationTypes = process.argv.slice(2);
  const runAll = validationTypes.length === 0 || validationTypes.includes('all');

  for (const library of LIBRARIES) {
    console.log(chalk.magenta(`\n📦 Processing library: ${library}`));

    let libraryPassed = true;
    const libraryErrors = [];
    const libraryWarnings = [];

    // TypeScript Compilation Check
    if (runAll || validationTypes.includes('typescript')) {
      const tsResult = validateTypeScriptCompilation(library);
      if (!tsResult.success) {
        libraryPassed = false;
        libraryErrors.push(...(tsResult.errors || []));
      }
      if (tsResult.warnings) {
        libraryWarnings.push(...tsResult.warnings);
      }
    }

    // ESLint Check
    if (runAll || validationTypes.includes('eslint')) {
      const eslintResult = validateESLintCompliance(library);
      if (!eslintResult.success) {
        libraryPassed = false;
        libraryErrors.push(...(eslintResult.errors || []));
      }
      if (eslintResult.warnings) {
        libraryWarnings.push(...eslintResult.warnings);
      }
    }

    // Any Types Check
    if (runAll || validationTypes.includes('any-types')) {
      const anyResult = checkForAnyTypes(library);
      if (!anyResult.success && anyResult.anyCount > 0) {
        libraryWarnings.push(`${library}: Found ${anyResult.anyCount} 'any' types`);
      }
    }

    // Build Check
    if (runAll || validationTypes.includes('build')) {
      const buildResult = validateBuild(library);
      if (!buildResult.success) {
        libraryPassed = false;
        libraryErrors.push(...(buildResult.errors || []));
      }
    }

    // Record results
    if (libraryPassed && libraryErrors.length === 0) {
      VALIDATION_RESULTS.passed.push(library);
    } else {
      VALIDATION_RESULTS.failed.push({
        library,
        errors: libraryErrors
      });
    }

    VALIDATION_RESULTS.warnings.push(...libraryWarnings);
  }

  generateReport();

  // Exit with appropriate code
  const hasFailures = VALIDATION_RESULTS.failed.length > 0;
  if (hasFailures) {
    console.log(chalk.red('\n💥 Validation failed! Please fix the errors above.'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n🎉 All validations passed!'));
    process.exit(0);
  }
}

// Handle CLI usage
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('💥 Validation script failed:'), error);
    process.exit(1);
  });
}

module.exports = {
  validateTypeScriptCompilation,
  validateESLintCompliance,
  checkForAnyTypes,
  validateBuild
};
