# @langgraph-modules/platform

Platform module for NestJS providing integration with LangGraph Platform API. This module enables you to interact with LangGraph Platform services including Assistants, Threads, Runs, and Webhooks.

## Features

- **Assistant Management**: Create, update, and manage LangGraph Platform assistants
- **Thread Operations**: Handle conversation threads with state persistence
- **Run Execution**: Execute and monitor workflow runs with streaming support
- **Webhook Integration**: Manage webhook subscriptions for event notifications
- **Type Safety**: Full TypeScript support with official LangGraph Platform API types
- **HTTP Client**: Built-in HTTP client with error handling and retry logic

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { PlatformModule } from '@langgraph-modules/platform';

@Module({
  imports: [
    PlatformModule.forRoot({
      baseUrl: 'https://api.langraph.com',
      apiKey: process.env.LANGGRAPH_API_KEY,
    }),
  ],
})
export class AppModule {}
```

## Running unit tests

Run `nx test langgraph-modules-platform` to execute the unit tests via [Jest](https://jestjs.io).
