# Task Breakdown: TASK_2025_056

**Task Type**: REFACTORING  
**User Request**: Implement nestjs-cls integration into security decorators- [x] **Task 3.5**: Split security decorators into separate files `[backend-developer]` <!-- id: 3.5 -->removing complex fallback detection logic
**Description**: Refactor security decorators to use ClsService as single source of truth, removing complex fallback detection logic

---

## Task Batching Strategy

Tasks are batched by dependency and logical grouping:

- **Batch 1**: Dependency updates + Core refactoring (Tasks 1-3)
- **Batch 2**: Repository optimization + Documentation (Tasks 4-5)
- **Batch 3**: Testing + Verification (Tasks 6-8)

---

## Task List

### Batch 1: Core Refactoring (COMPLETE)

#### Task 1: Add nestjs-cls peer dependency

- **Status**: 🔄 IN PROGRESS
- **Developer**: backend-developer
- **Files**:
  - `libs/nestjs-neo4j/package.json`
  - Add clear error messages mentioning ClsModule configuration
  - Extract user data from `cls.get<RequestUser>('user')`
  - Build AuthContext from CLS user data
- **Verification**:
  - ✅ Function uses `ClsServiceManager.getClsService()`
  - ✅ No fallback detection code remains
  - ✅ Clear error messages mention ClsModule
  - ✅ ~150 lines of code removed
- **Commit Pattern**: `refactor(neo4j): simplify security decorators with ClsService`

---

#### Task 3: Remove obsolete helper functions

- **Status**: ⏸️ PENDING
- **Developer**: backend-developer
- **Files**:
  - `libs/nestjs-neo4j/src/lib/decorators/security.decorators.ts` (lines 758-900)
- **Description**: Delete helper functions no longer needed after ClsService refactoring
- **Changes**:
  - DELETE `extractTenantFromUser()` function (lines 758-795)
  - DELETE `extractClientIP()` function (lines 822-850)
  - DELETE `extractUserFromRequest()` function (lines 852-900)
  - KEEP `getUserPermissions()` - still needed for permission resolution
- **Verification**:
  - ✅ Deleted functions no longer exist in file
  - ✅ `getUserPermissions()` remains
  - ✅ No compilation errors
- **Commit Pattern**: `refactor(neo4j): remove obsolete detection helper functions`

---

### Batch 2: Repository Optimization + Documentation

#### Task 4: Optimize ThreadRegistryRepository to singleton scope

- **Status**: ⏸️ PENDING
- **Developer**: backend-developer
- **Files**:
  - `libs/langgraph-modules/adapters/src/lib/repositories/neo4j/thread-registry.repository.ts`
- **Description**: Remove REQUEST scope and @Inject(REQUEST) - decorators now use ClsService
- **Changes**:
  - Remove `{ scope: Scope.REQUEST }` from @Injectable()
  - Remove `@Inject(REQUEST) public readonly request: any` from constructor
  - Update constructor signature to only include neogma and crud
- **Verification**:
  - ✅ @Injectable() has no scope parameter (default singleton)
  - ✅ No REQUEST injection in constructor
  - ✅ Build passes
- **Commit Pattern**: `refactor(adapters): optimize ThreadRegistryRepository to singleton scope`

---

#### Task 5: Create ClsModule setup documentation

- **Status**: ⏸️ PENDING
- **Developer**: backend-developer
- **Files**:
  - `libs/nestjs-neo4j/docs/CLS-SETUP.md` (NEW)
- **Description**: Create comprehensive guide for ClsModule configuration
- **Changes**:
  - Create new documentation file with:
    - Installation instructions
    - AppModule configuration example
    - Auth guard integration example
    - Test mocking patterns
    - Error messages and troubleshooting
- **Verification**:
  - ✅ File exists at specified path
  - ✅ Contains all sections from implementation plan
  - ✅ Code examples are complete and accurate
- **Commit Pattern**: `docs(neo4j): add ClsModule setup guide`

---

### Batch 3: Testing + Verification

#### Task 6: Create unit tests for ClsService integration

- **Status**: ⏸️ PENDING
- **Developer**: backend-developer
- **Files**:
  - `libs/nestjs-neo4j/src/lib/decorators/security.decorators.spec.ts` (NEW)
- **Description**: Create comprehensive unit tests for ClsService-based authentication
- **Changes**:
  - Create test file with ClsServiceManager mocking
  - Test successful user extraction from ClsService
  - Test UnauthorizedException when user not in CLS
  - Test validation errors for missing userId/tenantId
  - Test permission resolution
- **Verification**:
  - ✅ All 4 test cases pass
  - ✅ Tests use ClsServiceManager mock
  - ✅ 100% coverage of getExecutionContext logic
- **Commit Pattern**: `test(neo4j): add ClsService integration tests`

---

#### Task 7: Configure ClsModule in dev-brand-api

- **Status**: ⏸️ PENDING
- **Developer**: backend-developer
- **Files**:
  - `apps/dev-brand-api/src/app/app.module.ts`
- **Description**: Add ClsModule configuration to demonstrate integration
- **Changes**:
  - Import ClsModule from nestjs-cls
  - Add ClsModule.forRoot() with global: true and middleware configuration
  - Set up middleware to extract user from request and store in CLS
- **Verification**:
  - ✅ ClsModule imported and configured
  - ✅ Middleware sets user in CLS from req.user
  - ✅ Application starts without errors
- **Commit Pattern**: `feat(dev-brand-api): configure ClsModule for auth context`

---

#### Task 8: Build verification

- **Status**: ⏸️ PENDING
- **Developer**: backend-developer
- **Files**: N/A (build verification)
- **Description**: Verify all affected packages build successfully
- **Commands**:
  ```bash
  npx nx build @hive-academy/nestjs-neo4j
  npx nx build @hive-academy/langgraph-adapters
  npx nx test @hive-academy/nestjs-neo4j --testFile=security.decorators.spec.ts
  ```
- **Verification**:
  - ✅ nestjs-neo4j builds without errors
  - ✅ langgraph-adapters builds without errors
  - ✅ Unit tests pass
  - ✅ No TypeScript errors
- **Commit Pattern**: N/A (verification only, no commit)

---

## Summary

**Total Tasks**: 8  
**Batches**: 3  
**Developer Type**: backend-developer (all tasks)  
**Estimated Code Reduction**: ~150 lines (removal of fallback detection logic)

**Success Criteria**:

- ✅ Security decorators use ClsService exclusively
- ✅ No fallback detection code remains
- ✅ ThreadRegistryRepository optimized to singleton
- ✅ Comprehensive documentation created
- ✅ Unit tests achieve 100% coverage of new logic
- ✅ All builds pass
- ✅ Integration test confirms dev-brand-api functionality
