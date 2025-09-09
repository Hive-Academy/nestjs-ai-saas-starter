#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Automated Local Library Testing Script
 *
 * This script automates the process of:
 * 1. Building all libraries
 * 2. Removing old packages from node_modules/@hive-academy
 * 3. Copying fresh builds from dist/libs to node_modules/@hive-academy
 *
 * This allows for rapid local testing without publishing to a registry.
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_LIBS = path.join(PROJECT_ROOT, 'dist', 'libs');
const NODE_MODULES_HIVE = path.join(
  PROJECT_ROOT,
  'node_modules',
  '@hive-academy'
);

// List of all our internal libraries
const HIVE_LIBRARIES = [
  'nestjs-chromadb',
  'nestjs-neo4j',
  'nestjs-langgraph',
  'langgraph-checkpoint',
  'langgraph-core',
  'langgraph-functional-api',
  'langgraph-hitl',
  'langgraph-memory',
  'langgraph-monitoring',
  'langgraph-multi-agent',
  'langgraph-platform',
  'langgraph-streaming',
  'langgraph-time-travel',
  'langgraph-workflow-engine',
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      info: '📦',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      build: '🔨',
      clean: '🧹',
      copy: '📋',
    }[type] || '📦';

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function execCommand(command, options = {}) {
  log(`Executing: ${command}`, 'build');
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      ...options,
    });
    return result;
  } catch (error) {
    log(`Command failed: ${command}`, 'error');
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

function removeDirectory(dir) {
  if (fs.existsSync(dir)) {
    log(`Removing ${dir}`, 'clean');
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    log(`Source directory does not exist: ${src}`, 'warning');
    return;
  }

  log(`Copying ${src} -> ${dest}`, 'copy');

  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Copy all contents
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function verifyLibraryStructure() {
  log('Verifying library structure...', 'info');

  const missingLibs = [];

  for (const lib of HIVE_LIBRARIES) {
    const libPath = path.join(DIST_LIBS, lib);
    if (!fs.existsSync(libPath)) {
      missingLibs.push(lib);
    }
  }

  if (missingLibs.length > 0) {
    log(`Missing built libraries: ${missingLibs.join(', ')}`, 'warning');
    log('This might be expected if some libraries failed to build.', 'warning');
  } else {
    log('All expected libraries found in dist/libs', 'success');
  }

  return missingLibs;
}

function main() {
  log('Starting automated library testing update...', 'info');

  try {
    // Step 1: Build all libraries
    log('Step 1: Building all libraries', 'info');
    execCommand('npm run build:libs');
    log('Build completed successfully', 'success');

    // Step 2: Verify build output
    log('Step 2: Verifying build output', 'info');
    const missingLibs = verifyLibraryStructure();

    // Step 3: Clean old packages from node_modules
    log(
      'Step 3: Cleaning old packages from node_modules/@hive-academy',
      'info'
    );

    // Ensure @hive-academy directory exists
    if (!fs.existsSync(NODE_MODULES_HIVE)) {
      fs.mkdirSync(NODE_MODULES_HIVE, { recursive: true });
      log('Created @hive-academy directory in node_modules', 'info');
    }

    // Remove each library directory
    for (const lib of HIVE_LIBRARIES) {
      const libNodeModulesPath = path.join(NODE_MODULES_HIVE, lib);
      removeDirectory(libNodeModulesPath);
    }

    log('Cleaned all old library packages', 'success');

    // Step 4: Copy fresh builds
    log('Step 4: Copying fresh builds from dist/libs', 'info');

    let copiedCount = 0;

    for (const lib of HIVE_LIBRARIES) {
      const srcPath = path.join(DIST_LIBS, lib);
      const destPath = path.join(NODE_MODULES_HIVE, lib);

      if (fs.existsSync(srcPath)) {
        copyDirectory(srcPath, destPath);
        copiedCount++;
      } else {
        log(`Skipping ${lib} - not found in build output`, 'warning');
      }
    }

    log(`Copied ${copiedCount}/${HIVE_LIBRARIES.length} libraries`, 'success');

    // Step 5: Verification
    log('Step 5: Verifying installation', 'info');

    let verifiedCount = 0;

    for (const lib of HIVE_LIBRARIES) {
      const libPath = path.join(NODE_MODULES_HIVE, lib);
      const packageJsonPath = path.join(libPath, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          );
          log(`✓ ${lib} v${packageJson.version}`, 'success');
          verifiedCount++;
        } catch (error) {
          log(`✗ ${lib} - Invalid package.json`, 'error');
        }
      } else {
        log(`✗ ${lib} - Missing package.json`, 'error');
      }
    }

    log('\n' + '='.repeat(60), 'info');
    log(`Local Library Update Summary:`, 'info');
    log(
      `  Built Libraries: ${HIVE_LIBRARIES.length - missingLibs.length}/${
        HIVE_LIBRARIES.length
      }`,
      'info'
    );
    log(`  Copied Libraries: ${copiedCount}/${HIVE_LIBRARIES.length}`, 'info');
    log(
      `  Verified Libraries: ${verifiedCount}/${HIVE_LIBRARIES.length}`,
      'info'
    );

    if (missingLibs.length > 0) {
      log(`  Skipped (build failed): ${missingLibs.join(', ')}`, 'warning');
    }

    log('='.repeat(60), 'info');

    if (verifiedCount === HIVE_LIBRARIES.length) {
      log('All libraries updated successfully! 🎉', 'success');
      log(
        'Your dev-brand-api will now use the latest local builds.',
        'success'
      );
    } else {
      log('Some libraries may have issues. Check the logs above.', 'warning');
      log(
        'You can still test with the successfully updated libraries.',
        'info'
      );
    }
  } catch (error) {
    log(`Script failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Automated Local Library Testing Script

Usage: node scripts/update-local-libs.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be done without executing
  --quiet        Reduce log output
  --force        Force rebuild even if dist exists

Examples:
  npm run update-libs
  node scripts/update-local-libs.js
  node scripts/update-local-libs.js --dry-run

This script will:
1. Build all @hive-academy libraries
2. Remove old packages from node_modules/@hive-academy  
3. Copy fresh builds from dist/libs
4. Verify the installation

This allows rapid local testing without publishing to a registry.
`);
  process.exit(0);
}

if (process.argv.includes('--dry-run')) {
  log('DRY RUN MODE - No changes will be made', 'warning');
  // TODO: Implement dry run functionality
  process.exit(0);
}

// Run the main function
main();
