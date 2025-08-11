#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates package.json files for libraries
 */
function validatePackageJson(filePath) {
  console.log(`Validating ${filePath}...`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);

    // Skip validation for private/internal packages
    if (pkg.private === true || pkg.name?.startsWith('@internal/')) {
      console.log(`⏭️  Skipping validation for internal package: ${pkg.name}`);
      return;
    }

    const errors = [];
    const warnings = [];

    // Required fields
    const requiredFields = [
      'name',
      'version',
      'description',
      'author',
      'license',
    ];
    requiredFields.forEach((field) => {
      if (!pkg[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Name should start with @anubis/
    if (pkg.name && !pkg.name.startsWith('@anubis/')) {
      errors.push(`Package name should start with @anubis/, got: ${pkg.name}`);
    }

    // Version should follow semver
    if (pkg.version && !/^\d+\.\d+\.\d+(-\w+\.\d+)?$/.test(pkg.version)) {
      warnings.push(`Version should follow semver format: ${pkg.version}`);
    }

    // Should have proper exports
    if (!pkg.exports || !pkg.exports['.']) {
      warnings.push('Missing proper exports configuration');
    }

    // Should have main, module, and types
    const entryFields = ['main', 'module', 'types'];
    entryFields.forEach((field) => {
      if (!pkg[field]) {
        warnings.push(`Missing ${field} field`);
      }
    });

    // Should have publishConfig
    if (!pkg.publishConfig || pkg.publishConfig.access !== 'public') {
      warnings.push('Missing or incorrect publishConfig.access');
    }

    // Should have repository info
    if (!pkg.repository || !pkg.repository.url) {
      warnings.push('Missing repository information');
    }

    // Should have keywords
    if (!pkg.keywords || pkg.keywords.length === 0) {
      warnings.push('Missing keywords for better discoverability');
    }

    // Should have files array
    if (!pkg.files || !Array.isArray(pkg.files)) {
      warnings.push('Missing files array to control published content');
    }

    // Check for common issues
    // (private packages are handled earlier by skipping validation)

    // Report results
    if (errors.length > 0) {
      console.error(`❌ Validation failed for ${filePath}:`);
      errors.forEach((error) => console.error(`  - ${error}`));
      process.exit(1);
    }

    if (warnings.length > 0) {
      console.warn(`⚠️  Warnings for ${filePath}:`);
      warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }

    console.log(`✅ ${filePath} is valid`);
  } catch (error) {
    console.error(`❌ Failed to validate ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

// Get files from command line arguments or find all package.json files in libs
const args = process.argv.slice(2);
let filesToValidate = [];

if (args.length > 0) {
  filesToValidate = args;
} else {
  // Find all package.json files in libs directory
  const libsDir = path.join(process.cwd(), 'libs');
  if (fs.existsSync(libsDir)) {
    const libs = fs
      .readdirSync(libsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    filesToValidate = libs
      .map((lib) => path.join('libs', lib, 'package.json'))
      .filter((filePath) => fs.existsSync(filePath));
  }
}

if (filesToValidate.length === 0) {
  console.log('No package.json files found to validate');
  process.exit(0);
}

console.log(`Validating ${filesToValidate.length} package.json file(s)...`);
filesToValidate.forEach(validatePackageJson);
console.log('✅ All package.json files are valid!');
