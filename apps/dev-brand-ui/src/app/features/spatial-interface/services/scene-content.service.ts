import { Injectable } from '@angular/core';
import * as THREE from 'three';

/**
 * Scene Content Service
 * Manages default scene content creation and animation
 */
@Injectable({
  providedIn: 'root',
})
export class SceneContentService {
  private animatedObjects = new Map<string, THREE.Object3D>();

  /**
   * Add default test content to scene
   */
  addDefaultContent(scene: THREE.Scene): void {
    this.addTestCube(scene);
    this.addParticleSystem(scene);
  }

  /**
   * Add animated test cube
   */
  private addTestCube(scene: THREE.Scene): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.7,
    });
    const testCube = new THREE.Mesh(geometry, material);
    testCube.position.set(0, 0, 0);
    testCube.name = 'testCube';

    scene.add(testCube);
    this.animatedObjects.set('testCube', testCube);
  }

  /**
   * Add constellation particle system
   */
  private addParticleSystem(scene: THREE.Scene): void {
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random positions in a sphere
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;

      // Blue/purple theme colors
      colors[i3] = 0.2 + Math.random() * 0.5;
      colors[i3 + 1] = 0.4 + Math.random() * 0.6;
      colors[i3 + 2] = 0.8 + Math.random() * 0.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.name = 'constellationParticles';

    scene.add(particleSystem);
    this.animatedObjects.set('constellationParticles', particleSystem);
  }

  /**
   * Update animations for default content
   */
  updateAnimations(): void {
    // Animate test cube
    const testCube = this.animatedObjects.get('testCube');
    if (testCube) {
      testCube.rotation.x += 0.01;
      testCube.rotation.y += 0.01;
    }

    // Rotate particle system
    const particles = this.animatedObjects.get('constellationParticles');
    if (particles) {
      particles.rotation.y += 0.001;
    }
  }

  /**
   * Remove default content from scene
   */
  removeDefaultContent(scene: THREE.Scene): void {
    this.animatedObjects.forEach((object, name) => {
      scene.remove(object);

      // Dispose of geometries and materials
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      } else if (object instanceof THREE.Points) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });

    this.animatedObjects.clear();
  }

  /**
   * Check if default content is present
   */
  hasDefaultContent(): boolean {
    return this.animatedObjects.size > 0;
  }
}
