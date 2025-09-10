import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'brand-workflow-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workflow-canvas">
      <h1>Living Workflow Canvas</h1>
      <p>D3.js workflow visualization will be implemented here.</p>
    </div>
  `,
  styles: [
    `
      .workflow-canvas {
        height: 100vh;
        background: #0a0a0a;
        color: #ffffff;
        padding: 2rem;
      }
    `,
  ],
})
export class WorkflowCanvasComponent {}
