# dev-brand-ui

## Overview

Angular UI for the Dev Brand SaaS platform. Built with standalone components, signals, and TailwindCSS.

---

## Architecture

- **Components**: Standalone components (no NgModules)
- **State Management**: Signals for local state, RxJS for streams
- **Styling**: TailwindCSS utility classes
- **API Integration**: HttpClient + WebSocket for streaming

---

## Component Structure

### Standalone Component

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold">{{ title() }}</h1>
      <p>Count: {{ count() }}</p>
      <button (click)="increment()" class="btn-primary">Increment</button>
    </div>
  `,
})
export class DashboardComponent {
  title = signal('Dashboard');
  count = signal(0);

  increment() {
    this.count.update((c) => c + 1);
  }
}
```

---

## State Management

### Local State with Signals

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({...})
export class UserProfileComponent {
  user = signal<User | null>(null);
  isLoading = signal(false);

  // Computed signal
  displayName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : 'Guest';
  });

  loadUser(userId: string) {
    this.isLoading.set(true);
    this.userService.getUser(userId).subscribe(user => {
      this.user.set(user);
      this.isLoading.set(false);
    });
  }
}
```

### Global State with Services

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private _user = signal<User | null>(null);

  user = this._user.asReadonly();
  isAuthenticated = computed(() => this._user() !== null);

  login(user: User) {
    this._user.set(user);
  }

  logout() {
    this._user.set(null);
  }
}
```

---

## Workflow Streaming

### LangGraph Client Integration

```typescript
import { Component, signal } from '@angular/core';
import { LangGraphClient } from '@hive-academy/langgraph-client';

@Component({
  selector: 'app-chat',
  standalone: true,
  template: `
    <div class="chat-container">
      @for (msg of messages(); track msg.id) {
      <div class="message">{{ msg.content }}</div>
      } @if (isStreaming()) {
      <div class="loading">Thinking...</div>
      }
    </div>
  `,
})
export class ChatComponent {
  messages = signal<Message[]>([]);
  isStreaming = signal(false);

  constructor(private langGraph: LangGraphClient) {}

  sendMessage(content: string) {
    this.isStreaming.set(true);

    this.langGraph
      .streamWorkflow('chat-workflow', {
        userMessage: content,
        userId: this.userId,
      })
      .subscribe({
        next: (event) => {
          if (event.type === 'message') {
            this.messages.update((msgs) => [...msgs, event.data]);
          }
        },
        complete: () => {
          this.isStreaming.set(false);
        },
        error: (err) => {
          console.error('Stream error:', err);
          this.isStreaming.set(false);
        },
      });
  }
}
```

---

## HTTP Integration

### API Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getDeveloperProfile(userId: string): Observable<Developer> {
    return this.http.get<Developer>(`${this.baseUrl}/developers/${userId}`);
  }

  executeWorkflow(workflowName: string, input: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/workflows/${workflowName}`, input);
  }
}
```

---

## TailwindCSS Styling

### Utility Classes

```typescript
@Component({
  template: `
    <div class="container mx-auto px-4">
      <header class="flex items-center justify-between py-6">
        <h1 class="text-3xl font-bold text-gray-900">Title</h1>
        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Action
        </button>
      </header>

      <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg shadow-md p-6">Card content</div>
      </main>
    </div>
  `,
})
export class LayoutComponent {}
```

---

## Best Practices

1. **Use Standalone Components**: No NgModules
2. **Signals for State**: Reactive local state
3. **RxJS for Streams**: HTTP requests, WebSocket
4. **TailwindCSS**: Utility-first styling
5. **Lazy Loading**: Route-based code splitting

---

## Reference

### Key Imports

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LangGraphClient } from '@hive-academy/langgraph-client';
```
