/**
 * Decorative Patterns Component
 *
 * Inline SVG decorative elements for floating background animations.
 * Alternative to Canva-generated assets - uses code-based SVG for full control.
 *
 * Patterns:
 * - Vector arrows (ChromaDB theme)
 * - Network nodes (Neo4j theme)
 * - Data flow (Streaming theme)
 * - Circuit board (Technical theme)
 * - Gradient blobs (Abstract theme)
 */

import { Component, input } from '@angular/core';

type PatternType = 'vector-arrows' | 'network-nodes' | 'data-flow' | 'circuit-board' | 'gradient-blob' | 'hexagon-grid';

@Component({
  selector: 'app-decorative-pattern',
  standalone: true,
  template: `
    @switch (pattern()) {
      @case ('vector-arrows') {
        <!-- Vector Arrows Pattern (ChromaDB theme) -->
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <!-- Central point -->
          <circle cx="200" cy="200" r="40" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>

          <!-- 8 radiating arrows -->
          @for (angle of [0, 45, 90, 135, 180, 225, 270, 315]; track angle) {
            <g [attr.transform]="'rotate(' + angle + ' 200 200)'">
              <line x1="200" y1="200" x2="200" y2="80" stroke="url(#arrowGradient)" stroke-width="2"/>
              <polygon points="200,80 195,90 205,90" fill="currentColor" opacity="0.6"/>
            </g>
          }

          <!-- Floating shapes at arrow endpoints -->
          @for (angle of [0, 45, 90, 135, 180, 225, 270, 315]; track angle; let i = $index) {
            <circle
              [attr.cx]="200 + 120 * Math.cos(angle * Math.PI / 180)"
              [attr.cy]="200 + 120 * Math.sin(angle * Math.PI / 180)"
              r="12"
              fill="currentColor"
              opacity="0.2"/>
          }

          <defs>
            <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.1"/>
            </linearGradient>
          </defs>
        </svg>
      }

      @case ('network-nodes') {
        <!-- Network Nodes Pattern (Neo4j theme) -->
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <!-- Node positions (scattered organic layout) -->
          <g opacity="0.4">
            <!-- Large central nodes -->
            <circle cx="200" cy="200" r="30" fill="none" stroke="currentColor" stroke-width="2.5"/>
            <circle cx="140" cy="160" r="24" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="260" cy="180" r="28" fill="none" stroke="currentColor" stroke-width="2.5"/>

            <!-- Medium nodes -->
            <circle cx="100" cy="240" r="18" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="300" cy="240" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="180" cy="120" r="16" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="220" cy="280" r="18" fill="none" stroke="currentColor" stroke-width="1.5"/>

            <!-- Small nodes -->
            <circle cx="80" cy="180" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="320" cy="160" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="160" cy="300" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </g>

          <!-- Connection lines (curved) -->
          <g opacity="0.2" stroke="currentColor" stroke-width="1.5" fill="none">
            <path d="M 200 200 Q 170 180 140 160"/>
            <path d="M 200 200 Q 230 190 260 180"/>
            <path d="M 200 200 Q 170 220 100 240"/>
            <path d="M 200 200 Q 260 220 300 240"/>
            <path d="M 140 160 Q 110 150 80 180"/>
            <path d="M 260 180 Q 290 170 320 160"/>
            <path d="M 100 240 Q 130 270 160 300"/>
            <path d="M 220 280 Q 250 260 300 240"/>
          </g>
        </svg>
      }

      @case ('data-flow') {
        <!-- Data Flow Pattern (Streaming theme) -->
        <svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <!-- Flowing stream path -->
          <path d="M 0 150 Q 125 120 250 150 T 500 150"
                fill="none"
                stroke="url(#flowGradient)"
                stroke-width="40"
                opacity="0.15"/>

          <!-- Parallel wave lines -->
          <path d="M 0 100 Q 125 70 250 100 T 500 100"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                opacity="0.15"/>
          <path d="M 0 200 Q 125 170 250 200 T 500 200"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                opacity="0.15"/>

          <!-- Data particles -->
          @for (x of [50, 120, 200, 280, 360, 440]; track x) {
            <circle
              [attr.cx]="x"
              cy="150"
              [attr.r]="8 - (x / 100)"
              fill="currentColor"
              opacity="0.4"/>
          }

          <!-- Processing nodes -->
          <rect x="40" y="130" width="40" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <rect x="230" y="130" width="40" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <rect x="420" y="130" width="40" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>

          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.3"/>
              <stop offset="50%" stop-color="currentColor" stop-opacity="0.1"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.3"/>
            </linearGradient>
          </defs>
        </svg>
      }

      @case ('circuit-board') {
        <!-- Circuit Board Pattern (Technical theme) -->
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <g opacity="0.2" stroke="currentColor" stroke-width="1.5" fill="none">
            <!-- Horizontal lines -->
            <line x1="0" y1="100" x2="400" y2="100"/>
            <line x1="0" y1="200" x2="400" y2="200"/>
            <line x1="0" y1="300" x2="400" y2="300"/>

            <!-- Vertical lines -->
            <line x1="100" y1="0" x2="100" y2="400"/>
            <line x1="200" y1="0" x2="200" y2="400"/>
            <line x1="300" y1="0" x2="300" y2="400"/>

            <!-- Connection points -->
            @for (x of [100, 200, 300]; track x) {
              @for (y of [100, 200, 300]; track y) {
                <circle [attr.cx]="x" [attr.cy]="y" r="6" fill="currentColor" opacity="0.4"/>
              }
            }

            <!-- Diagonal connections -->
            <line x1="100" y1="100" x2="200" y2="200" stroke-dasharray="5,5" opacity="0.3"/>
            <line x1="200" y1="100" x2="300" y2="200" stroke-dasharray="5,5" opacity="0.3"/>
            <line x1="100" y1="200" x2="200" y2="300" stroke-dasharray="5,5" opacity="0.3"/>
          </g>
        </svg>
      }

      @case ('gradient-blob') {
        <!-- Gradient Blob Pattern (Abstract theme) -->
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <!-- Organic blob shape -->
          <path d="M 200 80 Q 280 100 320 180 Q 340 260 260 320 Q 180 340 120 280 Q 60 220 80 140 Q 100 80 200 80"
                fill="url(#blobGradient)"
                opacity="0.15"/>

          <!-- Inner blob -->
          <path d="M 200 140 Q 240 150 260 200 Q 270 250 230 270 Q 190 280 160 250 Q 130 220 140 180 Q 150 140 200 140"
                fill="url(#blobGradient2)"
                opacity="0.1"/>

          <defs>
            <radialGradient id="blobGradient">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.05"/>
            </radialGradient>
            <radialGradient id="blobGradient2">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.1"/>
            </radialGradient>
          </defs>
        </svg>
      }

      @case ('hexagon-grid') {
        <!-- Hexagon Grid Pattern (Geometric theme) -->
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <g opacity="0.15" stroke="currentColor" stroke-width="2" fill="none">
            <!-- Concentric hexagons -->
            <polygon points="200,100 270,140 270,220 200,260 130,220 130,140"/>
            <polygon points="200,130 250,160 250,200 200,230 150,200 150,160"/>
            <polygon points="200,160 230,180 230,200 200,220 170,200 170,180"/>
          </g>

          <!-- Corner hexagons -->
          <g opacity="0.1" stroke="currentColor" stroke-width="1.5" fill="none">
            <polygon points="80,80 100,90 100,110 80,120 60,110 60,90"/>
            <polygon points="320,80 340,90 340,110 320,120 300,110 300,90"/>
            <polygon points="80,320 100,330 100,350 80,360 60,350 60,330"/>
            <polygon points="320,320 340,330 340,350 320,360 300,350 300,330"/>
          </g>
        </svg>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    svg {
      color: currentColor;
    }
  `]
})
export class DecorativePatternComponent {
  readonly pattern = input.required<PatternType>();

  // For SVG calculations
  Math = Math;
}
