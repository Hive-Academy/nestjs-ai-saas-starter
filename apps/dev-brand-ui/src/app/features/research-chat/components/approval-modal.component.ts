import { Component, input, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';

/**
 * 🛑 APPROVAL MODAL COMPONENT
 *
 * HITL (Human-in-the-Loop) modal for report approval
 * Displays research report draft and allows user to approve/reject
 */
@Component({
  selector: 'app-approval-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (visible()) {
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2>🛑 Review Research Report</h2>
          <button class="close-button" (click)="onReject()">✕</button>
        </div>

        <!-- Report Preview -->
        <div class="modal-body">
          <div class="report-info">
            <span class="info-label">📄 Draft Preview</span>
            <span class="info-hint">Review the generated report below</span>
          </div>

          <div class="report-preview">
            <pre>{{ reportDraft() }}</pre>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-footer">
          <button class="btn btn-reject" (click)="onReject()">
            <span>❌</span>
            <span>Reject</span>
          </button>
          <button class="btn btn-approve" (click)="onApprove()">
            <span>✅</span>
            <span>Approve & Save</span>
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }

      .modal-content {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 32px rgba(0, 0, 0, 0.04);
        animation: slideUp 0.3s ease-out;
      }

      .modal-header {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ffffff;
        border-radius: 16px 16px 0 0;

        h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #23272f;
        }

        .close-button {
          background: #f9fafb;
          border: none;
          color: #23272f;
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #e5e7eb;
            transform: rotate(90deg);
          }
        }
      }

      .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
      }

      .report-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 1rem;

        .info-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: #2d3748;
        }

        .info-hint {
          font-size: 0.85rem;
          color: #718096;
        }
      }

      .report-preview {
        background: #f7fafc;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        max-height: 500px;
        overflow-y: auto;

        pre {
          margin: 0;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #2d3748;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      }

      .modal-footer {
        padding: 1.5rem 2rem;
        border-top: 2px solid #e2e8f0;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        background: #f7fafc;
        border-radius: 0 0 16px 16px;
      }

      .btn {
        padding: 0.75rem 2rem;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        span:first-child {
          font-size: 1.2rem;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .btn-reject {
        background: #ef4444;
        color: white;

        &:hover {
          background: #dc2626;
        }
      }

      .btn-approve {
        background: #6366f1;
        color: white;

        &:hover {
          background: #4f46e5;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Scrollbar styling */
      .report-preview::-webkit-scrollbar {
        width: 8px;
      }

      .report-preview::-webkit-scrollbar-track {
        background: #e2e8f0;
        border-radius: 4px;
      }

      .report-preview::-webkit-scrollbar-thumb {
        background: #cbd5e0;
        border-radius: 4px;

        &:hover {
          background: #a0aec0;
        }
      }
    `,
  ],
})
export class ApprovalModalComponent {
  readonly visible = input<boolean>(false);
  readonly reportDraft = input<string>('');
  @Output() approve = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  onApprove(): void {
    this.approve.emit();
  }

  onReject(): void {
    this.reject.emit();
  }

  onOverlayClick(_event: MouseEvent): void {
    // Close modal when clicking overlay (but not modal content)
    this.onReject();
  }
}
