import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <nav class="nav">
        <a routerLink="/" class="nav-brand">AI SaaS Starter</a>
        <ul class="nav-links">
          <li>
            <a
              routerLink="/"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              >Dashboard</a
            >
          </li>
          <li>
            <a routerLink="/documents" routerLinkActive="active">Documents</a>
          </li>
          <li>
            <a routerLink="/graph" routerLinkActive="active">Knowledge Graph</a>
          </li>
          <li>
            <a routerLink="/workflows" routerLinkActive="active"
              >AI Workflows</a
            >
          </li>
          <li>
            <a routerLink="/health" routerLinkActive="active">System Health</a>
          </li>
        </ul>
      </nav>
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
  title = 'AI SaaS Starter - Powered by ChromaDB, Neo4j & LangGraph';
}
