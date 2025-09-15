import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Instructions Component
 * Shows user instructions for interacting with the constellation
 */
@Component({
  selector: 'brand-instructions',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showInstructions()) {
    <div class="instructions">
      <p>🌌 <strong>Agent Constellation</strong></p>
      <p>Click on agents to interact • Mouse to orbit • Scroll to zoom</p>
      @if (agentCount() === 0) {
      <p>Waiting for agents to join the constellation...</p>
      }
    </div>
    }
  `,
  styles: [
    `
      .instructions {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9em;
        pointer-events: auto;
      }

      .instructions p {
        margin: 4px 0;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .instructions {
          bottom: 20px;
          left: 20px;
          right: 20px;
          transform: none;
          font-size: 0.85em;
        }
      }
    `,
  ],
})
export class InstructionsComponent {
  showInstructions = input(true);
  agentCount = input(0);
}
