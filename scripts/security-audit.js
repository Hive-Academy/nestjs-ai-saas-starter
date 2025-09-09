#!/usr/bin/env node

/**
 * NPM Supply Chain Security Audit
 *
 * Checks for compromised packages from the recent supply chain attack
 * https://www.bleepingcomputer.com/news/security/hackers-hijack-npm-packages-with-2-billion-weekly-downloads-in-supply-chain-attack/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAudit {
  constructor() {
    // List of compromised packages from the supply chain attack
    this.compromisedPackages = [
      'backslash',
      'chalk-template',
      'supports-hyperlinks',
      'has-ansi',
      'simple-swizzle',
      'color-string',
      'error-ex',
      'color-name',
      'is-arrayish',
      'slice-ansi',
      'color-convert',
      'wrap-ansi',
      'ansi-regex',
      'supports-color',
      'strip-ansi',
      'chalk',
      'debug',
      'ansi-styles',
    ];

    // Attack timeframe (when malicious versions were published)
    this.attackTimeframe = {
      start: '2025-09-09T13:00:00Z', // Approx 9 AM ET
      end: '2025-09-09T15:30:00Z', // Approx 11:30 AM ET
    };

    this.findings = [];
    this.criticalFindings = [];
  }

  log(message, level = 'info') {
    const colors = {
      info: '\x1b[34m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[41m\x1b[37m',
      reset: '\x1b[0m',
    };

    console.log(`${colors[level]}●${colors.reset} ${message}`);
  }

  async auditPackageLock() {
    this.log(
      '🔍 Auditing package-lock.json for compromised packages...',
      'info'
    );

    try {
      const packageLockPath = 'package-lock.json';

      if (!fs.existsSync(packageLockPath)) {
        this.log('No package-lock.json found', 'warning');
        return;
      }

      const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));

      // Check all packages in the lockfile
      this.auditPackages(packageLock.packages || {});
    } catch (error) {
      this.log(`Failed to read package-lock.json: ${error.message}`, 'error');
    }
  }

  auditPackages(packages) {
    for (const [packagePath, packageInfo] of Object.entries(packages)) {
      if (!packagePath || packagePath === '') continue;

      // Extract package name from path (e.g., "node_modules/chalk" -> "chalk")
      const packageName = this.extractPackageName(packagePath);

      if (this.compromisedPackages.includes(packageName)) {
        this.analyzeCompromisedPackage(packageName, packageInfo, packagePath);
      }
    }
  }

  extractPackageName(packagePath) {
    // Handle scoped packages and regular packages
    const parts = packagePath.split('/');

    if (parts.includes('node_modules')) {
      const nodeModulesIndex = parts.lastIndexOf('node_modules');
      const nameAfterNodeModules = parts[nodeModulesIndex + 1];

      if (nameAfterNodeModules && nameAfterNodeModules.startsWith('@')) {
        // Scoped package: @scope/package
        return `${nameAfterNodeModules}/${parts[nodeModulesIndex + 2]}`;
      } else {
        // Regular package
        return nameAfterNodeModules;
      }
    }

    return packagePath;
  }

  analyzeCompromisedPackage(packageName, packageInfo, packagePath) {
    const finding = {
      package: packageName,
      version: packageInfo.version,
      path: packagePath,
      resolved: packageInfo.resolved,
      isDirect: !packagePath.includes('node_modules/'),
      risk: 'HIGH',
      details: [],
    };

    // Check if version was potentially affected
    if (this.isVersionPotentiallyAffected(packageInfo)) {
      finding.risk = 'CRITICAL';
      finding.details.push(
        'Version may have been affected by supply chain attack'
      );
      this.criticalFindings.push(finding);
    }

    // Check for indicators of compromise
    this.checkForIoCs(finding, packageInfo);

    this.findings.push(finding);

    if (finding.risk === 'CRITICAL') {
      this.log(
        `🚨 CRITICAL: ${packageName}@${
          packageInfo.version
        } - ${finding.details.join(', ')}`,
        'critical'
      );
    } else {
      this.log(
        `⚠️  Found compromised package: ${packageName}@${packageInfo.version}`,
        'warning'
      );
    }
  }

  isVersionPotentiallyAffected(packageInfo) {
    // If package was installed during the attack timeframe
    // Note: This is heuristic since we don't have exact install times

    // Check if resolved URL indicates recent installation
    if (
      packageInfo.resolved &&
      packageInfo.resolved.includes('registry.npmjs.org')
    ) {
      // If integrity hash is present, the package was likely installed recently
      if (packageInfo.integrity) {
        return true; // Potentially affected - needs verification
      }
    }

    return false;
  }

  checkForIoCs(finding, packageInfo) {
    // Indicators of Compromise patterns from the attack

    // 1. Check for suspicious integrity hashes (if we had known bad hashes)
    // 2. Check for unexpected dependencies
    // 3. Check for size anomalies

    if (packageInfo.dependencies) {
      const unexpectedDeps = Object.keys(packageInfo.dependencies).filter(
        (dep) => !this.isExpectedDependency(finding.package, dep)
      );

      if (unexpectedDeps.length > 0) {
        finding.details.push(
          `Unexpected dependencies: ${unexpectedDeps.join(', ')}`
        );
      }
    }
  }

  isExpectedDependency(packageName, dependency) {
    // Known legitimate dependencies for each package
    const expectedDeps = {
      chalk: ['ansi-styles', 'supports-color'],
      debug: ['ms'],
      'ansi-styles': ['color-convert'],
      'supports-color': ['has-flag'],
      'strip-ansi': ['ansi-regex'],
      'wrap-ansi': ['ansi-styles', 'string-width', 'strip-ansi'],
      'color-convert': ['color-name'],
    };

    return expectedDeps[packageName]?.includes(dependency) ?? true;
  }

  async checkInstallationTiming() {
    this.log('⏰ Checking installation timing...', 'info');

    try {
      // Check npm cache for timing information
      const cacheInfo = execSync('npm cache ls', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).catch(() => '');

      // This is limited information, but we can check for recent downloads
      if (cacheInfo.includes('2025-09-09')) {
        this.log(
          '⚠️  Packages were downloaded on 2025-09-09 (attack date)',
          'warning'
        );
        return true;
      }
    } catch (error) {
      this.log('Could not determine installation timing', 'info');
    }

    return false;
  }

  async performFullAudit() {
    this.log('🛡️  Starting comprehensive security audit...', 'info');

    // 1. Audit package-lock.json
    await this.auditPackageLock();

    // 2. Check installation timing
    await this.checkInstallationTiming();

    // 3. Run npm audit
    await this.runNpmAudit();

    // 4. Generate report
    this.generateReport();
  }

  async runNpmAudit() {
    this.log('🔍 Running npm audit...', 'info');

    try {
      const auditResult = execSync('npm audit --json', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const audit = JSON.parse(auditResult);

      if (audit.metadata.vulnerabilities.total > 0) {
        this.log(
          `📊 npm audit found ${audit.metadata.vulnerabilities.total} vulnerabilities`,
          'warning'
        );

        if (audit.metadata.vulnerabilities.critical > 0) {
          this.log(
            `🚨 ${audit.metadata.vulnerabilities.critical} CRITICAL vulnerabilities found`,
            'critical'
          );
        }
      } else {
        this.log('✅ npm audit found no vulnerabilities', 'success');
      }
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        try {
          const audit = JSON.parse(error.stdout);
          this.log(
            `📊 npm audit found ${audit.metadata.vulnerabilities.total} vulnerabilities`,
            'warning'
          );
        } catch (parseError) {
          this.log('Could not parse npm audit results', 'warning');
        }
      }
    }
  }

  generateReport() {
    this.log('\n📋 SECURITY AUDIT REPORT', 'info');
    this.log('========================', 'info');

    if (this.criticalFindings.length > 0) {
      this.log(
        `\n🚨 CRITICAL FINDINGS (${this.criticalFindings.length}):`,
        'critical'
      );

      this.criticalFindings.forEach((finding) => {
        console.log(`\n  Package: ${finding.package}@${finding.version}`);
        console.log(`  Path: ${finding.path}`);
        console.log(`  Risk: ${finding.risk}`);
        console.log(`  Details: ${finding.details.join(', ')}`);
        console.log(`  Direct dependency: ${finding.isDirect ? 'YES' : 'NO'}`);
      });

      this.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:', 'critical');
      this.log('1. STOP using the application immediately', 'critical');
      this.log('2. Delete node_modules and package-lock.json', 'critical');
      this.log('3. Run: npm cache clean --force', 'critical');
      this.log('4. Run: npm install to get clean versions', 'critical');
      this.log('5. Verify no malicious code was executed', 'critical');
    } else if (this.findings.length > 0) {
      this.log(
        `\n⚠️  Potentially affected packages found (${this.findings.length}):`,
        'warning'
      );

      this.findings.forEach((finding) => {
        console.log(
          `  - ${finding.package}@${finding.version} (${finding.risk})`
        );
      });

      this.log('\n🔧 RECOMMENDED ACTIONS:', 'warning');
      this.log('1. Update all packages to latest versions', 'warning');
      this.log('2. Clear npm cache: npm cache clean --force', 'warning');
      this.log(
        '3. Reinstall dependencies: rm -rf node_modules package-lock.json && npm install',
        'warning'
      );
    } else {
      this.log('\n✅ No compromised packages detected!', 'success');
      this.log(
        'Your project appears to be safe from this supply chain attack.',
        'success'
      );
    }

    this.log(
      '\n🔗 Reference: https://www.bleepingcomputer.com/news/security/hackers-hijack-npm-packages-with-2-billion-weekly-downloads-in-supply-chain-attack/',
      'info'
    );
  }
}

async function main() {
  const audit = new SecurityAudit();
  await audit.performFullAudit();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurityAudit;
