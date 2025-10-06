# Decorator Validation Solution - Preventing Incompatible Decorator Combinations

## 📊 Research Summary (2025 Best Practices)

### What We Learned from Industry

1. **Angular's Approach (NG1006 Error)**
   - Angular compiler detects incompatible decorators at build time
   - Error: "Two incompatible decorators on class"
   - Enforced during AOT compilation

2. **TypeScript Limitations**
   - No native compile-time validation for decorator conflicts
   - Decorators are runtime constructs
   - Type system alone cannot prevent decorator mixing

3. **NestJS Patterns**
   - Uses `applyDecorators()` for composition
   - Runtime validation in guards/interceptors
   - Relies on metadata reflection

### Industry Best Practices (2025)

✅ **Multi-layered Validation**:

1. **Runtime Validation** (immediate) - Decorator factories validate metadata
2. **Type System Constraints** (medium-term) - TypeScript types prevent invalid combinations
3. **ESLint Rules** (long-term) - Static analysis catches issues pre-commit
4. **Documentation** (always) - Clear API contracts and examples

## 🎯 Our Current State

### What We Have ✅

1. **WorkflowValidator** (`functional-api/src/lib/validation/workflow-validator.ts`)
   - Validates functional workflow definitions
   - Detects circular dependencies
   - Validates task references
   - **Gap**: Doesn't validate decorator combinations

2. **MetadataProcessorService** (`workflow-engine/src/lib/core/metadata-processor.service.ts`)
   - Validates workflow definitions
   - Checks node/edge references
   - **Gap**: Validation happens too late (after graph construction)

3. **Decorator Metadata** (all decorators)
   - All decorators store metadata on classes/methods
   - **Gap**: No cross-decorator validation

### What We Need ❌

1. **Early Decorator Conflict Detection**
   - Validate at decoration time (when decorator is applied)
   - Clear error messages with guidance
   - Detect @Task + @Edge conflicts immediately

2. **Type-Level Constraints**
   - Base classes that enforce patterns
   - TypeScript utility types that prevent mixing

3. **Developer Experience**
   - Autocomplete hints
   - IDE warnings
   - Clear error messages

## 🛠️ Implementation Strategy

### Phase 1: Runtime Validation (Immediate - This PR)

Add validation to decorator factories to detect conflicts when decorators are applied.

#### 1.1. Create Decorator Validation Utility

**Location**: `libs/langgraph-modules/functional-api/src/lib/utils/decorator-validator.ts`

```typescript
/**
 * Decorator pattern metadata keys
 */
export const DECORATOR_PATTERN_KEY = Symbol('decorator:pattern');

export type DecoratorPattern = 'task-based' | 'node-based' | 'unset';

/**
 * Stores the decorator pattern being used
 */
export function setDecoratorPattern(
  target: any,
  pattern: DecoratorPattern
): void {
  Reflect.defineMetadata(DECORATOR_PATTERN_KEY, pattern, target);
}

/**
 * Gets the current decorator pattern
 */
export function getDecoratorPattern(target: any): DecoratorPattern {
  return Reflect.getMetadata(DECORATOR_PATTERN_KEY, target) || 'unset';
}

/**
 * Validates decorator compatibility
 * Throws error if incompatible decorators are used
 */
export function validateDecoratorPattern(
  target: any,
  newPattern: DecoratorPattern,
  decoratorName: string,
  className?: string
): void {
  const existingPattern = getDecoratorPattern(target);

  // First decorator sets the pattern
  if (existingPattern === 'unset') {
    setDecoratorPattern(target, newPattern);
    return;
  }

  // Check for conflicts
  if (existingPattern !== newPattern) {
    const targetName = className || target.constructor?.name || target.name || 'Unknown';
    throw new DecoratorPatternConflictError(
      `Incompatible decorator @${decoratorName} detected in ${targetName}.\n` +
      `\n` +
      `Current pattern: ${existingPattern}\n` +
      `Attempted pattern: ${newPattern}\n` +
      `\n` +
      `🚫 You cannot mix decorator patterns:\n` +
      `  • Task-based: @Entrypoint + @Task (with dependsOn)\n` +
      `  • Node-based: @Node + @Edge (explicit graph)\n` +
      `\n` +
      `📖 See docs: task-tracking/DECORATOR_PATTERNS_ANALYSIS.md\n` +
      `\n` +
      `✅ Choose ONE pattern for ${targetName}:\n` +
      `  Option 1: Use @Entrypoint + @Task (remove @Node and @Edge)\n` +
      `  Option 2: Use @Node + @Edge (remove @Entrypoint and @Task)\n`
    );
  }
}

/**
 * Custom error for decorator pattern conflicts
 */
export class DecoratorPatternConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecoratorPatternConflictError';
    Error.captureStackTrace?.(this, DecoratorPatternConflictError);
  }
}
```

#### 1.2. Update @Entrypoint Decorator

```typescript
export function Entrypoint(options: EntrypointOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 🔒 VALIDATION: Enforce task-based pattern
    validateDecoratorPattern(
      target.constructor,
      'task-based',
      'Entrypoint',
      target.constructor.name
    );

    // ... rest of decorator implementation
  };
}
```

#### 1.3. Update @Task Decorator

```typescript
export function Task(options: TaskOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 🔒 VALIDATION: Enforce task-based pattern
    validateDecoratorPattern(
      target.constructor,
      'task-based',
      'Task',
      target.constructor.name
    );

    // ... rest of decorator implementation
  };
}
```

#### 1.4. Update @Node Decorator

```typescript
export function Node(optionsOrId?: NodeOptions | string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 🔒 VALIDATION: Enforce node-based pattern
    validateDecoratorPattern(
      target.constructor,
      'node-based',
      'Node',
      target.constructor.name
    );

    // ... rest of decorator implementation
  };
}
```

#### 1.5. Update @Edge Decorator

```typescript
export function Edge(
  from: string,
  to: string | ((state: any) => string | null),
  options: EdgeOptions = {}
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // 🔒 VALIDATION: Enforce node-based pattern
    validateDecoratorPattern(
      target.constructor,
      'node-based',
      'Edge',
      target.constructor.name
    );

    // ... rest of decorator implementation
  };
}
```

### Phase 2: Type System Constraints (Medium-term)

#### 2.1. Create Pattern-Specific Base Classes

```typescript
/**
 * Base class for task-based workflows
 * ONLY supports @Entrypoint and @Task decorators
 */
export abstract class TaskBasedWorkflowBase<TState extends WorkflowState = WorkflowState> {
  // Type constraint: methods must return TaskExecutionResult
  protected abstract [key: string]:
    | ((context: TaskExecutionContext<TState>) => Promise<TaskExecutionResult<TState>>)
    | any;
}

/**
 * Base class for node-based workflows
 * ONLY supports @Node and @Edge decorators
 */
export abstract class NodeBasedWorkflowBase<TState extends WorkflowState = WorkflowState> {
  // Type constraint: methods must accept state parameter
  protected abstract [key: string]:
    | ((state: TState) => Promise<Partial<TState>> | Partial<TState>)
    | any;
}
```

#### 2.2. Update Documentation

Update all examples to use pattern-specific base classes:

```typescript
// ✅ CORRECT: Task-based workflow
export class MyTaskWorkflow extends TaskBasedWorkflowBase {
  @Entrypoint()
  async start(context: TaskExecutionContext) { ... }

  @Task({ dependsOn: ['start'] })
  async process(context: TaskExecutionContext) { ... }
}

// ✅ CORRECT: Node-based workflow
export class MyNodeWorkflow extends NodeBasedWorkflowBase {
  @Node({ type: 'standard' })
  async start(state: WorkflowState) { ... }

  @Edge('start', 'process')
  route() {}
}

// ❌ COMPILE ERROR: Wrong base class
export class BadWorkflow extends TaskBasedWorkflowBase {
  @Node({ type: 'standard' })  // TypeScript error!
  async start(state: WorkflowState) { ... }
}
```

### Phase 3: ESLint Rules (Long-term)

#### 3.1. Custom ESLint Rule: no-mixed-decorator-patterns

**Location**: `tools/eslint-rules/no-mixed-decorator-patterns.js`

```javascript
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent mixing @Task/@Entrypoint with @Node/@Edge decorators',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      mixedPatterns:
        'Class "{{className}}" mixes incompatible decorators. ' +
        'Use either @Entrypoint/@Task OR @Node/@Edge, not both.',
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        const decorators = getAllMethodDecorators(node);
        const hasTaskBased = decorators.some(d =>
          d.name === 'Entrypoint' || d.name === 'Task'
        );
        const hasNodeBased = decorators.some(d =>
          d.name === 'Node' || d.name === 'Edge'
        );

        if (hasTaskBased && hasNodeBased) {
          context.report({
            node,
            messageId: 'mixedPatterns',
            data: { className: node.id.name },
          });
        }
      },
    };
  },
};
```

#### 3.2. ESLint Configuration

```json
{
  "rules": {
    "@hive-academy/no-mixed-decorator-patterns": "error"
  }
}
```

### Phase 4: Developer Experience Enhancements

#### 4.1. JSDoc with Clear Examples

```typescript
/**
 * @Entrypoint decorator - Marks the entry point of a TASK-BASED workflow
 *
 * ⚠️ PATTERN RESTRICTION:
 * - Can ONLY be used with @Task decorators
 * - CANNOT be mixed with @Node or @Edge
 *
 * @example ✅ CORRECT - Task-based workflow
 * ```typescript
 * export class MyWorkflow {
 *   @Entrypoint()
 *   async start(context: TaskExecutionContext) { ... }
 *
 *   @Task({ dependsOn: ['start'] })
 *   async process(context: TaskExecutionContext) { ... }
 * }
 * ```
 *
 * @example ❌ WRONG - Mixing patterns
 * ```typescript
 * export class BadWorkflow {
 *   @Entrypoint()  // ❌ Error!
 *   async start(context: TaskExecutionContext) { ... }
 *
 *   @Node({ type: 'standard' })  // ❌ Cannot mix!
 *   async process(state: WorkflowState) { ... }
 * }
 * ```
 */
export function Entrypoint(options: EntrypointOptions = {}): MethodDecorator { ... }
```

#### 4.2. IDE Autocomplete Hints

Add TypeScript declaration overloads for better autocomplete:

```typescript
// For classes extending TaskBasedWorkflowBase
declare function Entrypoint<T extends TaskBasedWorkflowBase>(
  options?: EntrypointOptions
): MethodDecorator;

// For classes extending NodeBasedWorkflowBase (should error)
declare function Entrypoint<T extends NodeBasedWorkflowBase>(
  options?: never
): never;
```

## 📋 Implementation Checklist

### Phase 1: Runtime Validation (This PR)

- [ ] Create `decorator-validator.ts` utility
- [ ] Add `DecoratorPatternConflictError` class
- [ ] Update `@Entrypoint` with validation
- [ ] Update `@Task` with validation
- [ ] Update `@Node` with validation
- [ ] Update `@Edge` with validation
- [ ] Add unit tests for conflict detection
- [ ] Update CLAUDE.md with new validation

### Phase 2: Type Constraints (Next PR)

- [ ] Create `TaskBasedWorkflowBase` class
- [ ] Create `NodeBasedWorkflowBase` class
- [ ] Update all example code
- [ ] Update documentation
- [ ] Deprecate `DeclarativeWorkflowBase` (too permissive)

### Phase 3: ESLint Rules (Future PR)

- [ ] Create custom ESLint rule
- [ ] Add to workspace ESLint config
- [ ] Document ESLint rule
- [ ] Add to CI/CD pipeline

### Phase 4: DX Enhancements (Ongoing)

- [ ] Enhance JSDoc comments
- [ ] Add TypeScript declaration overloads
- [ ] Create migration guide
- [ ] Add FAQ section to docs

## 🎓 Key Benefits

1. **Immediate Feedback**: Errors at decoration time, not graph compilation
2. **Clear Guidance**: Error messages explain exactly what to do
3. **Type Safety**: TypeScript prevents invalid combinations (Phase 2)
4. **Proactive Catching**: ESLint catches issues before runtime (Phase 3)
5. **Better DX**: Autocomplete and IDE hints guide developers

## 📊 Error Message Example

**Before** (confusing):

```
Error: Edge 0: Target node 'finalizeAnalysis' not found
```

**After** (actionable):

```
DecoratorPatternConflictError: Incompatible decorator @Edge detected in GitHubCodeAnalyzerAgent.

Current pattern: task-based
Attempted pattern: node-based

🚫 You cannot mix decorator patterns:
  • Task-based: @Entrypoint + @Task (with dependsOn)
  • Node-based: @Node + @Edge (explicit graph)

📖 See docs: task-tracking/DECORATOR_PATTERNS_ANALYSIS.md

✅ Choose ONE pattern for GitHubCodeAnalyzerAgent:
  Option 1: Use @Entrypoint + @Task (remove @Node and @Edge)
  Option 2: Use @Node + @Edge (remove @Entrypoint and @Task)
```

## 🚀 Next Steps

1. **Implement Phase 1** (Runtime Validation) - Can be done today
2. **Fix GitHubCodeAnalyzerAgent** - Apply the fix from DECORATOR_PATTERNS_ANALYSIS.md
3. **Run update:libs** - Test the changes
4. **Plan Phase 2** - Type system constraints (next sprint)
