#!/usr/bin/env node

/**
 * ESLint Fix Script
 * Applies ESLint auto-fixes to all TypeScript files in the project
 * Uses ESLint directly instead of going through Nx
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Find all directories containing eslint.config.mjs files
 */
function findEslintConfigs(dir, configs = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const fullPath = join(dir, file);
    
    // Skip node_modules and dist directories
    if (file === 'node_modules' || file === 'dist' || file === '.git') {
      continue;
    }
    
    if (file === 'eslint.config.mjs') {
      configs.push(dirname(fullPath));
    } else if (statSync(fullPath).isDirectory()) {
      findEslintConfigs(fullPath, configs);
    }
  }
  
  return configs;
}

/**
 * Run ESLint fix on a directory
 */
function runEslintFix(dir, options = {}) {
  const relativePath = dir.replace(rootDir, '').replace(/^[\\\/]/, '') || '.';
  
  try {
    console.log(`${colors.blue}🔧 Fixing:${colors.reset} ${relativePath}`);
    
    // Change to the directory and run ESLint
    const command = options.dryRun 
      ? `cd "${dir}" && npx eslint . --ext .ts,.tsx --fix-dry-run`
      : `cd "${dir}" && npx eslint . --ext .ts,.tsx --fix`;
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    // Count fixed issues if any output
    if (output) {
      const lines = output.split('\n');
      const errorCount = (output.match(/error/g) || []).length;
      const warningCount = (output.match(/warning/g) || []).length;
      
      if (errorCount > 0 || warningCount > 0) {
        console.log(`${colors.yellow}  ⚠️  ${errorCount} errors, ${warningCount} warnings remain${colors.reset}`);
      }
    } else {
      console.log(`${colors.green}  ✅ All fixable issues resolved${colors.reset}`);
    }
    
    return { success: true, path: relativePath };
  } catch (error) {
    // ESLint exits with non-zero code if there are unfixable errors
    // This is expected, so we just report the remaining issues
    const errorOutput = error.stdout || error.toString();
    const errorCount = (errorOutput.match(/error/g) || []).length;
    const warningCount = (errorOutput.match(/warning/g) || []).length;
    
    if (errorCount > 0 || warningCount > 0) {
      console.log(`${colors.yellow}  ⚠️  ${errorCount} errors, ${warningCount} warnings (some fixed)${colors.reset}`);
    } else {
      console.log(`${colors.red}  ❌ Error running ESLint${colors.reset}`);
    }
    
    return { success: false, path: relativePath, error: errorCount };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const specificPath = args.find(arg => !arg.startsWith('--'));
  
  console.log(`${colors.bright}${colors.cyan}🚀 ESLint Auto-Fix Tool${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
  
  if (isDryRun) {
    console.log(`${colors.yellow}📋 DRY RUN MODE - No changes will be made${colors.reset}\n`);
  }
  
  let dirsToFix = [];
  
  if (specificPath) {
    // Fix specific path
    const targetPath = join(rootDir, specificPath);
    if (existsSync(targetPath)) {
      dirsToFix = [targetPath];
      console.log(`${colors.blue}Targeting specific path:${colors.reset} ${specificPath}\n`);
    } else {
      console.error(`${colors.red}❌ Path not found:${colors.reset} ${specificPath}`);
      process.exit(1);
    }
  } else {
    // Find all directories with ESLint configs
    console.log(`${colors.blue}🔍 Scanning for ESLint configurations...${colors.reset}`);
    dirsToFix = findEslintConfigs(rootDir);
    console.log(`${colors.green}✅ Found ${dirsToFix.length} projects${colors.reset}\n`);
  }
  
  // Sort directories to process root first, then libs, then apps
  dirsToFix.sort((a, b) => {
    const aDepth = a.split(/[\\\/]/).length;
    const bDepth = b.split(/[\\\/]/).length;
    return aDepth - bDepth;
  });
  
  // Run ESLint fix on each directory
  const results = [];
  for (const dir of dirsToFix) {
    const result = runEslintFix(dir, { dryRun: isDryRun });
    results.push(result);
    console.log(''); // Empty line between projects
  }
  
  // Summary
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}📊 Summary${colors.reset}\n`);
  
  const successful = results.filter(r => r.success).length;
  const withErrors = results.filter(r => !r.success).length;
  
  console.log(`${colors.green}✅ Successfully processed:${colors.reset} ${successful} projects`);
  if (withErrors > 0) {
    console.log(`${colors.yellow}⚠️  Projects with remaining issues:${colors.reset} ${withErrors}`);
  }
  
  // Provide next steps
  console.log(`\n${colors.bright}${colors.blue}📝 Next Steps:${colors.reset}`);
  if (isDryRun) {
    console.log('1. Review the output above');
    console.log('2. Run without --dry-run to apply fixes:');
    console.log(`   ${colors.cyan}node tools/scripts/eslint-fix-all.mjs${colors.reset}`);
  } else {
    console.log('1. Review changes with: git diff');
    console.log('2. Run type checking: nx run-many --target=build --all');
    console.log('3. Manually fix remaining type errors');
    console.log('4. Commit the changes');
  }
  
  // List auto-fixable rules
  console.log(`\n${colors.bright}${colors.green}✨ Auto-Fixed Rules:${colors.reset}`);
  console.log('  • prefer-nullish-coalescing (|| → ??)');
  console.log('  • prefer-optional-chain (a && a.b → a?.b)');
  console.log('  • promise-function-async (adds async keyword)');
  console.log('  • consistent-type-imports (adds type to imports)');
  console.log('  • no-unnecessary-type-assertion (removes redundant assertions)');
  console.log('  • prefer-string-starts-ends-with');
  console.log('  • no-useless-empty-export');
  
  console.log(`\n${colors.bright}${colors.yellow}🔧 Manual Fix Required:${colors.reset}`);
  console.log('  • no-explicit-any (needs proper types)');
  console.log('  • strict-boolean-expressions (needs explicit checks)');
  console.log('  • no-unsafe-* operations (needs typing)');
  console.log('  • explicit-function-return-type (needs annotations)');
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});