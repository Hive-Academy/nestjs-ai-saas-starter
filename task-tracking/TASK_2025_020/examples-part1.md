
## 5. Integration Examples

This section provides **25+ complete, production-ready integration examples** demonstrating all library features. Each example includes workflow definitions, component implementations, templates, event handling, and bootstrap configuration.

### Category 1: Basic Integration

#### Example 1: Simple Workflow Execution

**Demonstrates:** Basic workflow execution, default components, event subscription, state management, error handling, WorkflowVisualizer usage, protocol service integration, signal-based reactivity

**Workflow Definition:**

```typescript
import { z } from 'zod';
import { WorkflowDefinition } from '@hive-academy/angular-langgraph-components';

export const SimpleTaskWorkflow: WorkflowDefinition<SimpleTaskInput, SimpleTaskOutput> = {
  id: 'simple-task',
  name: 'Simple Task Executor',
  description: 'Executes a basic task with AI assistance',
  endpoint: '/simple-task',
  inputSchema: z.object({
    task: z.string().min(5, 'Task must be at least 5 characters'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    userId: z.string().uuid()
  }),
  outputSchema: z.object({
    result: z.string(),
    executionTime: z.number(),
    status: z.enum(['success', 'failed', 'partial'])
  }),
  metadata: {
    agents: [
      { id: 'analyzer', name: 'Task Analyzer', description: 'Analyzes task complexity' },
      { id: 'executor', name: 'Task Executor', description: 'Executes the task' },
      { id: 'validator', name: 'Result Validator', description: 'Validates output quality' }
    ]
  }
};

// Type definitions
type SimpleTaskInput = z.infer<typeof SimpleTaskWorkflow.inputSchema>;
type SimpleTaskOutput = z.infer<typeof SimpleTaskWorkflow.outputSchema>;
```

**Component Implementation:**

```typescript
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  WorkflowVisualizerComponent,
  LangGraphConnectionService,
  LangGraphProtocolService,
  WorkflowExecution,
  WorkflowEvent
} from '@hive-academy/angular-langgraph-components';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-simple-task',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WorkflowVisualizerComponent
  ],
  template: `
    <div class="simple-task-container">
      <h2>Simple Task Executor</h2>

      <!-- Input Form -->
      <div class="task-form">
        <label>
          Task Description:
          <input
            type="text"
            [(ngModel)]="taskInput"
            placeholder="Describe your task..."
            [disabled]="isExecuting()"
          />
        </label>

        <label>
          Priority:
          <select [(ngModel)]="priority" [disabled]="isExecuting()">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <button
          (click)="startTask()"
          [disabled]="!taskInput || isExecuting()"
          class="btn-primary"
        >
          {{ isExecuting() ? 'Executing...' : 'Start Task' }}
        </button>
      </div>

      <!-- Workflow Visualization -->
      @if (execution()) {
        <lg-workflow-visualizer
          [workflowId]="'simple-task'"
          class="workflow-display"
        />
      }

      <!-- Execution Status -->
      @if (executionStatus()) {
        <div class="status-panel" [class.error]="executionStatus() === 'error'">
          <h3>Status: {{ executionStatus() }}</h3>
          @if (result()) {
            <div class="result-display">
              <p><strong>Result:</strong> {{ result()?.result }}</p>
              <p><strong>Execution Time:</strong> {{ result()?.executionTime }}ms</p>
              <p><strong>Status:</strong> {{ result()?.status }}</p>
            </div>
          }
        </div>
      }

      <!-- Event Log -->
      @if (events().length > 0) {
        <div class="event-log">
          <h3>Event Log</h3>
          <ul>
            @for (event of events(); track event.timestamp) {
              <li>{{ event.timestamp | date:'short' }}: {{ event.type }} - {{ event.data }}</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .simple-task-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .task-form {
      background: #f5f5f5;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .task-form label {
      display: block;
      margin-bottom: 16px;
    }

    .task-form input,
    .task-form select {
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .btn-primary {
      background: #1976d2;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .workflow-display {
      margin: 24px 0;
    }

    .status-panel {
      background: #e8f5e9;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .status-panel.error {
      background: #ffebee;
    }

    .result-display p {
      margin: 8px 0;
    }

    .event-log {
      background: #fafafa;
      padding: 16px;
      border-radius: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .event-log ul {
      list-style: none;
      padding: 0;
    }

    .event-log li {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
  `]
})
export class SimpleTaskComponent {
  private connection = inject(LangGraphConnectionService);
  private protocol = inject(LangGraphProtocolService);

  // Form inputs
  taskInput = '';
  priority: 'low' | 'medium' | 'high' = 'medium';

  // State signals
  execution = signal<WorkflowExecution | null>(null);
  isExecuting = signal(false);
  executionStatus = signal<string>('');
  result = signal<SimpleTaskOutput | null>(null);
  events = signal<Array<{ type: string; data: any; timestamp: Date }>>([]);

  startTask(): void {
    if (!this.taskInput) return;

    this.isExecuting.set(true);
    this.executionStatus.set('starting');
    this.events.set([]);

    const input: SimpleTaskInput = {
      task: this.taskInput,
      priority: this.priority,
      userId: 'user-123' // In production, get from auth service
    };

    // Start workflow execution
    this.connection.startWorkflow<SimpleTaskInput, SimpleTaskOutput>('simple-task', input)
      .subscribe({
        next: (exec) => {
          this.execution.set(exec);
          this.executionStatus.set('executing');
          this.subscribeToEvents(exec.id);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
  }

  private subscribeToEvents(executionId: string): void {
    // Subscribe to workflow events
    this.protocol.events$.pipe(
      filter(event => event.executionId === executionId)
    ).subscribe({
      next: (event: WorkflowEvent) => {
        this.addEvent(event.type, event.payload);

        // Handle specific event types
        switch (event.type) {
          case 'workflow:started':
            this.executionStatus.set('running');
            break;
          case 'workflow:completed':
            this.handleCompletion(event.payload);
            break;
          case 'workflow:failed':
            this.handleError(event.payload);
            break;
          case 'agent:started':
            this.executionStatus.set(`Agent ${event.payload.agentId} started`);
            break;
        }
      },
      error: (error) => {
        this.handleError(error);
      }
    });
  }

  private handleCompletion(data: any): void {
    this.result.set(data.output);
    this.executionStatus.set('completed');
    this.isExecuting.set(false);
  }

  private handleError(error: any): void {
    console.error('Workflow error:', error);
    this.executionStatus.set('error');
    this.isExecuting.set(false);
    this.addEvent('error', error.message || 'Unknown error');
  }

  private addEvent(type: string, data: any): void {
    this.events.update(events => [
      ...events,
      { type, data, timestamp: new Date() }
    ]);
  }
}
```

**Bootstrap Configuration:**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideLangGraph, provideLangGraphWorkflow } from '@hive-academy/angular-langgraph-components';
import { SimpleTaskWorkflow } from './workflows/simple-task.workflow';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLangGraph({
      apiUrl: 'https://api.example.com',
      enableLogging: true
    }),
    provideLangGraphWorkflow(SimpleTaskWorkflow)
  ]
};
```

---
