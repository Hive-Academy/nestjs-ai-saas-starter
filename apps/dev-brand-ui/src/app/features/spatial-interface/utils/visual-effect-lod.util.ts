import * as THREE from 'three';
import type { PerformanceQuality } from '../services/performance-monitor.service';

export interface LODEffectConfig {
  baseParticleCount: number;
  baseTextureSize: number;
  baseIntensity: number;
  minParticleCount: number;
  minTextureSize: number;
  minIntensity: number;
}

export interface LODResult {
  particleCount: number;
  textureSize: number;
  intensity: number;
  updateFrequency: number;
  enableShaderOptimizations: boolean;
  enableInstancing: boolean;
}

/**
 * Visual Effect LOD Utility
 * Provides level-of-detail calculations for visual effects
 * Ensures smooth performance transitions without jarring visual changes
 */
export class VisualEffectLODUtil {
  /**
   * Calculate LOD settings based on camera distance and performance quality
   */
  static calculateLOD(
    cameraPosition: THREE.Vector3,
    effectPosition: THREE.Vector3,
    performanceQuality: PerformanceQuality,
    config: LODEffectConfig
  ): LODResult {
    const distance = cameraPosition.distanceTo(effectPosition);

    // Distance-based LOD multipliers
    const distanceFactor = this.getDistanceFactor(distance);

    // Performance-based multipliers
    const performanceFactor = this.getPerformanceFactor(performanceQuality);

    // Combine factors
    const combinedFactor = distanceFactor * performanceFactor;

    return {
      particleCount: Math.max(
        config.minParticleCount,
        Math.round(config.baseParticleCount * combinedFactor)
      ),
      textureSize: Math.max(
        config.minTextureSize,
        this.getOptimalTextureSize(config.baseTextureSize * combinedFactor)
      ),
      intensity: Math.max(
        config.minIntensity,
        config.baseIntensity * combinedFactor
      ),
      updateFrequency: performanceQuality.updateFrequency,
      enableShaderOptimizations: performanceQuality.shaderComplexity !== 'high',
      enableInstancing:
        distance > 100 || performanceQuality.shaderComplexity === 'low',
    };
  }

  /**
   * Get distance-based quality factor
   */
  private static getDistanceFactor(distance: number): number {
    // Quality decreases with distance
    if (distance < 50) {
      return 1.0; // Full quality
    } else if (distance < 100) {
      return 0.8; // Slight reduction
    } else if (distance < 200) {
      return 0.5; // Moderate reduction
    } else {
      return 0.3; // Significant reduction
    }
  }

  /**
   * Get performance-based quality factor
   */
  private static getPerformanceFactor(quality: PerformanceQuality): number {
    return quality.effectIntensity;
  }

  /**
   * Get optimal texture size (power of 2)
   */
  private static getOptimalTextureSize(targetSize: number): number {
    // Ensure texture size is power of 2
    const powerOf2Sizes = [64, 128, 256, 512, 1024];

    for (const size of powerOf2Sizes) {
      if (targetSize <= size) {
        return size;
      }
    }

    return 1024; // Maximum size
  }

  /**
   * Create instanced geometry for repeated elements
   */
  static createInstancedGeometry(
    baseGeometry: THREE.BufferGeometry,
    positions: THREE.Vector3[],
    scales: number[],
    colors: THREE.Color[]
  ): THREE.InstancedBufferGeometry {
    const instancedGeometry = new THREE.InstancedBufferGeometry();

    // Copy base geometry attributes manually
    for (const [name, attribute] of Object.entries(baseGeometry.attributes)) {
      instancedGeometry.setAttribute(name, attribute.clone());
    }

    // Copy index if it exists
    if (baseGeometry.index) {
      instancedGeometry.setIndex(baseGeometry.index.clone());
    }

    // Create instance attributes
    const instanceCount = positions.length;
    const instancePositions = new Float32Array(instanceCount * 3);
    const instanceScales = new Float32Array(instanceCount);
    const instanceColors = new Float32Array(instanceCount * 3);

    for (let i = 0; i < instanceCount; i++) {
      const i3 = i * 3;

      // Position
      instancePositions[i3] = positions[i].x;
      instancePositions[i3 + 1] = positions[i].y;
      instancePositions[i3 + 2] = positions[i].z;

      // Scale
      instanceScales[i] = scales[i] || 1.0;

      // Color
      instanceColors[i3] = colors[i]?.r || 1.0;
      instanceColors[i3 + 1] = colors[i]?.g || 1.0;
      instanceColors[i3 + 2] = colors[i]?.b || 1.0;
    }

    // Set instance attributes
    instancedGeometry.setAttribute(
      'instancePosition',
      new THREE.InstancedBufferAttribute(instancePositions, 3)
    );
    instancedGeometry.setAttribute(
      'instanceScale',
      new THREE.InstancedBufferAttribute(instanceScales, 1)
    );
    instancedGeometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(instanceColors, 3)
    );

    return instancedGeometry;
  }

  /**
   * Create optimized shader material based on quality level
   */
  static createOptimizedShaderMaterial(
    quality: PerformanceQuality,
    baseUniforms: Record<string, any>,
    vertexShader: string,
    fragmentShader: string
  ): THREE.ShaderMaterial {
    // Modify shaders based on quality level
    const optimizedVertexShader = vertexShader;
    let optimizedFragmentShader = fragmentShader;

    if (quality.shaderComplexity === 'low') {
      // Remove expensive operations for low quality
      optimizedFragmentShader = this.simplifyFragmentShader(fragmentShader);
    } else if (quality.shaderComplexity === 'medium') {
      // Reduce precision for medium quality
      optimizedFragmentShader = this.reducePrecision(fragmentShader);
    }

    return new THREE.ShaderMaterial({
      uniforms: {
        ...baseUniforms,
        quality: { value: quality.effectIntensity },
        shaderComplexity: {
          value: this.getShaderComplexityValue(quality.shaderComplexity),
        },
      },
      vertexShader: optimizedVertexShader,
      fragmentShader: optimizedFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
  }

  /**
   * Simplify fragment shader for low quality
   */
  private static simplifyFragmentShader(shader: string): string {
    // Remove expensive operations like multiple sin/cos calls
    return shader
      .replace(/sin\([^)]+\)\s*\*\s*[0-9.]+\s*\+\s*[0-9.]+/g, '0.5') // Replace complex sin operations
      .replace(/pow\([^,]+,\s*[0-9.]+\)/g, 'sqrt($1)') // Replace pow with sqrt
      .replace(/mix\([^,]+,\s*[^,]+,\s*[^)]+\)/g, '$1'); // Simplify mixing
  }

  /**
   * Reduce precision in fragment shader
   */
  private static reducePrecision(shader: string): string {
    // Add precision qualifiers for medium quality
    return `precision mediump float;\n${shader}`;
  }

  /**
   * Get numeric value for shader complexity
   */
  private static getShaderComplexityValue(
    complexity: 'high' | 'medium' | 'low'
  ): number {
    switch (complexity) {
      case 'high':
        return 1.0;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.3;
      default:
        return 1.0;
    }
  }

  /**
   * Calculate optimal particle batch size for performance
   */
  static calculateOptimalBatchSize(
    totalParticles: number,
    performance: PerformanceQuality
  ): number {
    const maxBatchSize = 1000; // WebGL limitation
    const performanceFactor = performance.effectIntensity;

    // Adjust batch size based on performance
    const optimalBatch = Math.floor(maxBatchSize * performanceFactor);

    return Math.min(optimalBatch, totalParticles);
  }

  /**
   * Create simplified geometry for distant objects
   */
  static createSimplifiedGeometry(
    originalGeometry: THREE.BufferGeometry,
    lodLevel: number // 0 = full detail, 1 = minimal detail
  ): THREE.BufferGeometry {
    if (lodLevel <= 0) {
      return originalGeometry; // Return original for full detail
    }

    // For high LOD levels, create simplified versions
    if (originalGeometry instanceof THREE.SphereGeometry) {
      const segments = Math.max(8, Math.floor(32 * (1 - lodLevel)));
      return new THREE.SphereGeometry(1, segments, segments);
    }

    if (originalGeometry instanceof THREE.RingGeometry) {
      const segments = Math.max(8, Math.floor(32 * (1 - lodLevel)));
      return new THREE.RingGeometry(0.8, 1.0, segments);
    }

    // For other geometries, return original
    return originalGeometry;
  }

  /**
   * Calculate update frequency based on distance and performance
   */
  static calculateUpdateFrequency(
    baseFrequency: number,
    distance: number,
    performance: PerformanceQuality
  ): number {
    const distanceFactor = distance > 100 ? 0.5 : 1.0;
    const performanceFactor = performance.effectIntensity;

    return Math.max(
      1, // Minimum 1 Hz
      Math.floor(baseFrequency * distanceFactor * performanceFactor)
    );
  }

  /**
   * Determine if effect should use instancing
   */
  static shouldUseInstancing(
    effectCount: number,
    distance: number,
    performance: PerformanceQuality
  ): boolean {
    // Use instancing for:
    // - Multiple similar effects (>5)
    // - Distant effects (>50 units)
    // - Low performance settings
    return (
      effectCount > 5 || distance > 50 || performance.shaderComplexity === 'low'
    );
  }

  /**
   * Get culling distance based on performance
   */
  static getCullingDistance(performance: PerformanceQuality): number {
    // Cull effects beyond these distances based on performance
    switch (performance.shaderComplexity) {
      case 'high':
        return 500;
      case 'medium':
        return 300;
      case 'low':
        return 150;
      default:
        return 500;
    }
  }

  /**
   * Create smooth transition between LOD levels
   */
  static createSmoothLODTransition(
    currentLOD: LODResult,
    targetLOD: LODResult,
    transitionSpeed = 0.1
  ): LODResult {
    return {
      particleCount: Math.round(
        currentLOD.particleCount +
          (targetLOD.particleCount - currentLOD.particleCount) * transitionSpeed
      ),
      textureSize: this.getOptimalTextureSize(
        currentLOD.textureSize +
          (targetLOD.textureSize - currentLOD.textureSize) * transitionSpeed
      ),
      intensity:
        currentLOD.intensity +
        (targetLOD.intensity - currentLOD.intensity) * transitionSpeed,
      updateFrequency: targetLOD.updateFrequency,
      enableShaderOptimizations: targetLOD.enableShaderOptimizations,
      enableInstancing: targetLOD.enableInstancing,
    };
  }
}
