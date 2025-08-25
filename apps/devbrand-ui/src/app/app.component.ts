import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">

    </header>

    <main class="main-content">
      <div class="container">
        <router-outlet></router-outlet>
      </div>
    </main>
  `,
  styles: [],
})
export class AppComponent {

}
