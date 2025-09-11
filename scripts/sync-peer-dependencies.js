#!/usr/bin/env node

/**
 * Sync Peer Dependencies Script
 *
 * This script ensures that all publishable libraries have peer dependencies
 * that match the versions in the root package.json, preventing version
 * mismatches when libraries are published and consumed.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const rootPackagePath = path.join(ROOT_DIR, 'package.json');

// Publishable libraries that need peer dependency sync
const PUBLISHABLE_LIBRARIES = ['libs/nestjs-chromadb', 'libs/nestjs-neo4j'];

// Dependencies that should be treated as peer dependencies for libraries
const PEER_DEPENDENCY_PATTERNS = [
  '@nestjs/',
  'rxjs',
  'reflect-metadata',
  'chromadb',
  'neo4j-driver',
  'langchain',
  '@langchain/',
  'openai',
  'cohere-ai',
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 8);
  const prefix = `[${timestamp}]`;

  switch (type) {
    case 'success':
      console.log(`${prefix} ✅ ${message}`);
      break;
    case 'warning':
      console.log(`${prefix} ⚠️  ${message}`);
      break;
    case 'error':
      console.log(`${prefix} ❌ ${message}`);
      break;
    case 'info':
    default:
      console.log(`${prefix} ℹ️  ${message}`);
      break;
  }
}

function loadPackageJson(packagePath) {
  try {
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    log(`Failed to load ${packagePath}: ${error.message}`, 'error');
    throw error;
  }
}

function savePackageJson(packagePath, packageData) {
  try {
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
    return true;
  } catch (error) {
    log(`Failed to save ${packagePath}: ${error.message}`, 'error');
    return false;
  }
}

function shouldBePeerDependency(depName) {
  return PEER_DEPENDENCY_PATTERNS.some((pattern) =>
    depName.startsWith(pattern)
  );
}

function syncLibraryDependencies(libPath, rootPackage) {
  const packagePath = path.join(ROOT_DIR, libPath, 'package.json');

  if (!fs.existsSync(packagePath)) {
    log(`Package.json not found for ${libPath}`, 'warning');
    return false;
  }

  const libPackage = loadPackageJson(packagePath);
  let hasChanges = false;

  // Initialize peer dependencies if not exists
  if (!libPackage.peerDependencies) {
    libPackage.peerDependencies = {};
  }

  // Sync existing peer dependencies with root versions
  for (const [depName, currentVersion] of Object.entries(
    libPackage.peerDependencies
  )) {
    if (rootPackage.dependencies[depName]) {
      const rootVersion = rootPackage.dependencies[depName];
      if (currentVersion !== rootVersion) {
        log(
          `${libPath}: Updating ${depName} from ${currentVersion} to ${rootVersion}`
        );
        libPackage.peerDependencies[depName] = rootVersion;
        hasChanges = true;
      }
    } else if (rootPackage.devDependencies[depName]) {
      const rootVersion = rootPackage.devDependencies[depName];
      if (currentVersion !== rootVersion) {
        log(
          `${libPath}: Updating ${depName} from ${currentVersion} to ${rootVersion} (from devDependencies)`
        );
        libPackage.peerDependencies[depName] = rootVersion;
        hasChanges = true;
      }
    } else {
      log(
        `${libPath}: Peer dependency ${depName} not found in root package.json`,
        'warning'
      );
    }
  }

  // Add missing peer dependencies from root dependencies
  for (const [depName, version] of Object.entries(rootPackage.dependencies)) {
    if (
      shouldBePeerDependency(depName) &&
      !libPackage.peerDependencies[depName]
    ) {
      log(`${libPath}: Adding missing peer dependency ${depName}@${version}`);
      libPackage.peerDependencies[depName] = version;
      hasChanges = true;
    }
  }

  // Ensure tslib is in regular dependencies (not peer)
  if (!libPackage.dependencies) {
    libPackage.dependencies = {};
  }

  if (!libPackage.dependencies.tslib && rootPackage.devDependencies.tslib) {
    log(`${libPath}: Adding tslib as regular dependency`);
    libPackage.dependencies.tslib = '^2.3.0'; // Use compatible version
    hasChanges = true;
  }

  // Ensure dev dependencies for testing
  if (!libPackage.devDependencies) {
    libPackage.devDependencies = {};
  }

  const testingDeps = ['@nestjs/testing'];
  for (const dep of testingDeps) {
    if (rootPackage.devDependencies[dep] && !libPackage.devDependencies[dep]) {
      log(`${libPath}: Adding ${dep} to devDependencies`);
      libPackage.devDependencies[dep] = rootPackage.devDependencies[dep];
      hasChanges = true;
    }
  }

  // Sort peer dependencies alphabetically
  const sortedPeerDeps = {};
  Object.keys(libPackage.peerDependencies)
    .sort()
    .forEach((key) => {
      sortedPeerDeps[key] = libPackage.peerDependencies[key];
    });
  libPackage.peerDependencies = sortedPeerDeps;

  if (hasChanges) {
    if (savePackageJson(packagePath, libPackage)) {
      log(`${libPath}: Successfully updated package.json`, 'success');
      return true;
    }
  } else {
    log(`${libPath}: No changes needed`);
  }

  return hasChanges;
}

function validateDependencies(rootPackage) {
  const issues = [];

  // Check for missing critical dependencies
  const criticalDeps = [
    '@nestjs/common',
    '@nestjs/core',
    'reflect-metadata',
    'rxjs',
  ];

  for (const dep of criticalDeps) {
    if (!rootPackage.dependencies[dep] && !rootPackage.devDependencies[dep]) {
      issues.push(`Missing critical dependency: ${dep}`);
    }
  }

  // Check for version conflicts in devDependencies vs dependencies
  for (const [depName, version] of Object.entries(rootPackage.dependencies)) {
    if (
      rootPackage.devDependencies[depName] &&
      rootPackage.devDependencies[depName] !== version
    ) {
      issues.push(
        `Version conflict for ${depName}: ${version} (deps) vs ${rootPackage.devDependencies[depName]} (devDeps)`
      );
    }
  }

  return issues;
}

function generateReport(results) {
  log('\n📊 Synchronization Report:', 'info');
  log('─'.repeat(50), 'info');

  const updatedLibs = results.filter((r) => r.updated);
  const totalLibs = results.length;

  log(`Total libraries processed: ${totalLibs}`);
  log(`Libraries updated: ${updatedLibs.length}`);
  log(`Libraries up-to-date: ${totalLibs - updatedLibs.length}`);

  if (updatedLibs.length > 0) {
    log('\nUpdated libraries:', 'success');
    updatedLibs.forEach((result) => {
      log(`  • ${result.library}`, 'success');
    });
  }

  log('─'.repeat(50), 'info');
}

async function main() {
  log('🚀 Starting peer dependency synchronization...', 'info');

  try {
    // Load root package.json
    const rootPackage = loadPackageJson(rootPackagePath);
    log(
      `Loaded root package.json (${
        Object.keys(rootPackage.dependencies || {}).length
      } dependencies)`
    );

    // Validate root dependencies
    const validationIssues = validateDependencies(rootPackage);
    if (validationIssues.length > 0) {
      log('Validation issues found:', 'warning');
      validationIssues.forEach((issue) => log(`  • ${issue}`, 'warning'));
    }

    // Process each publishable library
    const results = [];
    for (const libPath of PUBLISHABLE_LIBRARIES) {
      log(`\nProcessing ${libPath}...`);
      const updated = syncLibraryDependencies(libPath, rootPackage);
      results.push({ library: libPath, updated });
    }

    // Generate report
    generateReport(results);

    // Final recommendations
    log('\n🔍 Next steps:', 'info');
    log('1. Run `npm run build:libs` to verify builds work');
    log(
      '2. Run `npx nx run-many -t lint --fix` to apply @nx/dependency-checks'
    );
    log('3. Run `npm run publish:dry-run` to test publishing');
    log('4. Consider running `npm audit` to check for security issues');

    log('\n✅ Peer dependency synchronization completed!', 'success');
  } catch (error) {
    log(`Synchronization failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  syncLibraryDependencies,
  validateDependencies,
  shouldBePeerDependency,
};
