import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-architecture-diagram',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="architecture-diagram-container">
      <div class="content-placeholder">
        <h2>Architecture Deep Dive</h2>
        <p>Layered 3D visualization of technical architecture</p>
        <div class="coming-soon">🏗️ Coming in Phase 3</div>
      </div>
    </div>
  `,
  styles: [`
    .architecture-diagram-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .content-placeholder {
      text-align: center;
      color: #ffffff;
    }

    .content-placeholder h2 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #ffd700;
    }

    .content-placeholder p {
      font-size: 1.2rem;
      margin-bottom: 1rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .coming-soon {
      font-size: 1rem;
      padding: 1rem;
      background: rgba(255, 215, 0, 0.2);
      border-radius: 8px;
      color: #ffd700;
    }
  `]
})
export class ArchitectureDiagramComponent {
}