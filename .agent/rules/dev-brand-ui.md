---
trigger: always_on
---

# dev-brand-ui

## Overview

Angular UI for the Dev Brand SaaS platform. Uses standalone components, signals, and TailwindCSS.

---

## Architecture

- **Components**: Standalone with signals
- **State**: Local signals + RxJS for streams
- **Styling**: TailwindCSS
- **API**: HttpClient + WebSocket

---

## Workflow Streaming

```typescript
import { LangGraphClient } from '@hive-academy/langgraph-client';

export class MyComponent {
  constructor(private langGraph: LangGraphClient) {}

  streamWorkflow() {
    this.langGraph.streamWorkflow('workflow-id', input).subscribe((event) => {
      // Handle streaming events
      console.log(event);
    });
  }
}
```

---

## Best Practices

1. Use standalone components
2. Use signals for local state
3. Use RxJS for streaming
4. Apply TailwindCSS utilities
