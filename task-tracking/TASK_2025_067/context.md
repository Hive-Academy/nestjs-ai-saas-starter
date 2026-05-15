# Task Context for TASK_2025_067

## User Intent

Fix `ClsRootModule` DI failure surfaced after TASK_2025_066. All 9 Layer-1/Layer-2 e2e probes fail with:

```
Nest can't resolve dependencies of the ClsRootModule (?, ModuleRef).
HttpAdapterHost at index [0] is not available in the ClsRootModule context.
```

Root cause: `nestjs-cls` (correlation/context tracking) needs `HttpAdapterHost` which `@nestjs/core` only provides when `NestFactory.create()` is used (HTTP mode). Layer-2 probes use `NestFactory.createApplicationContext()` (context-only) → no HTTP adapter registered → DI fails for ClsRootModule.

## Conversation Summary

### Repro

```bash
set -a && source apps/dev-brand-api/.env && set +a && npm run e2e
# → 9 probes fail with HttpAdapterHost not available in ClsRootModule context
```

### Investigation Targets

- /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/app.module.ts (find ClsModule registration)
- /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/e2e-diagnostics/src/harness/nest-boot.ts (bootContext vs bootApp)
- Check `nestjs-cls` docs/version for context-only mode (`mount: false`, `interceptor`, `middleware` config options)

### Candidate Fixes

1. **Layer-2 probes switch to full HTTP boot** (`bootApp()` instead of `bootContext()`) — works but heavy (HTTP server per probe boot)
2. **Configure ClsModule for context-mode compatibility** — Check if `ClsModule.forRoot({ middleware: { mount: false }, interceptor: { mount: false } })` lets it init without HttpAdapterHost. Source edit in dev-brand-api.
3. **Provide stub `HttpAdapterHost` in context-mode boot** — In `bootContext()`, register a mock HttpAdapterHost provider before resolving AppModule. E2e-only fix.
4. **Conditional ClsModule import** — AppModule imports ClsModule only when `NODE_ENV !== 'test'` or similar flag. Source edit.

### Constraints

- Prefer option that doesn't touch `apps/dev-brand-api/src/app/app.module.ts` if possible (source change has wider blast radius)
- libs/\*\* off-limits
- Production behavior unchanged
- TypeScript strict
- Commit policy: user approves each commit
- Acceptance: 9 probes that fail with HttpAdapterHost progress past ClsRootModule. Either PASS or new error category.

## Technical Context

- Branch: feature/067 (user handles git when ready)
- Created: 2026-05-15
- Task Type: BUGFIX
- Priority: P0-Critical
- Effort Estimate: S (1-2 file fix expected)

## Execution Strategy

BUGFIX_STREAMLINED (skip team-leader per user instruction):

1. software-architect → produce focused implementation-plan.md weighing candidate fixes 1-4
2. USER VALIDATION ✋ on plan
3. backend-developer → apply the chosen fix
4. USER decides QA (tester/reviewer/both/skip)
