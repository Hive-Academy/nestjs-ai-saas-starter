# 🔬 ResearcherAgent - Autonomous Web Research with HITL

**Status:** ✅ Fully Implemented
**Type:** Standalone Agent (Zero Multi-Agent Dependencies)
**Architecture:** @Agent decorator with workflow-agent type

---

## 📋 Overview

The ResearcherAgent is a fully autonomous AI agent that:

- Conducts comprehensive web research using Tavily API
- Generates professional markdown research reports with LLM
- Streams real-time updates to Angular UI via Server-Sent Events (SSE)
- Requires human approval before saving reports (HITL pattern)
- Saves approved reports locally as markdown files with YAML frontmatter

**Key Achievement:** This demonstrates @Agent decorator usage as a **standalone agent** completely independent of multi-agent orchestration (TASK_2025_043).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER (Angular UI)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ResearchChatComponent                                 │  │
│  │  - Chat Interface                                     │  │
│  │  - Real-time Streaming (SSE)                          │  │
│  │  - Approval Modal (HITL)                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP + SSE
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (NestJS API)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ResearchChatController                                │  │
│  │  POST /api/research/chat       - Start workflow       │  │
│  │  GET  /api/research/stream/:id - SSE streaming        │  │
│  │  POST /api/research/approve/:id - Resume with approval│  │
│  │  GET  /api/research/reports    - List saved reports   │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ResearcherAgent (@Agent standalone)                   │  │
│  │                                                        │  │
│  │ Workflow Steps:                                        │  │
│  │ 1. parseQuery     - Extract research parameters       │  │
│  │ 2. conductResearch - Web search via Tavily            │  │
│  │ 3. generateReport Draft - LLM generates markdown      │  │
│  │    🛑 INTERRUPT   - Wait for user approval            │  │
│  │ 4. saveReport     - Save to filesystem                │  │
│  └─────────┬──────────────────────────┬──────────────────┘  │
│            │                           │                     │
│            ▼                           ▼                     │
│  ┌─────────────────┐      ┌─────────────────────────┐      │
│  │ WebResearchTools│      │ FileOperationTools      │      │
│  │ - Tavily Search │      │ - Create/save reports   │      │
│  │ - Multi-source  │      │ - YAML frontmatter      │      │
│  │ - Synthesis     │      │ - Local filesystem      │      │
│  └─────────────────┘      └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Implementation Files

### **Backend (NestJS)**

1. **ResearcherAgent** - `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`

   - @Agent decorator with workflow-agent type
   - 4-step workflow: parseQuery → conductResearch → generateReportDraft → saveReport
   - HITL interruption after report generation
   - Streaming and checkpointing enabled

2. **FileOperationTools** - `apps/dev-brand-api/src/app/business-workflows/core/tools/file-operation.tools.ts`

   - @Tool decorators: create-report, save-report, list-reports, read-report
   - YAML frontmatter support for metadata
   - Automatic filename generation (slugified titles)
   - Local filesystem management

3. **ResearchChatController** - `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`

   - POST /api/research/chat - Start research workflow
   - GET /api/research/stream/:workflowId - SSE streaming
   - POST /api/research/approve/:workflowId - HITL approval/rejection
   - GET /api/research/reports - List all reports
   - GET /api/research/reports/:filename - Read specific report

4. **AppModule** - `apps/dev-brand-api/src/app/app.module.ts`
   - Registered ResearcherAgent provider
   - Registered FileOperationTools in WorkflowEngineModule
   - Registered ResearchChatController

### **Frontend (Angular)**

5. **ResearchService** - `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts`

   - HTTP client for API calls
   - EventSource for SSE streaming
   - Methods: startResearch, streamWorkflow, approveReport, listReports

6. **ResearchChatComponent** - `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`

   - Chat interface with message history
   - Real-time streaming updates
   - Approval modal trigger on HITL interrupt
   - Standalone component (no module required)

7. **ApprovalModalComponent** - `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts`

   - Modal dialog for report preview
   - Approve/Reject buttons
   - Markdown report preview with scrolling

8. **Styles** - `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss`
   - Modern gradient design
   - Smooth animations
   - Responsive chat interface

---

## 🚀 Usage Guide

### **1. Start the Backend**

```bash
# Ensure services are running
npm run dev:services  # Starts Neo4j, ChromaDB, Redis

# Start dev-brand-api
npx nx serve dev-brand-api
```

### **2. Start the Frontend**

```bash
# Start dev-brand-ui
npx nx serve dev-brand-ui
```

### **3. Access Research Chat**

**Option 1: Via Navigation Menu**

- Click the 🚀 floating navigation button (top-left)
- Select "🔬 Research Chat" from the dropdown

**Option 2: Direct URL**

- Navigate to: `http://localhost:4200/research-chat`

**Routing configured in:**

- `apps/dev-brand-ui/src/app/app.routes.ts`
- `apps/dev-brand-ui/src/app/shared/navigation/showcase-navigation.component.ts`

### **4. Test the Workflow**

1. **Send Research Query:**

   ```
   Research AI agent frameworks in 2025
   ```

2. **Watch Real-Time Updates:**

   - ✅ Query parsed
   - ✅ Research completed (X sources found)
   - ✅ Report draft generated
   - 🛑 Workflow paused - Approval required

3. **Review Report Draft:**

   - Modal appears with markdown preview
   - Scroll through generated report

4. **Approve or Reject:**

   - Click "Approve & Save" → Report saves to `reports/`
   - Click "Reject" → Workflow terminates

5. **Verify Saved Report:**
   ```bash
   ls reports/
   cat reports/research-ai-agent-frameworks-in-2025.md
   ```

---

## 📊 Example Flow

```typescript
// User Input
query: "Research LangGraph multi-agent patterns"

// Step 1: parseQuery (streaming)
✅ Query parsed - Topic: "LangGraph multi-agent patterns"

// Step 2: conductResearch (streaming)
🔍 Conducting research...
✅ Research completed - Found 8 sources

// Step 3: generateReportDraft (streaming)
📄 Generating report draft...
✅ Report draft generated (3247 chars)
🛑 Workflow interrupted - Awaiting user approval

// HITL Modal Appears
┌─────────────────────────────────────────┐
│ 🛑 Review Research Report               │
├─────────────────────────────────────────┤
│ # Research Report: LangGraph Multi-     │
│   Agent Patterns                        │
│                                         │
│ ## Executive Summary                    │
│ LangGraph provides multiple...         │
│ ...                                     │
│                                         │
│ [❌ Reject] [✅ Approve & Save]        │
└─────────────────────────────────────────┘

// User Approves
POST /api/research/approve/:workflowId { approved: true }

// Step 4: saveReport (streaming)
💾 Saving approved report...
✅ Report saved: research-langgraph-multi-agent-patterns.md

// Final Output
Report successfully saved to: research-langgraph-multi-agent-patterns.md
```

---

## 🔧 Configuration

### **Environment Variables**

Required in `.env`:

```bash
OPENAI_API_KEY=your_key           # For LLM report generation
TAVILY_API_KEY=your_key           # For web research
REDIS_URL=redis://localhost:6379  # For workflow checkpointing
```

### **Agent Configuration**

From `researcher.agent.ts:44-70`:

```typescript
@Agent({
  description: 'Autonomous research agent with web search and report generation',
  type: 'workflow-agent',  // Internal workflow with @Entrypoint/@Task
  tools: ['web-search', 'research-search', 'create-report', 'save-report'],
  workflow: {
    name: 'researcher-workflow',
    type: 'functional-task',     // Linear workflow
    streaming: true,              // Enable SSE streaming
    confidenceThreshold: 0.7,
    enableInternalCheckpointing: true,  // Required for HITL
    internalTimeout: 180000,      // 3 minutes
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateReportDraft'],  // Pause here for HITL
    },
  },
})
```

---

## 🧪 Testing

### **Manual E2E Test**

1. **Start Services:**

   ```bash
   npm run dev:services
   npx nx serve dev-brand-api
   npx nx serve dev-brand-ui
   ```

2. **Navigate to Chat:**
   `http://localhost:4200/research-chat`

3. **Send Query:**

   ```
   Research serverless computing trends 2025
   ```

4. **Verify Streaming:**

   - Check browser DevTools → Network → stream/:workflowId
   - Should show EventStream connection
   - Events should appear in real-time

5. **Test Approval:**

   - Wait for approval modal
   - Click "Approve & Save"
   - Verify success message

6. **Check Saved Report:**
   ```bash
   ls reports/
   cat reports/research-serverless-computing-trends-2025.md
   ```

### **API Testing (Postman/cURL)**

```bash
# 1. Start research
curl -X POST http://localhost:3000/api/research/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "Research quantum computing applications",
    "researchDepth": "detailed"
  }'

# Response: { "workflowId": "abc123", "status": "started" }

# 2. Stream workflow (use browser or EventSource client)
curl -N http://localhost:3000/api/research/stream/abc123

# 3. Approve report
curl -X POST http://localhost:3000/api/research/approve/abc123 \
  -H "Content-Type: application/json" \
  -d '{ "approved": true }'

# 4. List reports
curl http://localhost:3000/api/research/reports

# 5. Read specific report
curl http://localhost:3000/api/research/reports/research-quantum-computing-applications.md
```

---

## 📈 Success Metrics

✅ **Backend Implementation:**

- FileOperationTools with 4 @Tool methods
- ResearcherAgent with 4 workflow steps
- ResearchChatController with 5 endpoints
- Registered in AppModule

✅ **Frontend Implementation:**

- ResearchService with SSE support
- ResearchChatComponent with streaming UI
- ApprovalModalComponent for HITL
- Modern gradient design

✅ **Key Features:**

- Real-time streaming via SSE
- Human-in-the-loop approval pattern
- Local report persistence with metadata
- Zero multi-agent dependencies (standalone)

✅ **Production-Ready:**

- Error handling in all components
- Loading states and user feedback
- Proper TypeScript types
- Comprehensive logging

---

## 🔮 Future Enhancements

1. **Report Export Formats:**

   - PDF generation
   - HTML export
   - DOCX conversion

2. **Enhanced Search:**

   - Custom search filters
   - Source credibility weighting
   - Academic paper integration

3. **Collaborative Features:**

   - Share reports with team
   - Comment on report sections
   - Version control for reports

4. **Analytics:**
   - Track research topics
   - Popular queries dashboard
   - Source quality metrics

---

## 🎯 Key Learnings

1. **@Agent is Versatile:**

   - Works standalone (this implementation)
   - Works in multi-agent systems (after TASK_2025_043)
   - Same decorator, dual purpose

2. **Streaming + HITL Integration:**

   - SSE enables real-time user experience
   - HITL adds quality control gate
   - Checkpoint enables workflow resumption

3. **Clean Separation:**
   - ResearcherAgent completely independent of multi-agent refactor
   - Zero conflicts with TASK_2025_043
   - Demonstrates incremental feature development

---

## 📞 Support

For issues or questions:

1. Check logs: `apps/dev-brand-api/logs/`
2. Verify services: `npm run dev:logs`
3. Test API endpoints: `curl http://localhost:3000/api/research/reports`

---

**Status:** ✅ Ready for Production
**Last Updated:** 2025-11-10
**Maintained By:** AI SaaS Starter Team
