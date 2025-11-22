# Tool Streaming Guide - ResearcherAgent

## Overview

This guide demonstrates how tool execution streaming works end-to-end in the ResearcherAgent workflow, from backend LangGraph execution to Angular UI visualization.

---

## Architecture Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                        TOOL STREAMING FLOW                         │
└────────────────────────────────────────────────────────────────────┘

1. USER ACTION
   ↓
   User: "research angular signal forms advanced usage"
   ↓

2. ANGULAR FRONTEND (POST /api/research/chat)
   ↓
   ResearchChatComponent.sendMessage()
     → ResearchService.startResearch(query, userId, 'detailed')
     → Returns: { executionId: 'research-1762817050670', streamUrl: '...' }
   ↓

3. SSE CONNECTION (GET /api/research/stream/:executionId)
   ↓
   ResearchChatComponent.streamWorkflow(executionId)
     → Opens EventSource connection
     → Listens for: 'workflow-update' | 'tool-execution' | 'interrupt' | 'workflow_complete'
   ↓

4. BACKEND - ResearcherAgent.executeWithStreaming()
   ↓
   const stream = workflowExecutionService.streamWorkflow(
     ResearcherAgent,
     initialState,
     { streamMode: 'updates' }  // 🔑 KEY: 'updates' mode shows tools!
   );
   ↓

5. LANGGRAPH EXECUTION
   ↓
   StateGraph → parseQuery → conductResearch (calls tools) → generateReportDraft → saveReport

   With 'updates' mode, yields:
   { 'parseQuery': { metadata: {...} } }
   { 'tools': { messages: [ToolMessage] } }  // 🔑 Tool execution event!
   { 'conductResearch': { metadata: {...} } }
   { 'tools': { messages: [ToolMessage] } }  // Another tool call
   ...
   ↓

6. EVENT TRANSFORMATION (ResearcherAgent)
   ↓
   For each update from stream:
     - If nodeName === 'tools' → emit { type: 'tool-execution', toolData }
     - Else → emit { type: 'workflow-update', nodeName, state }
   ↓

7. SSE STREAM (ResearchChatController)
   ↓
   Observable → SSE events:
     - event: workflow-update
     - event: tool-execution  // 🔑 New event type!
     - event: interrupt
     - event: workflow_complete
   ↓

8. ANGULAR FRONTEND (EventSource handlers)
   ↓
   ResearchService.streamWorkflow():
     - 'workflow-update' → { type: 'state_update', nodeName, state }
     - 'tool-execution' → { type: 'tool_execution', toolData }
   ↓

9. UI DISPLAY (ResearchChatComponent)
   ↓
   handleStreamEvent(event):
     switch(event.type) {
       case 'state_update':
         → "▶️ Parse Query running..."
       case 'tool_execution':
         → "🔧 Tool: Web Search"
         → "   Input: \"angular signal forms\""
         → "   Result: Found 10 result(s)"
       case 'interrupt':
         → Show approval modal
       case 'workflow_complete':
         → "✅ Report saved: angular-signal-forms-2025-01-11.md"
     }
```

---

## Key Implementation Details

### 1. Backend - Agent Streaming (ResearcherAgent)

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`

```typescript
async *executeWithStreaming(input: { ... }): AsyncGenerator<...> {
  const stream = this.workflowExecutionService.streamWorkflow(
    ResearcherAgent,
    initialState,
    {
      configurable: { thread_id: executionId },
      streamMode: 'updates',  // 🔑 Shows individual node + tool events
    }
  );

  for await (const update of stream) {
    // LangGraph 'updates' returns: { nodeName: stateUpdate }
    const nodeName = Object.keys(update)[0];
    const nodeData = update[nodeName];

    if (nodeName === 'tools') {
      // Tool execution event
      yield {
        type: 'tool-execution',
        executionId,
        toolData: nodeData,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Regular workflow node
      yield {
        type: 'workflow-update',
        executionId,
        nodeName,
        state: nodeData,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
```

**Key Points**:

- ✅ `streamMode: 'updates'` - Shows tool execution events
- ✅ Check `nodeName === 'tools'` to detect tool calls
- ✅ Emit different event types for tools vs nodes

---

### 2. Backend - SSE Controller (ResearchChatController)

**File**: `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`

```typescript
@Get('stream/:executionId')
@Sse()
streamWorkflow(@Param('executionId') executionId: string): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    const stream = this.activeStreams.get(executionId);
    if (!stream) {
      subscriber.error(new Error('Stream not found'));
      return;
    }

    (async () => {
      for await (const event of stream) {
        if (event.type === 'tool-execution') {
          // Tool execution event
          subscriber.next({
            type: 'message',
            data: JSON.stringify(event),
            event: 'tool-execution',  // 🔑 Custom SSE event type
          } as any);
        } else if (event.type === 'workflow-update') {
          // Node execution event
          subscriber.next({
            type: 'message',
            data: JSON.stringify(event),
            event: 'workflow-update',
          } as any);
        }
      }
      subscriber.complete();
    })();
  });
}
```

**Key Points**:

- ✅ Different SSE `event` types: `'tool-execution'` | `'workflow-update'`
- ✅ Frontend can listen to specific event types
- ✅ Auto-cleanup after stream completes

---

### 3. Frontend - Service (ResearchService)

**File**: `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts`

```typescript
export interface ResearchWorkflowEvent {
  type: 'state_update' | 'tool_execution' | 'interrupt' | 'workflow_complete' | 'error';
  timestamp: string;
  workflowId: string;
  nodeName?: string;
  state?: any;
  toolData?: {
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    messages?: any[];
  };
  error?: string;
}

streamWorkflow(executionId: string): Observable<ResearchWorkflowEvent> {
  return new Observable((observer) => {
    const eventSource = new EventSource(`/api/research/stream/${executionId}`);

    // Listen for workflow node events
    eventSource.addEventListener('workflow-update', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      observer.next({
        type: 'state_update',
        timestamp: data.timestamp,
        workflowId: executionId,
        nodeName: data.nodeName,
        state: data.state,
      });
    });

    // 🔑 Listen for tool execution events
    eventSource.addEventListener('tool-execution', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      const messages = data.toolData?.messages || [];
      const lastMessage = messages[messages.length - 1];

      observer.next({
        type: 'tool_execution',
        timestamp: data.timestamp,
        workflowId: executionId,
        toolData: {
          toolName: lastMessage?.name || 'unknown-tool',
          toolInput: lastMessage?.tool_calls?.[0]?.args,
          toolOutput: lastMessage?.content,
          messages: messages,
        },
      });
    });

    return () => eventSource.close();
  });
}
```

**Key Points**:

- ✅ Separate event listeners for `'workflow-update'` and `'tool-execution'`
- ✅ Extract tool name, input, output from LangGraph message structure
- ✅ Type-safe event interface for frontend

---

### 4. Frontend - Component (ResearchChatComponent)

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  type?: 'text' | 'status' | 'success' | 'error' | 'tool-execution';
  timestamp: Date;
  toolData?: { toolName?: string; toolInput?: any; toolOutput?: any; };
}

private handleStreamEvent(event: ResearchWorkflowEvent): void {
  switch (event.type) {
    case 'state_update':
      // Show node progress
      if (event.nodeName) {
        this.addStatusMessage(`▶️ ${this.formatTaskName(event.nodeName)} running...`);
      }
      break;

    case 'tool_execution':
      // 🔑 Display tool execution details
      this.handleToolExecution(event);
      break;

    case 'interrupt':
      this.showApprovalModal = true;
      break;

    case 'workflow_complete':
      this.addSuccessMessage('✅ Research complete!');
      break;
  }
}

private handleToolExecution(event: ResearchWorkflowEvent): void {
  const toolData = event.toolData;
  if (!toolData) return;

  const toolName = toolData.toolName || 'unknown-tool';
  let content = `🔧 Tool: ${this.formatToolName(toolName)}`;

  if (toolData.toolInput) {
    const inputSummary = this.formatToolInput(toolName, toolData.toolInput);
    content += `\n   Input: ${inputSummary}`;
  }

  if (toolData.toolOutput) {
    const outputSummary = this.formatToolOutput(toolName, toolData.toolOutput);
    content += `\n   Result: ${outputSummary}`;
  }

  this.addMessage({
    role: 'tool',
    content,
    type: 'tool-execution',
    timestamp: new Date(),
    toolData,
  });
}

private formatToolInput(toolName: string, input: any): string {
  switch (toolName) {
    case 'web-search':
    case 'research-search':
      return `"${input.query || input.search_query || ''}"`;
    case 'create-report':
      return `"${input.title || ''}"`;
    default:
      return JSON.stringify(input).substring(0, 100);
  }
}
```

**Key Points**:

- ✅ Tool-specific message formatting
- ✅ Display tool name, input, output in chat
- ✅ Visual distinction with `role: 'tool'` and emoji indicators

---

## Example UI Output

```
User:
"research angular signal forms advanced usage"

Assistant (status):
▶️ Parse Query running...

Assistant (status):
✅ Parse Query completed

Assistant (status):
▶️ Conduct Research running...

Tool (tool-execution):
🔧 Tool: Web Search
   Input: "angular signal forms advanced usage"
   Result: Found 10 result(s)

Tool (tool-execution):
🔧 Tool: Research Search
   Input: "angular reactive forms with signals"
   Result: Found 5 result(s)

Assistant (status):
📊 Found 15 research sources

Assistant (status):
✅ Conduct Research completed

Assistant (status):
▶️ Generate Report Draft running...

Assistant (status):
🛑 Report draft ready for review

[APPROVAL MODAL APPEARS]

User approves...

Assistant (status):
✅ Report approved - Saving...

Tool (tool-execution):
🔧 Tool: Save Report
   Input: "angular-signal-forms-2025-01-11.md"
   Result: Saved to reports/angular-signal-forms-2025-01-11.md

Assistant (success):
✅ Report saved: angular-signal-forms-2025-01-11.md
```

---

## Benefits of Tool Streaming

### For Users

- ✅ **Real-time Visibility**: See exactly what the agent is doing
- ✅ **Tool Transparency**: Understand which tools are being called and why
- ✅ **Progress Tracking**: Know when long-running operations (web searches) are happening
- ✅ **Debugging**: Identify issues if tools fail or return unexpected results

### For Developers

- ✅ **Easy Debugging**: See tool calls and responses in real-time
- ✅ **Performance Monitoring**: Track how long tools take to execute
- ✅ **Error Tracking**: Identify which tool failed and why
- ✅ **User Confidence**: Transparent operations build trust

---

## Comparison: 'values' vs 'updates' Mode

### `streamMode: 'values'` (Full State Snapshots)

```typescript
const stream = workflow.stream(input, { streamMode: 'values' });

// Yields:
{ messages: [...], metadata: { query: '...' } }  // After parseQuery
{ messages: [...], metadata: { searchResults: [...] } }  // After conductResearch
{ messages: [...], metadata: { reportDraft: '...' } }  // After generateReportDraft
```

**Pros**:

- Complete state at each step
- Easy to track workflow progress

**Cons**:

- ❌ NO tool execution visibility
- ❌ Can't see individual tool calls
- ❌ Missing granular execution details

### `streamMode: 'updates'` (Delta Updates + Tools) ✅ RECOMMENDED

```typescript
const stream = workflow.stream(input, { streamMode: 'updates' });

// Yields:
{ 'parseQuery': { metadata: { query: '...' } } }
{ 'tools': { messages: [ToolMessage] } }  // 🔑 Tool call!
{ 'conductResearch': { metadata: { searchResults: [...] } } }
{ 'tools': { messages: [ToolMessage] } }  // 🔑 Another tool call!
{ 'generateReportDraft': { metadata: { reportDraft: '...' } } }
```

**Pros**:

- ✅ Tool execution visibility
- ✅ Node-level execution tracking
- ✅ Granular progress updates
- ✅ Better debugging

**Cons**:

- Slightly more complex to handle (node name as key)

---

## Testing Tool Streaming

### 1. Start Backend Services

```bash
# Start Neo4j, ChromaDB, Redis
npm run dev:services

# Start API server
npx nx serve dev-brand-api
```

### 2. Start Frontend

```bash
npx nx serve dev-brand-ui
```

### 3. Open Browser

Navigate to `http://localhost:4200/research`

### 4. Send Research Query

```
"research angular signal forms advanced usage"
```

### 5. Watch Stream Events

**Console Output** (Chrome DevTools):

```javascript
Stream event: {
  type: 'state_update',
  nodeName: 'parseQuery',
  workflowId: 'research-...',
  state: { metadata: { query: '...' } }
}

Stream event: {
  type: 'tool_execution',
  workflowId: 'research-...',
  toolData: {
    toolName: 'web-search',
    toolInput: { query: 'angular signal forms' },
    toolOutput: { results: [...] }
  }
}
```

**UI Chat Display**:

```
▶️ Parse Query running...
✅ Parse Query completed
▶️ Conduct Research running...
🔧 Tool: Web Search
   Input: "angular signal forms"
   Result: Found 10 result(s)
```

---

## Troubleshooting

### Issue: No tool events appearing

**Check**:

1. Backend uses `streamMode: 'updates'` (not `'values'`)
2. Agent has tools configured in `@Agent({ tools: ['web-search', ...] })`
3. SSE controller emits `event: 'tool-execution'`
4. Frontend listens for `'tool-execution'` event type

### Issue: Tool data is undefined

**Check**:

1. Extract tool data from `update['tools']` node
2. Tool messages array is not empty
3. LangGraph message structure: `{ name, tool_calls, content }`

### Issue: Events arrive but UI doesn't update

**Check**:

1. Angular change detection triggered (use `ChangeDetectorRef.detectChanges()`)
2. Messages pushed to array: `this.messages.push(...)`
3. Component template binding: `*ngFor="let msg of messages"`

---

## Conclusion

Tool streaming provides **real-time transparency** into agent execution, showing users exactly what tools are being called and what results they return. This enhances:

- **User Trust**: Users see what's happening behind the scenes
- **Debugging**: Developers can trace tool execution in real-time
- **UX**: Progressive disclosure keeps users engaged during long operations

By using `streamMode: 'updates'`, the ResearcherAgent workflow now streams both workflow state updates AND tool execution events to the Angular UI, creating a fully transparent, real-time research experience.
