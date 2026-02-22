import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-button',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!authService.isAuthenticated$()) {
    <button type="button" class="login-btn" (click)="authService.login()">
      Log In
    </button>
    }
  `,
  styles: [
    `
      .login-btn {
        padding: 0.5rem 1.25rem;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }

      .login-btn:hover {
        background: rgba(0, 0, 0, 0.6);
        transform: translateY(-1px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
    `,
  ],
})
export class LoginButtonComponent {
  readonly authService = inject(AuthService);
}
