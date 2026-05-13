import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';

import { LANGGRAPH_CONFIG } from '../models/config.model';
import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';

/**
 * Composable for HITL (Human-in-the-Loop) approval queue management.
 *
 * @remarks
 * Provides convenient access to the HITL approval queue and methods
 * for approving or rejecting pending approval requests.
 *
 * When `config.approvalUrl` is set, approve/reject actions POST to
 * the backend at `${approvalUrl}/${executionId}` to resume the
 * interrupted workflow via `Command({ resume: value })`.
 *
 * Must be called within an Angular injection context (constructor,
 * field initializer, or `runInInjectionContext`).
 *
 * **Note**: If using `approvalUrl`, ensure `provideHttpClient()` is
 * included in your application providers alongside `provideLangGraph()`.
 *
 * @returns Readonly object with approval state signals and action methods
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-approvals',
 *   template: `
 *     @if (approval.hasPendingApprovals()) {
 *       @for (item of approval.hitlQueue(); track item.id) {
 *         @if (item.status === 'pending') {
 *           <div>
 *             <p>{{ item.message }}</p>
 *             <button (click)="onApprove(item.id)">Approve</button>
 *             <button (click)="onReject(item.id)">Reject</button>
 *           </div>
 *         }
 *       }
 *     }
 *   `,
 * })
 * export class ApprovalsComponent {
 *   readonly approval = useLangGraphApproval();
 *
 *   onApprove(id: string): void {
 *     this.approval.approve(id, 'Looks good').subscribe();
 *   }
 *
 *   onReject(id: string): void {
 *     this.approval.reject(id, 'Needs revision').subscribe();
 *   }
 * }
 * ```
 *
 * @public
 */
export function useLangGraphApproval() {
  const stateService = inject(LangGraphWorkflowStateService);
  const config = inject(LANGGRAPH_CONFIG);
  const http = inject(HttpClient);

  return {
    /** Whether there are any pending HITL approval requests. */
    hasPendingApprovals: stateService.hasPendingApprovals,
    /** Queue of all HITL approval requests (pending, approved, rejected). */
    hitlQueue: stateService.hitlQueue,

    /**
     * Approve a pending HITL request.
     *
     * @remarks
     * Updates local signal state immediately AND posts to backend
     * if `approvalUrl` is configured. The backend resumes the
     * workflow via `WorkflowResumptionService.resumeWorkflow()`
     * with `Command({ resume: value })`.
     *
     * @param approvalId - ID of the approval request to approve
     * @param feedback - Optional feedback message for the approval
     * @returns Observable that completes when the backend acknowledges
     */
    approve: (approvalId: string, feedback?: string): Observable<void> => {
      stateService.resolveApproval(approvalId, 'approved');

      if (config.approvalUrl) {
        const executionId = stateService.getApprovalExecutionId(approvalId);
        return http.post<void>(`${config.approvalUrl}/${executionId}`, {
          action: 'approve',
          feedback,
        });
      }

      return of(undefined);
    },

    /**
     * Reject a pending HITL request.
     *
     * @remarks
     * Updates local signal state immediately AND posts to backend
     * if `approvalUrl` is configured. The backend resumes the
     * workflow with a rejection decision.
     *
     * @param approvalId - ID of the approval request to reject
     * @param reason - Optional reason for the rejection
     * @returns Observable that completes when the backend acknowledges
     */
    reject: (approvalId: string, reason?: string): Observable<void> => {
      stateService.resolveApproval(approvalId, 'rejected', reason);

      if (config.approvalUrl) {
        const executionId = stateService.getApprovalExecutionId(approvalId);
        return http.post<void>(`${config.approvalUrl}/${executionId}`, {
          action: 'reject',
          feedback: reason,
        });
      }

      return of(undefined);
    },
  } as const;
}
