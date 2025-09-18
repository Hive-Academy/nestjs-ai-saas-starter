import { Component } from '@angular/core';

@Component({
  selector: 'brand-content-forge',
  standalone: true,
  imports: [],
  template: `
    <div class="content-forge">
      <h1>Content Forge</h1>
      <p>Collaborative content creation will be implemented here.</p>
    </div>
  `,
  styles: [
    `
      .content-forge {
        height: 100vh;
        background: #0a0a0a;
        color: #ffffff;
        padding: 2rem;
      }
    `,
  ],
})
export class ContentForgeComponent {}
