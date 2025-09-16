import { Injectable, signal, computed } from '@angular/core';
import { ContentPriority, HybridElementConfig, ScalingResult } from '../types/hybrid-ui.types';

/**
 * Intelligent Scaling Service
 * Automatically calculates optimal sizes, positioning, and visual hierarchy
 * for hybrid 3D elements based on content importance and screen real estate
 */
@Injectable({
  providedIn: 'root'
})
export class ScalingIntelligenceService {

  // Base scaling factors (can be adjusted based on screen size)
  private readonly baseContentScale = signal(1.0);
  private readonly baseDecorationScale = signal(0.3);
  private readonly baseSpacing = signal(2.0);

  // Screen size considerations
  private readonly screenSize = signal({ width: 1920, height: 1080 });
  private readonly scaleFactor = computed(() => {
    const screen = this.screenSize();
    const referenceArea = 1920 * 1080;
    const currentArea = screen.width * screen.height;
    return Math.sqrt(currentArea / referenceArea);
  });

  /**
   * Calculate optimal sizes for a single element
   */
  calculateElementScaling(
    config: HybridElementConfig,
    maxImportance: number = ContentPriority.HERO
  ): ScalingResult {
    const importance = config.priority;
    const ratio = importance / maxImportance;
    const screenFactor = this.scaleFactor();

    // Content-first principle: Content is always larger than decoration
    const baseContent = this.baseContentScale() * screenFactor;
    const baseDecoration = this.baseDecorationScale() * screenFactor;

    // Scale based on importance with non-linear curve for better visual hierarchy
    const importanceCurve = this.getImportanceCurve(ratio);

    const contentScale = baseContent * (0.4 + importanceCurve * 1.6); // 0.4x to 2x scale
    const decorationScale = baseDecoration * (0.1 + ratio * 0.3); // 0.1x to 0.4x scale

    // Ensure decoration is ALWAYS smaller than content
    const finalDecorationScale = Math.min(decorationScale, contentScale * 0.4);

    // Opacity follows hierarchy - more important = more opaque
    const contentOpacity = 0.85 + (ratio * 0.15); // 85% to 100%
    const decorationOpacity = 0.05 + (ratio * 0.25); // 5% to 30%

    // Z-positioning: higher importance = closer to camera
    const zPosition = ratio * 2; // 0 to 2 units forward

    // Spacing scales with element size
    const spacing = this.baseSpacing() * screenFactor * (0.8 + ratio * 0.4);

    return {
      contentScale,
      decorationScale: finalDecorationScale,
      contentOpacity,
      decorationOpacity,
      zPosition,
      spacing
    };
  }

  /**
   * Calculate optimal sizes for multiple elements in a scene
   */
  calculateSceneScaling(elements: HybridElementConfig[]): Map<number, ScalingResult> {
    if (elements.length === 0) return new Map();

    // Find the maximum importance in the scene
    const maxImportance = Math.max(...elements.map(e => e.priority));

    // Calculate relative scaling for all elements
    const results = new Map<number, ScalingResult>();

    elements.forEach((config, index) => {
      const scaling = this.calculateElementScaling(config, maxImportance);

      // Apply scene-wide adjustments
      const adjustedScaling = this.applySceneAdjustments(scaling, elements.length);

      results.set(index, adjustedScaling);
    });

    return results;
  }

  /**
   * Update scaling based on viewport changes
   */
  updateViewportScaling(width: number, height: number): void {
    this.screenSize.set({ width, height });

    // Adjust base scales for very small or very large screens
    const area = width * height;
    const mobileThreshold = 800 * 600;
    const desktopThreshold = 2560 * 1440;

    if (area < mobileThreshold) {
      // Mobile: Larger content, more spacing
      this.baseContentScale.set(1.2);
      this.baseSpacing.set(2.5);
    } else if (area > desktopThreshold) {
      // Large desktop: Can afford smaller elements, tighter spacing
      this.baseContentScale.set(0.8);
      this.baseSpacing.set(1.8);
    } else {
      // Standard desktop
      this.baseContentScale.set(1.0);
      this.baseSpacing.set(2.0);
    }
  }

  /**
   * Get optimal layout spacing based on element count and screen size
   */
  calculateLayoutSpacing(elementCount: number): { horizontal: number; vertical: number; depth: number } {
    const baseSp = this.baseSpacing() * this.scaleFactor();
    const densityFactor = Math.max(0.6, 1 - (elementCount - 3) * 0.1); // Tighter spacing for more elements

    return {
      horizontal: baseSp * densityFactor * 1.2,
      vertical: baseSp * densityFactor,
      depth: baseSp * densityFactor * 0.8
    };
  }

  /**
   * Calculate optimal camera distance based on content scale
   */
  calculateOptimalCameraDistance(
    elements: ScalingResult[],
    layoutBounds: { width: number; height: number; depth: number }
  ): number {
    if (elements.length === 0) return 10;

    // Find the largest content scale
    const maxContentScale = Math.max(...elements.map(e => e.contentScale));

    // Calculate distance to fit all content with some margin
    const maxDimension = Math.max(layoutBounds.width, layoutBounds.height);
    const baseDist = maxDimension * 0.6;

    // Adjust for content scale - larger content needs more distance
    const scaleDist = baseDist * (0.8 + maxContentScale * 0.4);

    return Math.max(scaleDist, 5); // Minimum distance of 5 units
  }

  /**
   * Auto-adjust quality settings based on element count and performance
   */
  calculatePerformanceSettings(elementCount: number, targetFPS = 60): {
    textureSize: number;
    enableLOD: boolean;
    lodLevels: number[];
    enableInstancing: boolean;
  } {
    const baseTextureSize = 1024;
    const screenFactor = this.scaleFactor();

    // Reduce texture size for many elements or smaller screens
    let textureSize = baseTextureSize;
    if (elementCount > 10) textureSize = 512;
    if (elementCount > 20) textureSize = 256;
    if (screenFactor < 0.8) textureSize = Math.min(textureSize, 512);

    // Enable LOD for complex scenes
    const enableLOD = elementCount > 5;
    const lodLevels = enableLOD ? [1.0, 0.7, 0.4, 0.2] : [1.0];

    // Enable instancing for repeated elements
    const enableInstancing = elementCount > 8;

    return {
      textureSize,
      enableLOD,
      lodLevels,
      enableInstancing
    };
  }

  /**
   * Validate and clamp scaling values to safe ranges
   */
  validateScaling(scaling: ScalingResult): ScalingResult {
    return {
      contentScale: Math.max(0.1, Math.min(scaling.contentScale, 5.0)),
      decorationScale: Math.max(0.05, Math.min(scaling.decorationScale, 2.0)),
      contentOpacity: Math.max(0.3, Math.min(scaling.contentOpacity, 1.0)),
      decorationOpacity: Math.max(0.02, Math.min(scaling.decorationOpacity, 0.5)),
      zPosition: Math.max(-10, Math.min(scaling.zPosition, 10)),
      spacing: Math.max(0.5, Math.min(scaling.spacing, 10))
    };
  }

  /**
   * Get current scaling factors for debugging
   */
  getScalingFactors() {
    return {
      baseContentScale: this.baseContentScale(),
      baseDecorationScale: this.baseDecorationScale(),
      baseSpacing: this.baseSpacing(),
      screenFactor: this.scaleFactor(),
      screenSize: this.screenSize()
    };
  }

  /**
   * Non-linear importance curve for better visual hierarchy
   * Uses easing function to make important elements much more prominent
   */
  private getImportanceCurve(ratio: number): number {
    // Ease-out curve: more dramatic differences at the top
    return 1 - Math.pow(1 - ratio, 2.5);
  }

  /**
   * Apply scene-wide adjustments based on element count
   */
  private applySceneAdjustments(scaling: ScalingResult, elementCount: number): ScalingResult {
    // For crowded scenes, reduce overall scale slightly
    const crowdingFactor = Math.max(0.7, 1 - (elementCount - 5) * 0.05);

    return {
      ...scaling,
      contentScale: scaling.contentScale * crowdingFactor,
      decorationScale: scaling.decorationScale * crowdingFactor,
      spacing: scaling.spacing * crowdingFactor
    };
  }
}
