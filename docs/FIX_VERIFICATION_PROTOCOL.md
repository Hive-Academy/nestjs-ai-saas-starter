# Fix Verification Protocol

**Purpose**: Ensure that code fixes are actually deployed and working before marking them as complete.

**Created**: 2025-11-05
**Reason**: Regression discovered - fixes applied to source code but not deployed to runtime

---

## 🚨 THE PROBLEM

In ISSUE_TRACKER V1, we identified and "fixed" 4 critical issues. However, when analyzing new logs, we discovered:

- **HIGH-002 (Date Serialization)**: Marked as ✅ RESOLVED, but STILL FAILING in runtime
- **Root Cause**: Source code modified, but libraries never rebuilt
- **Impact**: False confidence in fix quality, wasted development effort

**Key Insight**: Fixing source code ≠ Fixing the running application

---

## 📋 MANDATORY PROTOCOL

Every fix MUST follow these 7 steps. NO EXCEPTIONS.

### Step 1: Source Code Modification ✏️

```bash
# Make your fix in source code
vim libs/langgraph-modules/adapters/src/lib/repositories/services/graph-agent.service.ts

# Document what you changed
git diff libs/langgraph-modules/adapters/src/
```

**Verification**: Source code diff shows your changes

---

### Step 2: Library Rebuild 🔨

```bash
# Rebuild the library containing the fix
npx nx build @hive-academy/langgraph-adapters

# Check build succeeded
echo $?  # Should be 0
```

**Verification**: Build completes without errors, artifacts updated

**Common Issues**:

- TypeScript compilation errors → Fix type errors
- Missing dependencies → Update package.json
- Build cache issues → `npx nx reset`

---

### Step 3: Dependent Libraries Rebuild 🔗

```bash
# Find dependents
npx nx graph --focus=@hive-academy/langgraph-adapters

# Rebuild dependents
npx nx run-many --target=build --projects=langgraph-memory,langgraph-workflow-engine

# Or rebuild all affected
npx nx affected --target=build
```

**Verification**: All dependent libraries rebuild successfully

**Why This Matters**: Dependencies may cache old versions of your library

---

### Step 4: Application Rebuild 🏗️

```bash
# Rebuild the application
npx nx build dev-brand-api

# Verify build artifacts are newer than source
ls -lt apps/dev-brand-api/dist/main.js
ls -lt libs/langgraph-modules/adapters/src/**/*.ts
```

**Verification**: Application build completes, uses new library artifacts

---

### Step 5: Runtime Restart 🔄

```bash
# Stop existing process (if running)
pkill -f "nx serve"

# Clear any process locks
rm -rf node_modules/.cache/nx

# Start fresh
npx nx serve dev-brand-api
```

**Verification**: Application starts without errors

**Common Issues**:

- Port already in use → `lsof -i :3000` and kill process
- Module not found → `npm install`
- Environment variables → Check .env file

---

### Step 6: Runtime Verification Test 🧪

```bash
# Monitor logs for the specific error you fixed
tail -f log.md | grep "toISOString"  # For date serialization fix
tail -f log.md | grep "Expected 'where' to have exactly one operator"  # For ChromaDB fix

# Trigger the workflow that was failing
curl -X POST http://localhost:3000/api/workflows/test

# Wait for execution and check logs
```

**Verification**: The error you fixed NO LONGER appears in logs

**Required Evidence**:

- Screenshot of successful execution
- Log excerpt showing no errors
- Test passing that previously failed

---

### Step 7: Success Confirmation ✅

```bash
# Document the successful fix
echo "✅ Fix verified at runtime: $(date)" >> task-tracking/TASK_XXXX/verification.md

# Update issue tracker
# Change status from 🟡 OPEN to ✅ VERIFIED

# Commit the verification
git add task-tracking/
git commit -m "docs(tracking): verify fix for issue HIGH-002"
```

**Verification**: Issue status updated, verification documented

---

## 🔍 BUILD ARTIFACT VERIFICATION

Use this script to verify source changes are reflected in builds:

```bash
#!/bin/bash
# scripts/verify-build-artifacts.sh

set -e

PROJECT=$1
if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <project-name>"
  echo "Example: $0 @hive-academy/langgraph-adapters"
  exit 1
fi

# Extract library path from project name
LIB_PATH=$(echo $PROJECT | sed 's/@hive-academy\//libs\/langgraph-modules\//g')

# Find newest source file
NEWEST_SOURCE=$(find $LIB_PATH/src -type f -name "*.ts" -printf '%T@\t%p\n' | sort -n | tail -1)
SOURCE_TIME=$(echo $NEWEST_SOURCE | cut -f1)
SOURCE_FILE=$(echo $NEWEST_SOURCE | cut -f2)

# Find build artifact
BUILD_ARTIFACT="node_modules/$PROJECT/index.cjs.js"
if [ ! -f "$BUILD_ARTIFACT" ]; then
  echo "❌ Build artifact not found: $BUILD_ARTIFACT"
  echo "Run: npx nx build $PROJECT"
  exit 1
fi

BUILD_TIME=$(stat -c %Y "$BUILD_ARTIFACT")

echo "📦 Project: $PROJECT"
echo "📄 Newest source: $SOURCE_FILE"
echo "⏰ Source time: $(date -d @$SOURCE_TIME '+%Y-%m-%d %H:%M:%S')"
echo "🔨 Build time:  $(date -d @$BUILD_TIME '+%Y-%m-%d %H:%M:%S')"
echo ""

if (( $(echo "$SOURCE_TIME > $BUILD_TIME" | bc -l) )); then
  echo "❌ STALE BUILD: Source files modified after build!"
  echo ""
  echo "Action required:"
  echo "  npx nx build $PROJECT"
  echo "  npx nx affected --target=build"
  exit 1
else
  echo "✅ Build artifacts are up-to-date"
fi
```

**Usage**:

```bash
chmod +x scripts/verify-build-artifacts.sh
./scripts/verify-build-artifacts.sh @hive-academy/langgraph-adapters
```

---

## 🚦 AUTOMATED VERIFICATION

Add to your workflow:

```bash
# .husky/pre-serve (create this hook)
#!/bin/bash

echo "🔍 Verifying build artifacts..."

# Check all modified libraries
MODIFIED_LIBS=$(git diff --name-only HEAD | grep "^libs/" | cut -d/ -f1-2 | sort -u)

for lib_path in $MODIFIED_LIBS; do
  # Convert path to project name
  project_name="@hive-academy/$(basename $lib_path)"

  # Verify build artifacts
  ./scripts/verify-build-artifacts.sh $project_name || exit 1
done

echo "✅ All build artifacts verified"
```

---

## 🎯 INTEGRATION TEST CHECKLIST

For each fix, create an integration test:

```typescript
// scripts/integration-tests/verify-fix-HIGH-002.spec.ts

describe('Regression Test: HIGH-002 Date Serialization', () => {
  let graphService: GraphAgentService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LangGraphAdaptersModule],
    }).compile();

    graphService = module.get<GraphAgentService>(GraphAgentService);
  });

  it('should handle number timestamps without toISOString error', async () => {
    const memory: Memory = {
      id: 'test-memory',
      agentName: 'test-agent',
      namespace: 'test',
      content: 'Test content',
      createdAt: Date.now(), // ⚠️ This is a NUMBER, not a Date!
    };

    // This should NOT throw "toISOString is not a function"
    await expect(graphService.trackMemory(memory)).resolves.not.toThrow();
  });

  it('should handle Date objects', async () => {
    const memory: Memory = {
      id: 'test-memory',
      agentName: 'test-agent',
      namespace: 'test',
      content: 'Test content',
      createdAt: new Date(), // ✅ This is a Date object
    };

    await expect(graphService.trackMemory(memory)).resolves.not.toThrow();
  });

  it('should handle ISO date strings', async () => {
    const memory: Memory = {
      id: 'test-memory',
      agentName: 'test-agent',
      namespace: 'test',
      content: 'Test content',
      createdAt: new Date().toISOString(), // ⚠️ This is a STRING!
    };

    await expect(graphService.trackMemory(memory)).resolves.not.toThrow();
  });
});
```

**Run after rebuild**:

```bash
npx nx test integration-tests --testPathPattern=verify-fix-HIGH-002
```

---

## 📊 VERIFICATION CHECKLIST

Use this checklist for every fix:

```markdown
## Fix Verification Checklist

**Issue**: [Issue ID - e.g., HIGH-002]
**Description**: [Brief description]
**Date**: [YYYY-MM-DD]

### Steps Completed

- [ ] Step 1: Source code modified

  - Files changed: **\*\***\_\_\_\_**\*\***
  - Git commit: **\*\***\_\_\_\_**\*\***

- [ ] Step 2: Library rebuilt

  - Command: `npx nx build <library>`
  - Exit code: 0
  - Build time: **\*\***\_\_\_\_**\*\***

- [ ] Step 3: Dependents rebuilt

  - Projects: **\*\***\_\_\_\_**\*\***
  - All successful: YES/NO

- [ ] Step 4: Application rebuilt

  - Command: `npx nx build dev-brand-api`
  - Exit code: 0

- [ ] Step 5: Runtime restarted

  - Process killed: YES
  - Application started: YES
  - No startup errors: YES

- [ ] Step 6: Runtime verification test

  - Test scenario: **\*\***\_\_\_\_**\*\***
  - Error reproduced before fix: YES/NO
  - Error absent after fix: YES/NO
  - Log evidence: **\*\***\_\_\_\_**\*\***

- [ ] Step 7: Success confirmation
  - Issue status updated: YES
  - Verification documented: YES
  - Commit created: YES

### Evidence

**Log Excerpt** (showing error is gone):
```

[paste log excerpt here]

```

**Screenshot** (if applicable):
[screenshot path or attachment]

**Integration Test Result**:
```

[paste test output]

```

### Sign-off

- Developer: ________________
- Date: ________________
- Status: ✅ VERIFIED / 🟡 PARTIAL / ❌ FAILED
```

---

## 🎓 LESSONS LEARNED

### Why This Protocol Matters

1. **Nx Build System**: Libraries are built into `dist/` and published to `node_modules/@hive-academy/*`

   - Source changes in `libs/` don't affect runtime until rebuilt
   - Application uses built artifacts, not source files

2. **Dependency Chain**: Changes propagate through multiple layers

   - Source → Library build → Dependent builds → Application build → Runtime
   - Missing ANY step breaks the chain

3. **False Confidence**: Marking fixes as "complete" based on source changes alone

   - Leads to regression discoveries later
   - Wastes time on "verified" fixes that don't work

4. **Systematic Failure**: Without verification protocol
   - Can't trust ANY fix is working
   - Can't distinguish between new bugs and old bugs
   - Can't measure actual progress

---

## 🚀 QUICK REFERENCE

### One-Line Rebuild Command

```bash
# Rebuild everything affected by changes
npx nx affected --target=build && npx nx serve dev-brand-api
```

### Verify a Specific Fix

```bash
# 1. Rebuild
npx nx build @hive-academy/<library>

# 2. Test
npx nx test integration-tests --testPathPattern=verify-fix-<ISSUE-ID>

# 3. Run
npx nx serve dev-brand-api

# 4. Monitor
tail -f log.md | grep "<error-pattern>"
```

### Emergency: Force Full Rebuild

```bash
# Nuclear option - rebuild everything
npx nx reset
rm -rf node_modules/.cache
npx nx run-many --target=build --all
npx nx serve dev-brand-api
```

---

## 📞 TROUBLESHOOTING

### "Fix still not working after rebuild"

**Check**:

1. Did TypeScript compilation succeed? (`npx nx build` should exit 0)
2. Are build artifacts actually updated? (`ls -lt node_modules/@hive-academy/*/index.cjs.js`)
3. Did you restart the application? (Kill old process first)
4. Are you looking at the right error? (Check log timestamp)

### "Build succeeds but application fails to start"

**Check**:

1. Missing dependencies? (`npm install`)
2. Environment variables? (Check .env file)
3. Port conflicts? (`lsof -i :3000`)
4. Database connections? (Neo4j, ChromaDB, Redis running?)

### "Can't reproduce the error anymore"

**Possible reasons**:

1. Different test data (use same input as original error)
2. Different code path (ensure same workflow executes)
3. Error was intermittent (run multiple times)
4. Error was actually fixed! (Verify with integration test)

---

## 📝 DOCUMENTATION REQUIREMENTS

Every verified fix must include:

1. **Commit message**: Clear description of what was fixed
2. **Issue tracker update**: Change status to ✅ VERIFIED
3. **Verification document**: Evidence that fix works
4. **Integration test**: Automated regression test
5. **Log evidence**: Before/after comparison

**Example commit**:

```bash
git commit -m "fix(adapters): handle number timestamps in graph memory tracking

Fixes HIGH-002: Date serialization error

- Added type checking for memory.createdAt (Date vs number vs string)
- Falls back to current time if invalid type
- Verified with integration test
- No more 'toISOString is not a function' errors in production

Verification: task-tracking/TASK_2025_XXX/verification.md
Test: scripts/integration-tests/verify-fix-HIGH-002.spec.ts
"
```

---

## ✅ SUCCESS METRICS

A fix is considered **VERIFIED** when:

1. ✅ Build artifacts updated (timestamp check)
2. ✅ Application starts without errors
3. ✅ Integration test passes
4. ✅ Original error absent from logs (30+ minutes runtime)
5. ✅ Verification document created
6. ✅ Issue tracker updated

Until ALL criteria met, status remains 🟡 PARTIAL

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Mandatory For**: All bug fixes, all team members, all projects
