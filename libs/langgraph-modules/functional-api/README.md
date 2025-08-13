# @langgraph-modules/functional-api

Functional API module for NestJS LangGraph - provides decorator-based workflow definition with automatic dependency resolution.

## Features

- 🎯 **Decorator-based workflow definition** - Use `@Entrypoint` and `@Task` decorators
- 🔄 **Automatic dependency resolution** - Tasks execute in correct order based on dependencies
- 🔍 **Cycle detection** - Validates workflow dependencies at startup
- ⚡ **Task execution engine** - With timeout, retry, and error handling
- 📊 **Streaming support** - Real-time workflow execution events
- 🎨 **Type-safe** - Full TypeScript support with zero `any` types

## Quick Start

```typescript
import { Injectable } from '@nestjs/common';
import { 
  Entrypoint, 
  Task, 
  TaskExecutionContext, 
  TaskExecutionResult 
} from '@langgraph-modules/functional-api';

// Define a workflow using decorators
@Injectable()
export class DataProcessingWorkflow {
  @Entrypoint({ timeout: 5000 })
  async startProcessing(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    return {
      state: { 
        started: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  @Task({ dependsOn: ['startProcessing'] })
  async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const data = context.state;
    return {
      state: { 
        processed: true,
        result: data
      }
    };
  }
}
```

## Running unit tests

Run `nx test langgraph-modules-functional-api` to execute the unit tests via [Jest](https://jestjs.io).
