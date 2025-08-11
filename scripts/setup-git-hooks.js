#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Git hooks with Husky...');

try {
  // Initialize Husky
  console.log('📦 Installing Husky...');
  execSync('npx husky install', { stdio: 'inherit' });

  // Make hook files executable (important for Unix systems)
  const hooksDir = path.join(process.cwd(), '.husky');
  const hookFiles = ['pre-commit', 'commit-msg', 'pre-push'];

  hookFiles.forEach(hookFile => {
    const hookPath = path.join(hooksDir, hookFile);
    if (fs.existsSync(hookPath)) {
      try {
        fs.chmodSync(hookPath, '755');
        console.log(`✅ Made ${hookFile} executable`);
      } catch (error) {
        console.warn(`⚠️  Could not make ${hookFile} executable: ${error.message}`);
      }
    }
  });

  // Test commitlint configuration
  console.log('🧪 Testing commitlint configuration...');
  try {
    execSync('echo "feat: test commit message" | npx commitlint', { stdio: 'pipe' });
    console.log('✅ Commitlint configuration is valid');
  } catch (error) {
    console.warn('⚠️  Commitlint test failed, but continuing setup...');
  }

  // Test lint-staged configuration
  console.log('🧪 Testing lint-staged configuration...');
  if (fs.existsSync('.lintstagedrc.json')) {
    console.log('✅ Lint-staged configuration found');
  } else {
    console.warn('⚠️  Lint-staged configuration not found');
  }

  console.log('\n🎉 Git hooks setup complete!');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Test a commit: git commit -m "feat: test commit"');
  console.log('3. The hooks will automatically run on commit/push');

  console.log('\nHook summary:');
  console.log('• pre-commit: Runs lint-staged, builds affected libraries');
  console.log('• commit-msg: Validates commit message format');
  console.log('• pre-push: Runs tests, lint, build, and publish dry-run for main/develop branches');

} catch (error) {
  console.error('❌ Failed to setup Git hooks:', error.message);
  process.exit(1);
}
