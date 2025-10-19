import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HybridUIService } from '../../../core/angular-3d/services/hybrid-ui.service';
import { createCardConfig } from '../../../core/angular-3d/utils/config-builders';
import type { HybridElementExtended } from '../../../core/angular-3d/interfaces';

export interface InfoCardData {
  id: string;
  title: string;
  description: string;
  category: string;
  features: string[];
  maturity: 'Prototype' | 'Alpha' | 'Beta' | 'Stable';
  differentiator: string;
  color: string;
}

@Component({
  selector: 'brand-three-d-info-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full h-96 overflow-hidden rounded-2xl bg-gradient-to-br from-black via-purple-900/20 to-black border border-purple-500/20 backdrop-blur-lg hover:border-purple-500/40"
      (mouseenter)="onHover(true)"
      (mouseleave)="onHover(false)"
    >
      <!-- 3D Scene Container -->
      <div class="absolute inset-0 z-10" #sceneContainer></div>

      <!-- Content Overlay -->
      <div class="absolute inset-0 z-20 p-6 flex flex-col justify-between">
        <!-- Header -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold"
              [style.background-color]="cardData()?.color + '20'"
              [style.color]="cardData()?.color"
            >
              {{ cardData()?.category }}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/60">{{
                cardData()?.maturity
              }}</span>
              <div
                class="w-2 h-2 rounded-full"
                [class.bg-green-500]="cardData()?.maturity === 'Stable'"
                [class.bg-blue-500]="cardData()?.maturity === 'Beta'"
                [class.bg-yellow-500]="cardData()?.maturity === 'Alpha'"
                [class.bg-gray-500]="cardData()?.maturity === 'Prototype'"
              ></div>
            </div>
          </div>

          <h3 class="text-xl font-bold text-white leading-tight">
            {{ cardData()?.title }}
          </h3>

          <p class="text-sm text-white/80 leading-relaxed line-clamp-3">
            {{ cardData()?.description }}
          </p>
        </div>

        <!-- Features -->
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2">
            @for (feature of cardData()?.features?.slice(0, 3); track
            trackByFeature($index, feature)) {
            <span
              class="px-2 py-1 bg-white/10 text-white/90 rounded-lg text-xs backdrop-blur-sm"
            >
              {{ feature }}
            </span>
            }
          </div>

          <!-- Differentiator -->
          <div
            class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3"
          >
            <p class="text-xs text-purple-300 font-semibold mb-1">
              Key Differentiator
            </p>
            <p class="text-sm text-white/90">
              {{ cardData()?.differentiator }}
            </p>
          </div>
        </div>
      </div>

      <!-- Glow Effect -->
      <div
        class="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
        [class.opacity-100]="isHovered()"
        [style.background]="
          'radial-gradient(circle at center, ' +
          (cardData()?.color || '#8a2be2') +
          '10 0%, transparent 70%)'
        "
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Hover animation */
      :host:hover .card-container {
        transform: translateY(-4px);
      }
    `,
  ],
})
export class ThreeDInfoCardComponent implements OnInit {
  @ViewChild('sceneContainer', { static: true }) sceneContainer!: ElementRef;
  @Input() set data(value: InfoCardData) {
    this.cardData.set(value);
  }

  // Inject HybridUIService
  private readonly hybridUI = inject(HybridUIService);

  // Component state (signal-based)
  readonly cardData = signal<InfoCardData | null>(null);
  readonly isHovered = signal(false);

  // HybridUI element reference
  private hybridElement?: HybridElementExtended;

  async ngOnInit(): Promise<void> {
    if (!this.cardData()) return;

    // Create config using builder - replaces 100+ lines of manual Three.js setup
    const config = createCardConfig({
      color: this.cardData()!.color,
      opacity: 0.1,
      priority: 'SECONDARY',
      enableHoverEffect: true,
      enableLOD: true,
    });

    // Single service call replaces entire scene/camera/renderer/mesh/particle setup
    try {
      this.hybridElement = await this.hybridUI.createHybridElement(
        this.sceneContainer.nativeElement,
        config
      );
    } catch (error) {
      console.error('Failed to create hybrid element:', error);
    }
  }

  onHover(isHovered: boolean): void {
    this.isHovered.set(isHovered);

    // Trigger animation via service - replaces manual GSAP calls
    if (this.hybridElement) {
      if (isHovered) {
        this.hybridUI.triggerAnimation(this.hybridElement.id, 'hover');
      }
      // Note: Animation reversal is handled automatically by HybridUIService
    }
  }

  trackByFeature(index: number, feature: string): string {
    return feature;
  }

  // NO ngOnDestroy needed - HybridUIService handles cleanup automatically
}
