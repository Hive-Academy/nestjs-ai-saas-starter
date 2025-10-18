/**
 * SceneConfigService - Configuration Service for Scene Graph
 *
 * This service allows HybridSceneComponent (outside NgtCanvas) to pass
 * configuration to HybridSceneGraphComponent (inside NgtCanvas).
 *
 * Pattern:
 * 1. HybridSceneComponent sets config via setConfig()
 * 2. HybridSceneGraphComponent reads config via signals
 */

import { Injectable, signal } from '@angular/core';
import type {
  SphereData,
  CubeData,
} from '../components/hybrid-scene-graph.component';

export interface SceneConfig {
  // Camera
  cameraPosition: readonly [number, number, number];
  cameraTarget: readonly [number, number, number];

  // Scene
  backgroundColor: string;

  // Lighting
  ambientLightColor: number;
  ambientLightIntensity: number;
  directionalLightColor: number;
  directionalLightIntensity: number;
  directionalLightPosition: [number, number, number];
  directionalShadowsEnabled: boolean;
  shadowMapSize: number;
  shadowCameraNear: number;
  shadowCameraFar: number;
  shadowCameraBounds: number;
  pointLightColor: number;
  pointLightIntensity: number;
  pointLightPosition: [number, number, number];

  // Scene content (spheres/cubes)
  spheres: SphereData[];
  cubes: CubeData[];
}

const DEFAULT_CONFIG: SceneConfig = {
  cameraPosition: [0, 0, 5],
  cameraTarget: [0, 0, 0],
  backgroundColor: '#000000',
  ambientLightColor: 0x404040,
  ambientLightIntensity: 0.4,
  directionalLightColor: 0xffffff,
  directionalLightIntensity: 1.0,
  directionalLightPosition: [10, 10, 10],
  directionalShadowsEnabled: true,
  shadowMapSize: 2048,
  shadowCameraNear: 0.1,
  shadowCameraFar: 50,
  shadowCameraBounds: 10,
  pointLightColor: 0x8a2be2,
  pointLightIntensity: 0.8,
  pointLightPosition: [-10, 5, 5],
  spheres: [],
  cubes: [],
};

@Injectable({
  providedIn: 'root',
})
export class SceneConfigService {
  private readonly _config = signal<SceneConfig>(DEFAULT_CONFIG);

  // Readonly signals for consumption
  readonly config = this._config.asReadonly();

  /**
   * Set configuration from HybridSceneComponent
   */
  setConfig(config: Partial<SceneConfig>): void {
    this._config.update((current) => ({ ...current, ...config }));
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this._config.set(DEFAULT_CONFIG);
  }
}
