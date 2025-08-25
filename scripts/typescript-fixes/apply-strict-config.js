#!/usr/bin/env node

/**
 * Apply Strict TypeScript Configuration
 * Updates all library tsconfig files to use strict type checking
 */

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
  white: (text) => `\x1b[37m${text}\x1b[0m`
};

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

/**
 * Load the strict TypeScript configuration template
 */
function loadStrictTemplate() {
  const templatePath = path.join(__dirname, 'strict-tsconfig.template.json');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Strict TypeScript template not found');
  }
  return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}

/**
 * Update tsconfig.lib.json for a library
 */
function updateLibraryTsConfig(library, template) {
  const libPath = path.join('libs', library);
  const tsconfigPath = path.join(libPath, 'tsconfig.lib.json');

  if (!fs.existsSync(libPath)) {
    console.log(chalk.yellow(`⚠️  Library ${library} not found, skipping...`));
    return false;
  }

  // Read existing tsconfig
  let existingConfig = {};
  if (fs.existsSync(tsconfigPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to parse existing tsconfig for ${library}: ${error.message}`));
      return false;
    }
  }

  // Create new config by merging template with existing
  const newConfig = {
    ...template,
    compilerOptions: {
      ...template.compilerOptions,
      // Preserve any library-specific settings
      ...(existingConfig.compilerOptions || {}),
      // Override with strict settings
      ...template.compilerOptions
    },
    // Preserve existing include/exclude if they exist and are more specific
    include: existingConfig.include || template.include,
    exclude: [
      ...(template.exclude || []),
      ...(existingConfig.exclude || [])
    ].filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
  };

  // Adjust extends path based on library depth
  const depth = library.split('/').length;
  const extendsPath = depth === 1 ? '../../tsconfig.base.json' : '../../../tsconfig.base.json';
  newConfig.extends = extendsPath;

  // Write updated config
  try {
    fs.writeFileSync(tsconfigPath, JSON.stringify(newConfig, null, 2));
    console.log(chalk.green(`✅ Updated tsconfig.lib.json for ${library}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to write tsconfig for ${library}: ${error.message}`));
    return false;
  }
}

/**
 * Create backup of existing configurations
 */
function createBackup() {
  const backupDir = path.join('scripts', 'typescript-fixes', 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `tsconfig-backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.mkdirSync(backupPath, { recursive: true });

  console.log(chalk.blue('📦 Creating backup of existing configurations...'));

  for (const library of LIBRARIES) {
    const libPath = path.join('libs', library);
    const tsconfigPath = path.join(libPath, 'tsconfig.lib.json');

    if (fs.existsSync(tsconfigPath)) {
      const backupFile = path.join(backupPath, `${library.replace('/', '-')}-tsconfig.lib.json`);
      fs.copyFileSync(tsconfigPath, backupFile);
    }
  }

  console.log(chalk.green(`✅ Backup created at: ${backupPath}`));
  return backupPath;
}

/**
 * Validate that all libraries can compile with new config
 */
function validateConfigurations() {
  console.log(chalk.blue('🔍 Validating new TypeScript configurations...'));

  const { validateTypeScriptCompilation } = require('./validate-types.js');

  let allValid = true;
  for (const library of LIBRARIES) {
    const result = validateTypeScriptCompilation(library);
    if (!result.success) {
      allValid = false;
    }
  }

  return allValid;
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.cyan('🚀 Applying Strict TypeScript Configuration'));
  console.log(chalk.cyan('='.repeat(50)));

  const args = process.argv.slice(2);
  const skipBackup = args.includes('--no-backup');
  const skipValidation = args.includes('--no-validation');

  try {
    // Create backup unless skipped
    let backupPath;
    if (!skipBackup) {
      backupPath = createBackup();
    }

    // Load template
    const template = loadStrictTemplate();
    console.log(chalk.blue('📋 Loaded strict TypeScript configuration template'));

    // Apply to all libraries
    let successCount = 0;
    for (const library of LIBRARIES) {
      console.log(chalk.magenta(`\n📦 Processing library: ${library}`));
      if (updateLibraryTsConfig(library, template)) {
        successCount++;
      }
    }

    console.log(chalk.cyan(`\n📊 Updated ${successCount}/${LIBRARIES.length} libraries`));

    // Validate configurations unless skipped
    if (!skipValidation) {
      console.log(chalk.blue('\n🔍 Validating updated configurations...'));
      const isValid = validateConfigurations();

      if (!isValid) {
        console.log(chalk.red('❌ Some configurations failed validation'));
        if (backupPath) {
          console.log(chalk.yellow(`💡 You can restore from backup at: ${backupPath}`));
        }
        process.exit(1);
      }
    }

    console.log(chalk.green('\n🎉 Successfully applied strict TypeScript configuration to all libraries!'));

    // Provide next steps
    console.log(chalk.cyan('\n📋 Next Steps:'));
    console.log(chalk.white('1. Run: npm run validate:types to check for issues'));
    console.log(chalk.white('2. Fix any TypeScript errors that are now caught'));
    console.log(chalk.white('3. Run: npm run build:libs to ensure everything builds'));

  } catch (error) {
    console.error(chalk.red('💥 Failed to apply strict configuration:'), error);
    process.exit(1);
  }
}

// Handle CLI usage
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('💥 Script failed:'), error);
    process.exit(1);
  });
}
