#!/bin/bash

# NestJS AI SaaS Starter - Automated Migration Script
# This script provides a comprehensive migration strategy for the Nx monorepo
# with special handling for publishable libraries and dependency management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
handle_error() {
    log_error "Migration failed at step: $1"
    log_error "Check the logs above for details"
    log_info "You can restore from backup using:"
    log_info "git checkout backup/migration-$(date +%Y%m%d)"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if git is clean
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Working directory is not clean. Uncommitted changes detected."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules not found. Running npm install..."
        npm install || handle_error "npm install failed"
    fi
    
    # Check if Nx is available
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js and npm."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Create backup
create_backup() {
    local backup_branch="backup/migration-$(date +%Y%m%d-%H%M)"
    log_info "Creating backup branch: $backup_branch"
    
    git add . && git commit -m "chore: pre-migration backup" || log_warning "No changes to commit"
    git checkout -b "$backup_branch" || handle_error "Failed to create backup branch"
    git push -u origin "$backup_branch" || log_warning "Failed to push backup branch (continuing anyway)"
    git checkout main || git checkout master || handle_error "Failed to return to main branch"
    
    log_success "Backup created: $backup_branch"
}

# Clean environment
clean_environment() {
    log_info "Cleaning environment..."
    
    # Stop development services
    npm run dev:stop 2>/dev/null || log_warning "Failed to stop dev services (continuing anyway)"
    
    # Clean directories
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf dist 2>/dev/null || true
    rm -rf tmp 2>/dev/null || true
    rm -rf .nx/cache 2>/dev/null || true
    
    # Clear npm cache
    npm cache clean --force || log_warning "Failed to clean npm cache"
    
    log_success "Environment cleaned"
}

# Check current versions
check_current_versions() {
    log_info "Current versions:"
    echo "Node.js: $(node --version)"
    echo "npm: $(npm --version)"
    echo "Nx: $(npx nx --version)"
    
    # Save current package.json for comparison
    cp package.json package.json.backup
    
    log_info "Package.json backed up for comparison"
}

# Run Nx migration
run_nx_migration() {
    log_info "Starting Nx migration..."
    
    # Check what migrations are available
    log_info "Checking available migrations..."
    npx nx migrate latest --dry-run || handle_error "Failed to check migrations"
    
    # Interactive migration
    log_info "Running interactive migration..."
    npx nx migrate latest --interactive || handle_error "Nx migration failed"
    
    # Check if migrations.json was created
    if [ -f "migrations.json" ]; then
        log_info "Migration plan created. Reviewing..."
        cat migrations.json
        
        read -p "Apply these migrations? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Applying migrations..."
            npx nx migrate --run-migrations --verbose || handle_error "Failed to run migrations"
            rm migrations.json || log_warning "Failed to remove migrations.json"
        else
            log_warning "Migrations skipped by user"
            rm migrations.json
        fi
    else
        log_info "No migrations needed"
    fi
    
    log_success "Nx migration completed"
}

# Manual dependency updates
update_dependencies() {
    log_info "Updating dependencies manually..."
    
    # Install dependencies first
    npm install || handle_error "npm install failed"
    
    # Update specific dependency groups
    log_info "Updating Nx packages..."
    npm update @nx/workspace @nx/js @nx/nest @nx/angular @nx/eslint @nx/jest @nx/webpack || log_warning "Some Nx packages failed to update"
    
    log_info "Updating NestJS packages..."
    npm update @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/swagger || log_warning "Some NestJS packages failed to update"
    
    log_info "Updating AI/ML packages..."
    npm update @langchain/core @langchain/langgraph @langchain/openai langchain openai chromadb neo4j-driver || log_warning "Some AI/ML packages failed to update"
    
    log_info "Updating Angular packages..."
    npm update @angular/core @angular/common @angular/cli @angular/platform-browser || log_warning "Some Angular packages failed to update"
    
    log_success "Dependencies updated"
}

# Sync peer dependencies
sync_peer_dependencies() {
    log_info "Synchronizing peer dependencies..."
    
    if [ -f "scripts/sync-peer-dependencies.js" ]; then
        node scripts/sync-peer-dependencies.js || handle_error "Peer dependency sync failed"
        log_success "Peer dependencies synchronized"
    else
        log_warning "sync-peer-dependencies.js script not found, skipping"
    fi
}

# Install and configure dependency checks
setup_dependency_checks() {
    log_info "Setting up @nx/dependency-checks..."
    
    # Install dependency checks if not present
    npm install --save-dev @nx/dependency-checks || log_warning "Failed to install @nx/dependency-checks"
    
    # Note: ESLint configuration should be updated manually
    log_info "Note: Remember to add @nx/dependency-checks rule to your ESLint configuration"
    log_info "See the migration guide for ESLint configuration details"
}

# Verify builds
verify_builds() {
    log_info "Verifying builds..."
    
    # Build libraries
    log_info "Building libraries..."
    npm run build:libs || handle_error "Library builds failed"
    
    # Build applications
    log_info "Building applications..."
    npx nx run-many -t build --parallel=3 || log_warning "Some application builds failed"
    
    log_success "Build verification completed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    npx nx run-many -t test --parallel=3 --passWithNoTests || log_warning "Some tests failed"
    
    log_success "Test verification completed"
}

# Verify publishing
verify_publishing() {
    log_info "Verifying publish process..."
    
    npm run publish:dry-run || log_warning "Publish dry-run had issues"
    
    log_success "Publish verification completed"
}

# Check for issues
check_for_issues() {
    log_info "Checking for common issues..."
    
    # Check for circular dependencies
    if command -v madge &> /dev/null; then
        log_info "Checking for circular dependencies..."
        npx madge --circular --extensions ts libs/ || log_warning "Circular dependency check failed"
    fi
    
    # Check npm audit
    log_info "Running npm audit..."
    npm audit --audit-level=high || log_warning "Security vulnerabilities found"
    
    # Check for outdated packages
    log_info "Checking for outdated packages..."
    npm outdated || log_info "Some packages are outdated (this is normal)"
}

# Generate migration report
generate_report() {
    log_info "Generating migration report..."
    
    local report_file="migration-report-$(date +%Y%m%d-%H%M).md"
    
    cat > "$report_file" << EOF
# Migration Report - $(date)

## Pre-Migration State
$(cat package.json.backup | grep '"version"' | head -5)

## Post-Migration State
$(cat package.json | grep '"version"' | head -5)

## Nx Version
Before: $(git show HEAD~1:package.json | jq -r '.devDependencies["nx"] // "not found"')
After: $(cat package.json | jq -r '.devDependencies["nx"] // "not found"')

## Key Changes
$(git diff --name-only package.json || echo "No package.json changes")

## Build Status
Libraries: $(npm run build:libs > /dev/null 2>&1 && echo "✅ Success" || echo "❌ Failed")
Applications: $(npx nx run-many -t build > /dev/null 2>&1 && echo "✅ Success" || echo "❌ Failed")

## Test Status
$(npx nx run-many -t test --passWithNoTests > /dev/null 2>&1 && echo "✅ Tests passing" || echo "❌ Some tests failing")

## Recommendations
1. Review any failing tests
2. Update documentation if needed
3. Consider updating CHANGELOG.md
4. Test applications manually
5. Update CI/CD pipelines if needed

## Next Steps
- [ ] Manual testing of key features
- [ ] Update team on changes
- [ ] Deploy to staging environment
- [ ] Monitor for issues

EOF
    
    log_success "Migration report generated: $report_file"
    
    # Clean up backup
    rm package.json.backup 2>/dev/null || true
}

# Main migration function
main() {
    log_info "🚀 Starting NestJS AI SaaS Starter Migration..."
    log_info "This script will:"
    log_info "1. Create a backup"
    log_info "2. Clean the environment" 
    log_info "3. Run Nx migrations"
    log_info "4. Update dependencies"
    log_info "5. Sync peer dependencies"
    log_info "6. Verify everything works"
    echo
    
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled by user"
        exit 0
    fi
    
    # Execute migration steps
    check_prerequisites
    check_current_versions
    create_backup
    clean_environment
    run_nx_migration
    update_dependencies
    sync_peer_dependencies
    setup_dependency_checks
    verify_builds
    run_tests
    verify_publishing
    check_for_issues
    generate_report
    
    log_success "🎉 Migration completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Review the migration report"
    log_info "2. Test your applications manually"
    log_info "3. Update your team on the changes"
    log_info "4. Consider updating documentation"
    log_info ""
    log_info "If you encounter issues, you can:"
    log_info "1. Check the troubleshooting section in docs/MIGRATION-GUIDE.md"
    log_info "2. Restore from backup if needed"
    log_info "3. Run individual verification steps"
}

# Handle script interruption
trap 'log_error "Migration interrupted by user"; exit 1' INT

# Run main function
main "$@"