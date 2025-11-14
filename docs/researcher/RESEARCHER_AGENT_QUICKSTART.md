# 🚀 ResearcherAgent - Quick Start Guide

**Ready to use in 3 minutes!**

---

## ✅ What's Been Implemented

- ✅ Backend: ResearcherAgent with streaming + HITL
- ✅ Frontend: Research Chat UI with real-time updates
- ✅ Routing: Fully configured in app.routes.ts
- ✅ Navigation: Added to floating menu (🚀 button)
- ✅ Documentation: Complete implementation guide

---

## 🎯 Quick Start (3 Steps)

### **Step 1: Start Services** (1 min)

```bash
# Terminal 1: Start database services
npm run dev:services

# Terminal 2: Start backend API
npx nx serve dev-brand-api

# Terminal 3: Start frontend UI
npx nx serve dev-brand-ui
```

Wait for: `✅ All services ready`

---

### **Step 2: Open Research Chat** (30 seconds)

**Option A: Via Navigation Menu**

1. Open browser: `http://localhost:4200`
2. Click 🚀 floating button (top-left)
3. Select "🔬 Research Chat"

**Option B: Direct Link**

- Navigate to: `http://localhost:4200/research-chat`

---

### **Step 3: Test Research Flow** (1 min 30 sec)

1. **Type a query:**

   ```
   Research AI agent frameworks in 2025
   ```

2. **Watch real-time streaming:**

   - ✅ Query parsed
   - 🔍 Conducting research...
   - ✅ Research completed - Found X sources
   - 📄 Generating report draft...
   - 🛑 **Workflow paused - Approval required**

3. **Review & Approve:**

   - Modal appears with report preview
   - Scroll through markdown report
   - Click "✅ Approve & Save"

4. **Verify Success:**

   ```bash
   ls reports/
   # Should show: research-ai-agent-frameworks-in-2025.md

   cat reports/research-ai-agent-frameworks-in-2025.md
   # View the complete research report
   ```

---

## 🎨 What You'll See

### **Chat Interface**

```
┌──────────────────────────────────────────┐
│ 🔬 Research Chat                        │
│ Autonomous web research with AI-powered  │
│ analysis                                 │
├──────────────────────────────────────────┤
│                                          │
│  👤 You                      12:30 PM    │
│  Research AI agent frameworks in 2025    │
│                                          │
│  🤖 ResearcherAgent          12:30 PM    │
│  ✅ Query parsed - Topic: "AI agent...  │
│                                          │
│  🤖 ResearcherAgent          12:30 PM    │
│  🔍 Conducting research...               │
│                                          │
│  🤖 ResearcherAgent          12:31 PM    │
│  ✅ Research completed - Found 8 sources │
│                                          │
│  🤖 ResearcherAgent          12:31 PM    │
│  📄 Generating report draft...           │
│                                          │
│  🤖 ResearcherAgent          12:32 PM    │
│  🛑 Report draft ready for review        │
│                                          │
├──────────────────────────────────────────┤
│  [Type your research query...]      📤  │
└──────────────────────────────────────────┘
```

### **Approval Modal**

```
┌──────────────────────────────────────────┐
│ 🛑 Review Research Report          ✕   │
├──────────────────────────────────────────┤
│ 📄 Draft Preview                         │
│ Review the generated report below        │
│                                          │
│ ┌────────────────────────────────────┐ │
│ │ # Research Report: AI Agent        │ │
│ │   Frameworks in 2025               │ │
│ │                                    │ │
│ │ ## Executive Summary               │ │
│ │ AI agent frameworks have evolved...│ │
│ │                                    │ │
│ │ ## Key Findings                    │ │
│ │ 1. LangGraph dominates multi-agent │ │
│ │    orchestration...                │ │
│ │ ...                                │ │
│ └────────────────────────────────────┘ │
│                                          │
│           [❌ Reject]  [✅ Approve & Save]│
└──────────────────────────────────────────┘
```

---

## 📊 Example Research Queries

Try these queries:

1. **Technology Research:**

   ```
   Research serverless computing trends 2025
   ```

2. **Framework Comparison:**

   ```
   Compare LangGraph vs CrewAI vs AutoGen for multi-agent systems
   ```

3. **Academic Topic:**

   ```
   Research quantum computing applications in cryptography
   ```

4. **Industry Trends:**

   ```
   Analyze AI adoption trends in healthcare 2024-2025
   ```

5. **Technical Deep Dive:**
   ```
   Research vector database performance benchmarks
   ```

---

## 🔧 Troubleshooting

### **Issue: "Failed to start research"**

**Solution:**

```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check environment variables
cat .env | grep TAVILY_API_KEY
cat .env | grep OPENAI_API_KEY
```

### **Issue: "Stream connection lost"**

**Solution:**

```bash
# Check Redis is running (required for checkpointing)
npm run dev:logs

# Restart backend
npx nx serve dev-brand-api
```

### **Issue: "Report not saving"**

**Solution:**

```bash
# Check reports directory exists
ls -la reports/

# Check file permissions
chmod 755 reports/

# Check disk space
df -h
```

### **Issue: Navigation button not visible**

**Solution:**

- Check browser console for errors
- Verify ShowcaseNavigationComponent is imported in app.component.ts
- Clear browser cache and reload

---

## 📁 File Locations

### **Backend**

```
apps/dev-brand-api/src/app/
├── business-workflows/
│   ├── agents/
│   │   └── researcher.agent.ts           ← Main agent
│   ├── core/tools/
│   │   ├── file-operation.tools.ts       ← File management
│   │   └── web-research.tools.ts         ← Tavily integration
│   └── controllers/
│       └── research-chat.controller.ts   ← REST + SSE endpoints
└── app.module.ts                          ← Registration
```

### **Frontend**

```
apps/dev-brand-ui/src/app/
├── features/research-chat/
│   ├── research-chat.component.ts        ← Main component
│   ├── research-chat.component.html      ← Template
│   ├── research-chat.component.scss      ← Styles
│   ├── services/
│   │   └── research.service.ts           ← HTTP + SSE service
│   └── components/
│       └── approval-modal.component.ts   ← HITL modal
├── shared/navigation/
│   └── showcase-navigation.component.ts  ← Navigation menu
└── app.routes.ts                          ← Route config
```

### **Saved Reports**

```
reports/
├── README.md
└── research-*.md  ← Generated reports (YAML frontmatter + markdown)
```

---

## 🎯 Next Steps

1. **Customize Agent Behavior:**

   - Edit `researcher.agent.ts` workflow steps
   - Adjust research depth and source limits
   - Modify report generation prompts

2. **Add More Tools:**

   - Create new @Tool methods in file-operation.tools.ts
   - Register in WorkflowEngineModule tools array
   - Use in ResearcherAgent workflow

3. **Enhance UI:**

   - Add markdown rendering for messages
   - Implement report history sidebar
   - Add export formats (PDF, DOCX)

4. **Production Deployment:**
   - Configure environment variables
   - Set up persistent storage for reports
   - Enable authentication/authorization
   - Add rate limiting for API endpoints

---

## 📚 Additional Resources

- **Full Documentation:** `RESEARCHER_AGENT.md`
- **Architecture Deep Dive:** See "Architecture" section in RESEARCHER_AGENT.md
- **API Documentation:** See "🔧 Configuration" section
- **Testing Guide:** See "🧪 Testing" section

---

## ✅ Success Checklist

- [ ] Services started (Neo4j, ChromaDB, Redis, API, UI)
- [ ] Accessed Research Chat via navigation menu
- [ ] Sent research query successfully
- [ ] Received real-time streaming updates
- [ ] Reviewed report in approval modal
- [ ] Approved and saved report
- [ ] Verified report exists in `reports/` directory
- [ ] Able to list and read saved reports

---

**Status:** ✅ Fully Operational
**Support:** See RESEARCHER_AGENT.md for detailed troubleshooting
**Last Updated:** 2025-11-10

🎉 **Enjoy your autonomous research agent!** 🎉
