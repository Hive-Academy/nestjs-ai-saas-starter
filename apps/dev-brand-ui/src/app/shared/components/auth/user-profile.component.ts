import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { TierBadgeComponent } from './tier-badge.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, TierBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authService.isAuthenticated$(); as user) {
    <div class="profile-container">
      <button class="profile-button" (click)="toggleDropdown()">
        <div class="avatar">
          {{ getInitials(authService.user$()?.email) }}
        </div>
        <span class="email">{{ authService.user$()?.email }}</span>
      </button>

      @if (isDropdownOpen()) {
      <div class="dropdown">
        <div class="tier-section">
          <app-tier-badge [tier]="authService.userTier$()" />
        </div>
        <button class="dropdown-item" (click)="openAccountSettings()">
          Account Settings
        </button>
        <button class="dropdown-item" (click)="authService.logout()">
          Logout
        </button>
      </div>
      }
    </div>
    }
  `,
  styles: [
    `
      .profile-container {
        position: relative;
        display: inline-block;
        margin-top: 0.5rem;
        width: 12rem;
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
        z-index: 50;
        overflow: hidden;
      }

      .tier-section {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: center;
      }

      .dropdown-item {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: #374151;
        background: none;
        border: none;
        cursor: pointer;
      }

      .dropdown-item:hover {
        background-color: #f9fafb;
      }
    `,
  ],
})
export class UserProfileComponent {
  readonly authService = inject(AuthService);
  readonly isDropdownOpen = signal(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update((open) => !open);
  }

  getInitials(email?: string): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  }

  openAccountSettings(): void {
    // TODO: Navigate to account settings
    console.log('Open account settings');
  }
}
