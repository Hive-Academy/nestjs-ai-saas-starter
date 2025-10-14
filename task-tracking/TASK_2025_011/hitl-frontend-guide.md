# HITL (Human-in-the-Loop) Frontend Integration Guide

## Overview

The DevBrand workflow now includes **automatic approval requests** at the end of each agent's execution. Users can validate results, request changes, or provide feedback before the workflow proceeds to the next agent.

This guide covers:

1. **Approval Requests** - Automatic pauses at the end of each agent
2. **User Interruptions** - Manual pauses initiated by users anytime during execution
3. **Frontend Implementation** - React/Vue/vanilla JS examples
4. **WebSocket Event Handling** - Real-time approval notifications

---

## Architecture: Approval Workflow

```
User: POST /devbrand/execute → executionId returned
  ↓
Agent 1 (GitHubCodeAnalyzer) executes
  ↓ (finalizeAnalysis completes)
WebSocket: 'interruption_request' event (approval needed)
  ↓
Frontend: Show approval UI
  ↓
User: Approve / Reject / Modify
  ↓
Backend: Process approval response
  ↓
WebSocket: 'interruption_resolved' event
  ↓
Agent 2 (PersonalBrandStrategist) executes
  ↓ (generateFinalStrategy completes)
WebSocket: 'interruption_request' event
  ↓
[repeat for Agent 3 (ContentCreator)]
```

---

## Approval Events

### Event 1: interruption_request

**Triggered**: When an agent completes and requires user approval

**Payload**:

```typescript
{
  type: 'interruption_request',
  data: {
    interruptionId: string;        // Unique interruption ID
    executionId: string;           // Workflow execution ID
    agentId: string;               // Which agent (e.g., 'github-code-analyzer')
    message: string;               // Human-readable approval message
    metadata: {
      // Agent-specific metadata
      achievementCount?: number;   // For GitHubCodeAnalyzer
      repositoriesAnalyzed?: number;
      strategyType?: string;       // For PersonalBrandStrategist
      brandScore?: number;
      linkedinLength?: number;     // For ContentCreator
      devtoLength?: number;
      confidenceScore?: number;
    };
    timeout: number;               // Timeout in milliseconds
    createdAt: string;             // ISO timestamp
  }
}
```

**Example**:

```json
{
  "type": "interruption_request",
  "data": {
    "interruptionId": "hitl-abc123",
    "executionId": "devbrand-1697456789",
    "agentId": "github-code-analyzer",
    "message": "GitHub analysis complete for johnsmith. Found 15 achievements. Please review and approve to continue.",
    "metadata": {
      "achievementCount": 15,
      "repositoriesAnalyzed": 8,
      "confidenceScore": 0.95
    },
    "timeout": 120000,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Event 2: interruption_resolved

**Triggered**: When user responds to approval request

**Payload**:

```typescript
{
  type: 'interruption_resolved',
  data: {
    interruptionId: string;
    executionId: string;
    resolution: 'approved' | 'rejected' | 'modified';
    feedback?: string;          // Optional user feedback
    modifiedData?: any;         // Optional modified data
    resolvedAt: string;         // ISO timestamp
  }
}
```

---

## Approval Decision Flow

### Agent 1: GitHubCodeAnalyzer

**Approval Point**: After analyzing repositories and extracting achievements
**Timeout**: 2 minutes
**User Can**:

- Review achievements list
- Validate technologies detected
- Request re-analysis with different parameters
- Approve to continue to brand strategy

### Agent 2: PersonalBrandStrategist

**Approval Point**: After generating brand strategy
**Timeout**: 3 minutes (longer for strategy review)
**User Can**:

- Review brand positioning and strategy
- Request strategy revisions
- Provide additional guidance
- Approve to continue to content creation

### Agent 3: ContentCreator

**Approval Point**: After generating platform content
**Timeout**: 5 minutes (longest for content review)
**User Can**:

- Review LinkedIn and Dev.to content
- Request content modifications
- Change tone or messaging
- Approve for final delivery

---

## Frontend Implementation

### React Implementation

```typescript
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ApprovalRequest {
  interruptionId: string;
  executionId: string;
  agentId: string;
  message: string;
  metadata: any;
  timeout: number;
  createdAt: string;
}

interface WorkflowState {
  executionId: string | null;
  currentAgent: string | null;
  pendingApproval: ApprovalRequest | null;
  approvalHistory: Array<{ agent: string; resolution: string; timestamp: string }>;
  workflowComplete: boolean;
}

export function useDevBrandWorkflowWithHITL(githubUsername: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<WorkflowState>({
    executionId: null,
    currentAgent: null,
    pendingApproval: null,
    approvalHistory: [],
    workflowComplete: false,
  });
  const [tokens, setTokens] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Start workflow
  const startWorkflow = async () => {
    try {
      const response = await fetch('http://localhost:3000/devbrand/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUsername }),
      });

      const data = await response.json();
      setState((prev) => ({ ...prev, executionId: data.executionId }));

      // Connect to WebSocket
      const newSocket = io(data.websocketUrl, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to WebSocket');
        newSocket.emit('subscribe_execution', { executionId: data.executionId });
      });

      // Handle workflow state changes
      newSocket.on('stream_update', (event) => {
        const update = event.data.update;
        if (update.metadata?.nodeId) {
          setState((prev) => ({ ...prev, currentAgent: update.metadata.nodeId }));
        }
      });

      // Handle token streaming
      newSocket.on('token_update', (event) => {
        setTokens((prev) => [...prev, event.data.token]);
      });

      // Handle approval requests (HITL)
      newSocket.on('interruption_request', (event) => {
        console.log('🤔 Approval required:', event.data);
        setState((prev) => ({
          ...prev,
          pendingApproval: event.data,
          currentAgent: event.data.agentId,
        }));
      });

      // Handle approval resolutions
      newSocket.on('interruption_resolved', (event) => {
        console.log('✅ Approval resolved:', event.data);
        setState((prev) => ({
          ...prev,
          pendingApproval: null,
          approvalHistory: [
            ...prev.approvalHistory,
            {
              agent: prev.currentAgent || 'unknown',
              resolution: event.data.resolution,
              timestamp: event.data.resolvedAt,
            },
          ],
        }));
      });

      // Handle errors
      newSocket.on('error', (event) => {
        console.error('❌ Workflow error:', event.data);
        setError(event.data.message || 'Workflow error');
      });

      // Handle workflow completion
      newSocket.on('stream_update', (event) => {
        if (event.data.update.data?.status === 'completed') {
          setState((prev) => ({ ...prev, workflowComplete: true }));
        }
      });

      setSocket(newSocket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow');
    }
  };

  // Approve current request
  const approve = async (feedback?: string) => {
    if (!state.pendingApproval || !socket) return;

    try {
      const response = await fetch('http://localhost:3000/hitl/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interruptionId: state.pendingApproval.interruptionId,
          decision: 'approved',
          feedback,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      console.log('✅ Approval sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  // Reject current request
  const reject = async (reason?: string) => {
    if (!state.pendingApproval || !socket) return;

    try {
      const response = await fetch('http://localhost:3000/hitl/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interruptionId: state.pendingApproval.interruptionId,
          decision: 'rejected',
          feedback: reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      console.log('❌ Rejection sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  // Request modification
  const requestModification = async (modificationRequest: string) => {
    if (!state.pendingApproval || !socket) return;

    try {
      const response = await fetch('http://localhost:3000/hitl/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interruptionId: state.pendingApproval.interruptionId,
          decision: 'modified',
          feedback: modificationRequest,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request modification');
      }

      console.log('✏️ Modification request sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request modification');
    }
  };

  // User-initiated interruption
  const interruptWithQuestion = async (question: string) => {
    if (!socket || !state.executionId) return;

    try {
      const response = await fetch('http://localhost:3000/hitl/interrupt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId: state.executionId,
          question,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to interrupt');
      }

      console.log('⏸️ Interruption sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to interrupt');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return {
    startWorkflow,
    approve,
    reject,
    requestModification,
    interruptWithQuestion,
    state,
    tokens,
    error,
    isConnected: socket?.connected || false,
  };
}
```

### React Component Example

```tsx
import React from 'react';
import { useDevBrandWorkflowWithHITL } from './useDevBrandWorkflowWithHITL';

export function DevBrandWorkflow() {
  const [githubUsername, setGithubUsername] = React.useState('');
  const [feedback, setFeedback] = React.useState('');

  const { startWorkflow, approve, reject, requestModification, interruptWithQuestion, state, tokens, error, isConnected } = useDevBrandWorkflowWithHITL(githubUsername);

  // Render approval modal
  const renderApprovalModal = () => {
    if (!state.pendingApproval) return null;

    const { agentId, message, metadata, timeout } = state.pendingApproval;

    return (
      <div className="modal-overlay">
        <div className="approval-modal">
          <h2>🤔 Approval Required</h2>
          <div className="agent-badge">{agentId}</div>
          <p className="approval-message">{message}</p>

          {/* Agent-specific metadata display */}
          {agentId === 'github-code-analyzer' && (
            <div className="metadata">
              <p>✅ Achievements Found: {metadata.achievementCount}</p>
              <p>📂 Repositories Analyzed: {metadata.repositoriesAnalyzed}</p>
              <p>🎯 Confidence: {(metadata.confidenceScore * 100).toFixed(0)}%</p>
            </div>
          )}

          {agentId === 'personal-brand-strategist' && (
            <div className="metadata">
              <p>📊 Strategy Type: {metadata.strategyType}</p>
              <p>⭐ Brand Score: {(metadata.brandScore * 100).toFixed(0)}%</p>
            </div>
          )}

          {agentId === 'content-creator' && (
            <div className="metadata">
              <p>💼 LinkedIn: {metadata.linkedinLength} characters</p>
              <p>📝 Dev.to: {metadata.devtoLength} characters</p>
              <p>📈 Engagement Score: {(metadata.linkedinEngagement * 100).toFixed(0)}%</p>
            </div>
          )}

          <div className="timeout-indicator">⏱️ Timeout: {Math.floor(timeout / 1000 / 60)} minutes</div>

          <textarea placeholder="Optional feedback or modification request..." value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />

          <div className="action-buttons">
            <button onClick={() => approve(feedback)} className="btn-approve">
              ✅ Approve
            </button>
            <button onClick={() => requestModification(feedback)} className="btn-modify">
              ✏️ Request Changes
            </button>
            <button onClick={() => reject(feedback)} className="btn-reject">
              ❌ Reject
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render approval history
  const renderApprovalHistory = () => {
    if (state.approvalHistory.length === 0) return null;

    return (
      <div className="approval-history">
        <h3>Approval History</h3>
        {state.approvalHistory.map((approval, index) => (
          <div key={index} className="approval-item">
            <span className="agent">{approval.agent}</span>
            <span className={`resolution ${approval.resolution}`}>{approval.resolution}</span>
            <span className="timestamp">{new Date(approval.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="devbrand-workflow">
      <h1>DevBrand Workflow with HITL</h1>

      {!state.executionId ? (
        <div className="start-section">
          <input type="text" placeholder="GitHub Username" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} />
          <button onClick={startWorkflow} disabled={!githubUsername}>
            🚀 Start Workflow
          </button>
        </div>
      ) : (
        <div className="workflow-status">
          <div className="status-header">
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
            <span className="execution-id">Execution: {state.executionId}</span>
          </div>

          <div className="current-agent">
            Current Agent: <strong>{state.currentAgent || 'Initializing...'}</strong>
          </div>

          {/* Token streaming display */}
          <div className="token-stream">
            <h3>Live Output</h3>
            <div className="tokens">
              {tokens.join(' ')}
              <span className="cursor">|</span>
            </div>
          </div>

          {/* Approval history */}
          {renderApprovalHistory()}

          {/* User interruption */}
          <div className="interrupt-section">
            <button
              onClick={() => {
                const question = prompt('Ask a question:');
                if (question) interruptWithQuestion(question);
              }}
            >
              ⏸️ Interrupt with Question
            </button>
          </div>

          {error && <div className="error">❌ {error}</div>}

          {state.workflowComplete && <div className="completion-message">✅ Workflow Complete!</div>}
        </div>
      )}

      {/* Approval modal */}
      {renderApprovalModal()}
    </div>
  );
}
```

---

## REST API Endpoints (HITL)

### POST /hitl/approve

**Description**: Respond to an approval request

**Request**:

```typescript
{
  interruptionId: string;
  decision: 'approved' | 'rejected' | 'modified';
  feedback?: string;
  modifiedData?: any;
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  interruptionId: string;
  resolution: string;
  timestamp: string;
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/hitl/approve \
  -H "Content-Type: application/json" \
  -d '{
    "interruptionId": "hitl-abc123",
    "decision": "approved",
    "feedback": "Looks good, proceed with strategy"
  }'
```

### POST /hitl/interrupt

**Description**: User-initiated interruption (pause workflow to ask question)

**Request**:

```typescript
{
  executionId: string;
  question: string;
  nodeId?: string;  // Optional: specific agent to interrupt
}
```

**Response** (201 Created):

```typescript
{
  interruptionId: string;
  executionId: string;
  status: 'pending';
  message: string;
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/hitl/interrupt \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "devbrand-1697456789",
    "question": "Can you also include my open source contributions?"
  }'
```

---

## CSS Styling Example

```css
.approval-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.agent-badge {
  background: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  display: inline-block;
  font-size: 12px;
  margin-bottom: 16px;
}

.approval-message {
  font-size: 16px;
  margin: 16px 0;
  line-height: 1.6;
}

.metadata {
  background: #f3f4f6;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
}

.metadata p {
  margin: 8px 0;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.action-buttons button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-approve {
  background: #10b981;
  color: white;
}

.btn-approve:hover {
  background: #059669;
}

.btn-modify {
  background: #f59e0b;
  color: white;
}

.btn-modify:hover {
  background: #d97706;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover {
  background: #dc2626;
}

.approval-history {
  margin: 20px 0;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.approval-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 4px 0;
  background: white;
  border-radius: 6px;
}

.resolution.approved {
  color: #10b981;
  font-weight: 600;
}

.resolution.rejected {
  color: #ef4444;
  font-weight: 600;
}

.resolution.modified {
  color: #f59e0b;
  font-weight: 600;
}
```

---

## Testing

### Manual Testing with Browser Console

```javascript
// Connect to WebSocket
const socket = io('ws://localhost:8080/streaming', { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('✅ Connected');
  socket.emit('subscribe_execution', { executionId: 'devbrand-123' });
});

// Listen for approval requests
socket.on('interruption_request', (event) => {
  console.log('🤔 Approval required:', event.data);
});

// Respond to approval
fetch('http://localhost:3000/hitl/approve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interruptionId: 'hitl-abc123',
    decision: 'approved',
    feedback: 'Looks good!',
  }),
});
```

---

## Production Considerations

### 1. Authentication

Add JWT authentication to HITL endpoints:

```typescript
// Frontend: Include auth token
const response = await fetch('http://localhost:3000/hitl/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  },
  body: JSON.stringify({ interruptionId, decision }),
});
```

### 2. Timeout Handling

Display countdown timer for approval timeout:

```typescript
const [timeRemaining, setTimeRemaining] = useState(timeout);

useEffect(() => {
  if (!pendingApproval) return;

  const interval = setInterval(() => {
    setTimeRemaining((prev) => Math.max(0, prev - 1000));
  }, 1000);

  return () => clearInterval(interval);
}, [pendingApproval]);

// Display: "Time remaining: 1:45"
const minutes = Math.floor(timeRemaining / 60000);
const seconds = Math.floor((timeRemaining % 60000) / 1000);
```

### 3. Offline Support

Handle disconnections gracefully:

```typescript
socket.on('disconnect', (reason) => {
  console.warn('⚠️ Disconnected:', reason);

  if (reason === 'io server disconnect') {
    // Server disconnected, attempt reconnection
    socket.connect();
  }

  // Show UI notification
  showNotification('Connection lost. Attempting to reconnect...');
});
```

### 4. Multi-User Approval

If multiple users can approve:

```typescript
socket.on('interruption_resolved', (event) => {
  if (event.data.resolvedBy !== currentUserId) {
    showNotification(`Approval already handled by ${event.data.resolvedBy}`);
    closePendingApproval();
  }
});
```

---

## Summary

**HITL Integration Features:**

- ✅ Automatic approval requests at end of each agent
- ✅ User-initiated interruptions anytime during workflow
- ✅ Real-time WebSocket notifications
- ✅ Configurable timeouts per agent
- ✅ Rich metadata for informed decisions
- ✅ Approval history tracking
- ✅ Production-ready with auth, timeout, and offline support

**Next Steps:**

1. Implement the React component or Vue equivalent
2. Style the approval modal to match your design system
3. Add authentication to HITL endpoints
4. Test approval flow end-to-end
5. Add analytics/logging for approval decisions
