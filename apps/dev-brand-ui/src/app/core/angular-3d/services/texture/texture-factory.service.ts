/**
 * TextureFactoryService - Creates THREE.js textures
 *
 * Responsibilities:
 * - Create placeholder textures
 * - Configure texture properties
 * - Apply quality settings
 * - Generate simple patterns
 */

import { Injectable } from '@angular/core';
import * as THREE from 'three';

export interface TextureConfig {
  readonly width: number;
  readonly height: number;
  readonly format: THREE.PixelFormat;
  readonly type: THREE.TextureDataType;
  readonly generateMipmaps: boolean;
  readonly wrapS: THREE.Wrapping;
  readonly wrapT: THREE.Wrapping;
  readonly magFilter: THREE.TextureFilter;
  readonly minFilter: THREE.TextureFilter;
  readonly anisotropy: number;
  readonly flipY: boolean;
  readonly premultiplyAlpha: boolean;
  readonly unpackAlignment: number;
}

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

@Injectable({
  providedIn: 'root',
})
export class TextureFactoryService {
  private readonly defaultConfig: TextureConfig = {
    width: 512,
    height: 512,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    generateMipmaps: false, // Disable for canvas textures to avoid taint issues
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    anisotropy: 1,
    flipY: false,
    premultiplyAlpha: false,
    unpackAlignment: 4,
  };

  /**
   * Create a solid color placeholder texture
   * CORS-safe, no taint issues
   */
  createPlaceholderTexture(
    width = 256,
    height = 256,
    color = '#1a1a2e'
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', {
      willReadFrequently: false,
      alpha: true,
    });

    if (context) {
      // Fill with solid color
      context.fillStyle = color;
      context.fillRect(0, 0, width, height);

      // Add subtle grid pattern for debugging
      context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      context.lineWidth = 1;
      const gridSize = 32;

      for (let x = 0; x < width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      for (let y = 0; y < height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.applyTextureConfig(texture, this.getQualityConfig('medium'));

    return texture;
  }

  /**
   * Create a data texture from typed array
   * Most CORS-safe approach - no canvas involved
   */
  createDataTexture(
    width: number,
    height: number,
    color: { r: number; g: number; b: number; a: number }
  ): THREE.DataTexture {
    const size = width * height;
    const data = new Uint8Array(4 * size);

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);
    const a = Math.floor(color.a * 255);

    for (let i = 0; i < size; i++) {
      const stride = i * 4;
      data[stride] = r;
      data[stride + 1] = g;
      data[stride + 2] = b;
      data[stride + 3] = a;
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );

    texture.needsUpdate = true;
    this.applyTextureConfig(texture, this.getQualityConfig('medium'));

    return texture;
  }

  /**
   * Apply texture configuration
   */
  applyTextureConfig(
    texture: THREE.Texture,
    config: Partial<TextureConfig>
  ): void {
    const fullConfig = { ...this.defaultConfig, ...config };

    texture.format = fullConfig.format;
    texture.type = fullConfig.type;
    texture.generateMipmaps = fullConfig.generateMipmaps;
    texture.wrapS = fullConfig.wrapS;
    texture.wrapT = fullConfig.wrapT;
    texture.magFilter =
      fullConfig.magFilter as THREE.MagnificationTextureFilter;
    texture.minFilter = fullConfig.minFilter;
    texture.anisotropy = fullConfig.anisotropy;
    texture.flipY = fullConfig.flipY;
    texture.premultiplyAlpha = fullConfig.premultiplyAlpha;
    texture.unpackAlignment = fullConfig.unpackAlignment;
    texture.needsUpdate = true;
  }

  /**
   * Get quality-specific configuration
   */
  getQualityConfig(quality: QualityLevel): Partial<TextureConfig> {
    switch (quality) {
      case 'low':
        return {
          width: 256,
          height: 256,
          anisotropy: 1,
          generateMipmaps: false,
        };
      case 'medium':
        return {
          width: 512,
          height: 512,
          anisotropy: 1,
          generateMipmaps: false,
        };
      case 'high':
        return {
          width: 1024,
          height: 1024,
          anisotropy: 2,
          generateMipmaps: false,
        };
      case 'ultra':
        return {
          width: 2048,
          height: 2048,
          anisotropy: 4,
          generateMipmaps: false,
        };
    }
  }
}
