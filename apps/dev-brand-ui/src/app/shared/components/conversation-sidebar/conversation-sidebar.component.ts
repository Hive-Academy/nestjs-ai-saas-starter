/**
 * ConversationSidebarComponent
 *
 * Responsive sidebar displaying conversation history with responsive layout.
 * Supports both researcher and supervisor workflow types with real-time updates.
 *
 * Features:
 * - Last 10 conversations with preview, timestamp, status
 * - "New Chat" button for creating new conversations
 * - Loading skeleton UI and error state handling
 * - Empty state with helpful messaging
 * - Active conversation highlighting
 * - Responsive layout (desktop grid, mobile drawer)
 * - Collapse/expand functionality with localStorage persistence
 *
 * Layout Strategy:
 * - Desktop (>768px): 280px fixed width sidebar (64px when collapsed)
 * - Mobile (<768px): Slide-out drawer with backdrop overlay
 *
 * Usage:
 * ```html
 * <app-conversation-sidebar
 *   workflowType="researcher"
 *   [userId]="userId"
 *   [currentThreadId]="currentThreadId"
 *   (conversationSelected)="onConversationSelected($event)"
 *   (newConversationCreated)="onNewConversation($event)"
 * />
 * ```
 *
 * @remarks
 * Component Complexity Assessment: Level 2 (Medium)
 * - Signals: RxJS BehaviorSubject state management, event emitters
 * - Patterns Applied:
 *   - Standalone component with CommonModule
 *   - Reactive state management with BehaviorSubject
 *   - Event-driven architecture (Output emitters)
 *   - Composition with ConversationApiService
 * - Patterns Rejected:
 *   - Container/Presentational: Not needed, component handles both data and UI
 *   - Compound components: Single component sufficient for sidebar
 * - SOLID Principles:
 *   - Single Responsibility: Manages conversation list display and selection
 *   - Dependency Inversion: Depends on ConversationApiService abstraction
 *   - Open/Closed: Extensible via Input properties (workflowType)
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, map, catchError, of } from 'rxjs';
import { ConversationApiService } from '../../services/conversation-api.service';
import type { ConversationSummary } from '../../models/conversation.model';

/**
 * Internal state interface for sidebar component
 */
interface SidebarState {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  collapsed: boolean;
}

@Component({
  selector: 'app-conversation-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversation-sidebar.component.html',
  styleUrls: ['./conversation-sidebar.component.scss'],
})
export class ConversationSidebarComponent implements OnInit {
  private conversationApi = inject(ConversationApiService);

  /**
   * Workflow type: researcher or supervisor
   * Determines which API endpoints to use
   */
  @Input() workflowType: 'researcher' | 'supervisor' = 'researcher';

  /**
   * User ID for conversation filtering
   * Used in API requests for conversation list
   */
  @Input() userId = '';

  /**
   * Currently active thread ID for highlighting
   */
  @Input() currentThreadId?: string;

  /**
   * Emitted when user selects a conversation
   * Payload: threadId of selected conversation
   */
  @Output() conversationSelected = new EventEmitter<string>();

  /**
   * Emitted when user creates a new conversation
   * Payload: threadId of newly created conversation
   */
  @Output() newConversationCreated = new EventEmitter<string>();

  /**
   * Internal state managed via BehaviorSubject
   */
  private state$ = new BehaviorSubject<SidebarState>({
    conversations: [],
    loading: false,
    error: null,
    collapsed: this.loadCollapsedState(),
  });

  /**
   * Observable streams for template consumption
   */
  conversations$ = this.state$.pipe(map((s) => s.conversations));
  loading$ = this.state$.pipe(map((s) => s.loading));
  error$ = this.state$.pipe(map((s) => s.error));
  collapsed$ = this.state$.pipe(map((s) => s.collapsed));

  /**
   * Component initialization: load conversation list
   */
  ngOnInit(): void {
    this.loadConversations();
  }

  /**
   * Load conversation list from API
   * Handles loading state, error state, and response mapping
   */
  loadConversations(): void {
    this.updateState({ loading: true, error: null });

    const apiCall =
      this.workflowType === 'researcher'
        ? this.conversationApi.getResearcherConversationList(this.userId)
        : this.conversationApi.getSupervisorConversationList(this.userId);

    apiCall
      .pipe(
        catchError((error) => {
          this.updateState({
            loading: false,
            error: 'Failed to load conversations. Please try again.',
          });
          return of({ conversations: [], totalCount: 0, hasMore: false });
        })
      )
      .subscribe((response) => {
        this.updateState({
          conversations: response.conversations,
          loading: false,
        });
      });
  }

  /**
   * Handle conversation selection
   * Emits conversationSelected event with threadId
   */
  onSelectConversation(threadId: string): void {
    this.conversationSelected.emit(threadId);
  }

  /**
   * Handle new chat creation
   * Creates new conversation via API and emits newConversationCreated event
   */
  onNewChat(): void {
    this.updateState({ loading: true, error: null });

    const apiCall =
      this.workflowType === 'researcher'
        ? this.conversationApi.createNewResearcherConversation(this.userId)
        : this.conversationApi.createNewSupervisorConversation(this.userId);

    apiCall
      .pipe(
        catchError((error) => {
          this.updateState({
            loading: false,
            error: 'Failed to create new conversation. Please try again.',
          });
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.updateState({ loading: false });
          this.newConversationCreated.emit(response.threadId);
          this.loadConversations(); // Refresh list
        }
      });
  }

  /**
   * Toggle sidebar collapse state
   * Persists state to localStorage for user preference
   */
  toggleCollapse(): void {
    const currentState = this.state$.value;
    const newCollapsed = !currentState.collapsed;
    this.updateState({ collapsed: newCollapsed });
    localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
  }

  /**
   * Update partial state
   * @private
   */
  private updateState(partial: Partial<SidebarState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  /**
   * Load collapsed state from localStorage
   * @private
   */
  private loadCollapsedState(): boolean {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  }

  /**
   * Format timestamp as relative time (e.g., "2 hours ago")
   * @template helper
   */
  getRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  /**
   * Get Tailwind classes for status badge
   * @template helper
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'waiting':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  /**
   * Get display label for status
   * @template helper
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'completed':
        return 'Completed';
      case 'active':
      default:
        return 'Active';
    }
  }

  /**
   * TrackBy function for ngFor optimization
   * @template helper
   */
  trackByThreadId(index: number, conversation: ConversationSummary): string {
    return conversation.threadId;
  }
}
