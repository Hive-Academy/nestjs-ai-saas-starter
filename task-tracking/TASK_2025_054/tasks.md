**Quality Requirements**:

- ✅ Extend `AuthGuard('jwt')`
- ✅ Extract token from `req.query.token`
- ✅ Validate using `AuthService`
- ✅ Attach user to `req.user`

**Implementation Details**:

- **Imports to Verify**: `@nestjs/common`, `@nestjs/passport`, `AuthService`

---

**Batch 1 Verification Requirements**:

- ✅ All files exist at specified paths
- ✅ `AuthContextHelper` compiles and exports correctly

1. Team-leader assigns entire batch to developer
2. Developer executes ALL tasks in batch (in order)
3. Developer stages files progressively (git add after each task)
4. Developer creates ONE commit for entire batch (after all tasks complete)
5. Developer returns with batch git commit SHA
6. Team-leader verifies entire batch
7. If verification passes: Assign next batch
8. If verification fails: Create fix batch
