import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from '@angular/core';

/**
 * Value Propositions 3D Scene - Scroll-Driven Geometry Showcase
 *
 * Features:
 * - 11 unique geometries (one per library)
 * - Scroll-synchronized rotation and position
 * - Library-specific colors from tailwind config
 * - Smooth transitions between geometries
 *
 * Geometry Mapping:
 * 01. ChromaDB     → Cube (vector storage)
 * 02. Neo4j        → Icosahedron (graph nodes)
 * 03. Memory       → Torus (circular context)
 * 04. Checkpoint   → Octahedron (state snapshots)
 * 05. Functional   → Tetrahedron (declarative structure)
 * 06. Multi-Agent  → Dodecahedron (coordination complexity)
 * 07. Platform     → Cylinder (cloud platform)
 * 08. Time-Travel  → Torus Knot (timeline loops)
 * 09. Monitoring   → Sphere (360° observability)
 * 10. HITL         → Cone (approval funnel)
 * 11. Streaming    → Capsule (data flow)
 */
@Component({
  selector: 'app-value-propositions-3d-scene',
  standalone: true,
  imports: [],
  template: `
    <ngt-group>
      <!-- Ambient Light -->
      <ngt-ambient-light [intensity]="0.4" />

      <!-- Directional Light -->
      <ngt-directional-light [position]="[5, 5, 5]" [intensity]="1.2" />

      <!-- Point Light (accent) -->
      <ngt-point-light
        [position]="[-5, 3, 0]"
        [intensity]="0.8"
        [color]="indigoColor"
      />

      <!-- Active Library Geometry -->
      @switch (activeLibraryIndex()) { @case (0) {
      <!-- ChromaDB: Cube -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-box-geometry [args]="[2, 2, 2]" />
        <ngt-mesh-standard-material
          [color]="indigoColor"
          [emissive]="indigoColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (1) {
      <!-- Neo4j: Icosahedron (graph nodes) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-icosahedron-geometry [args]="[1.5, 0]" />
        <ngt-mesh-standard-material
          [color]="purpleColor"
          [emissive]="purpleColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
          [wireframe]="true"
        />
      </ngt-mesh>
      } @case (2) {
      <!-- Memory: Torus (circular context) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-torus-geometry [args]="[1.2, 0.4, 16, 100]" />
        <ngt-mesh-standard-material
          [color]="cyanColor"
          [emissive]="cyanColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (3) {
      <!-- Checkpoint: Octahedron (state snapshots) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-octahedron-geometry [args]="[1.5, 0]" />
        <ngt-mesh-standard-material
          [color]="greenColor"
          [emissive]="greenColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (4) {
      <!-- Functional: Tetrahedron (declarative structure) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-tetrahedron-geometry [args]="[1.5, 0]" />
        <ngt-mesh-standard-material
          [color]="amberColor"
          [emissive]="amberColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (5) {
      <!-- Multi-Agent: Dodecahedron (coordination) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-dodecahedron-geometry [args]="[1.5, 0]" />
        <ngt-mesh-standard-material
          [color]="pinkColor"
          [emissive]="pinkColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (6) {
      <!-- Platform: Cylinder (cloud platform) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-cylinder-geometry [args]="[1, 1, 2, 32]" />
        <ngt-mesh-standard-material
          [color]="blueColor"
          [emissive]="blueColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (7) {
      <!-- Time-Travel: Torus Knot (timeline loops) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-torus-knot-geometry [args]="[1, 0.3, 100, 16]" />
        <ngt-mesh-standard-material
          [color]="violetColor"
          [emissive]="violetColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (8) {
      <!-- Monitoring: Sphere (360° observability) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-sphere-geometry [args]="[1.5, 32, 32]" />
        <ngt-mesh-standard-material
          [color]="tealColor"
          [emissive]="tealColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (9) {
      <!-- HITL: Cone (approval funnel) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-cone-geometry [args]="[1.2, 2.5, 32]" />
        <ngt-mesh-standard-material
          [color]="redColor"
          [emissive]="redColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } @case (10) {
      <!-- Streaming: Capsule (data flow) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="getScale()"
      >
        <ngt-capsule-geometry [args]="[0.6, 2, 4, 8]" />
        <ngt-mesh-standard-material
          [color]="cyanBrightColor"
          [emissive]="cyanBrightColor"
          [emissiveIntensity]="0.2"
          [metalness]="0.3"
          [roughness]="0.4"
        />
      </ngt-mesh>
      } }

      <!-- Wireframe Overlay for Extra Detail -->
      @if (showWireframe()) {
      <ngt-mesh
        [position]="[0, 0, 0]"
        [rotation]="getRotation()"
        [scale]="[
          getScale()[0] * 1.02,
          getScale()[1] * 1.02,
          getScale()[2] * 1.02
        ]"
      >
        @switch (activeLibraryIndex()) { @case (0) {
        <ngt-box-geometry [args]="[2, 2, 2]" />
        } @case (1) {
        <ngt-icosahedron-geometry [args]="[1.5, 0]" />
        } @case (2) {
        <ngt-torus-geometry [args]="[1.2, 0.4, 16, 100]" />
        } @case (3) {
        <ngt-octahedron-geometry [args]="[1.5, 0]" />
        } @case (4) {
        <ngt-tetrahedron-geometry [args]="[1.5, 0]" />
        } @case (5) {
        <ngt-dodecahedron-geometry [args]="[1.5, 0]" />
        } @case (6) {
        <ngt-cylinder-geometry [args]="[1, 1, 2, 32]" />
        } @case (7) {
        <ngt-torus-knot-geometry [args]="[1, 0.3, 100, 16]" />
        } @case (8) {
        <ngt-sphere-geometry [args]="[1.5, 32, 32]" />
        } @case (9) {
        <ngt-cone-geometry [args]="[1.2, 2.5, 32]" />
        } @case (10) {
        <ngt-capsule-geometry [args]="[0.6, 2, 4, 8]" />
        } }
        <ngt-mesh-basic-material
          [color]="whiteColor"
          [wireframe]="true"
          [opacity]="0.1"
          [transparent]="true"
        />
      </ngt-mesh>
      }
    </ngt-group>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValuePropositions3DSceneComponent {
  /**
   * Active library index (0-10) from parent component
   */
  activeLibraryIndex = input<number>(0);

  /**
   * Scroll progress within current library section (0-1)
   */
  scrollProgress = input<number>(0);

  /**
   * Show wireframe overlay for extra detail
   */
  showWireframe = input<boolean>(true);

  // Color constants for template bindings (hex literals not allowed in templates)
  readonly indigoColor = 0x6366f1; // Indigo 500 - ChromaDB
  readonly purpleColor = 0x8b5cf6; // Purple 500 - Neo4j
  readonly cyanColor = 0x06b6d4; // Cyan 500 - Memory
  readonly greenColor = 0x10b981; // Green 500 - Checkpoint
  readonly amberColor = 0xf59e0b; // Amber 500 - Functional
  readonly pinkColor = 0xec4899; // Pink 500 - Multi-Agent
  readonly blueColor = 0x3b82f6; // Blue 500 - Platform
  readonly violetColor = 0xa855f7; // Violet 500 - Time-Travel
  readonly tealColor = 0x14b8a6; // Teal 500 - Monitoring
  readonly redColor = 0xef4444; // Red 500 - HITL
  readonly cyanBrightColor = 0x00d9ff; // Cyan bright - Streaming
  readonly whiteColor = 0xffffff; // White - Wireframe

  /**
   * Get rotation based on scroll progress
   * Rotates on Y and X axes as user scrolls
   */
  getRotation(): [number, number, number] {
    const progress = this.scrollProgress();
    const baseRotation = this.activeLibraryIndex() * 0.5; // Offset per library

    return [
      Math.PI * 0.2 + progress * Math.PI * 0.3, // X: gentle tilt + scroll
      baseRotation + progress * Math.PI * 2, // Y: full rotation with scroll
      Math.PI * 0.1, // Z: slight tilt
    ];
  }

  /**
   * Get scale with breathing effect
   * Scales up/down based on scroll progress
   */
  getScale(): [number, number, number] {
    const progress = this.scrollProgress();
    // Breathing: 0.8 → 1.2 → 0.8
    const breathe = 0.8 + Math.sin(progress * Math.PI) * 0.4;

    return [breathe, breathe, breathe];
  }
}
