import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-button',
  standalone: true,
  imports: [CommonModule],
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
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .login-btn:hover {
        transform: translateY(-2px);
      }
    `,
  ],
})
export class LoginButtonComponent {
  readonly authService = inject(AuthService);
}
