import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  BoxComponent,
  SphereComponent,
  CylinderComponent,
  TorusComponent,
  PolyhedronComponent,
  GroupComponent,
  AmbientLightComponent,
  DirectionalLightComponent,
  PointLightComponent,
} from '@hive-academy/angular-3d';

import { Colors3D } from '../../../../core/config/colors.config';

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
 * 01. ChromaDB     -> Box (vector storage)
 * 02. Neo4j        -> Icosahedron (graph nodes)
 * 03. Memory       -> Torus (circular context)
 * 04. Checkpoint   -> Octahedron (state snapshots)
 * 05. Functional   -> Tetrahedron (declarative structure)
 * 06. Multi-Agent  -> Dodecahedron (coordination complexity)
 * 07. Platform     -> Cylinder (cloud platform)
 * 08. Time-Travel  -> Torus (timeline loops - substitute for torus knot)
 * 09. Monitoring   -> Sphere (360 observability)
 * 10. HITL         -> Cylinder (approval funnel - cone substitute)
 * 11. Streaming    -> Sphere (data flow - capsule substitute)
 */
@Component({
  selector: 'app-value-propositions-3d-scene',
  standalone: true,
  imports: [
    BoxComponent,
    SphereComponent,
    CylinderComponent,
    TorusComponent,
    PolyhedronComponent,
    GroupComponent,
    AmbientLightComponent,
    DirectionalLightComponent,
    PointLightComponent,
  ],
  template: `
    <a3d-group>
      <!-- Ambient Light -->
      <a3d-ambient-light [intensity]="0.4" />

      <!-- Directional Light -->
      <a3d-directional-light [position]="[5, 5, 5]" [intensity]="1.2" />

      <!-- Point Light (accent) -->
      <a3d-point-light
        [position]="[-5, 3, 0]"
        [intensity]="0.8"
        [color]="indigoColor"
      />

      <!-- Active Library Geometry -->
      @switch (activeLibraryIndex()) { @case (0) {
      <!-- ChromaDB: Box -->
      <a3d-box
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[2, 2, 2]"
        [color]="indigoColor"
        [emissive]="indigoColor"
        [emissiveIntensity]="0.2"
      />
      } @case (1) {
      <!-- Neo4j: Icosahedron (wireframe graph nodes) -->
      <a3d-polyhedron
        type="icosahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.5, 0]"
        [color]="purpleColor"
        [wireframe]="true"
      />
      } @case (2) {
      <!-- Memory: Torus (circular context) -->
      <a3d-torus
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.2, 0.4, 16, 100]"
        [color]="cyanColor"
        [emissive]="cyanColor"
        [emissiveIntensity]="0.2"
      />
      } @case (3) {
      <!-- Checkpoint: Octahedron (state snapshots) -->
      <a3d-polyhedron
        type="octahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.5, 0]"
        [color]="greenColor"
      />
      } @case (4) {
      <!-- Functional: Tetrahedron (declarative structure) -->
      <a3d-polyhedron
        type="tetrahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.5, 0]"
        [color]="amberColor"
      />
      } @case (5) {
      <!-- Multi-Agent: Dodecahedron (coordination) -->
      <a3d-polyhedron
        type="dodecahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.5, 0]"
        [color]="pinkColor"
      />
      } @case (6) {
      <!-- Platform: Cylinder (cloud platform) -->
      <a3d-cylinder
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1, 1, 2, 32]"
        [color]="blueColor"
      />
      } @case (7) {
      <!-- Time-Travel: Torus (timeline loops - substitute for torus knot) -->
      <a3d-torus
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1, 0.3, 100, 16]"
        [color]="violetColor"
        [emissive]="violetColor"
        [emissiveIntensity]="0.2"
      />
      } @case (8) {
      <!-- Monitoring: Sphere (360 observability) -->
      <a3d-sphere
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.5, 32, 32]"
        [color]="tealColor"
        [emissive]="tealColor"
        [emissiveIntensity]="0.2"
        [metalness]="0.3"
        [roughness]="0.4"
      />
      } @case (9) {
      <!-- HITL: Cylinder with zero top radius (cone substitute) -->
      <a3d-cylinder
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[0, 1.2, 2.5, 32]"
        [color]="redColor"
      />
      } @case (10) {
      <!-- Streaming: Sphere (data flow - capsule substitute) -->
      <a3d-sphere
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getScale()"
        [args]="[1.2, 32, 32]"
        [color]="cyanBrightColor"
        [emissive]="cyanBrightColor"
        [emissiveIntensity]="0.2"
        [metalness]="0.3"
        [roughness]="0.4"
      />
      } }

      <!-- Wireframe Overlay for Extra Detail -->
      @if (showWireframe()) { @switch (activeLibraryIndex()) { @case (0) {
      <a3d-box
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[2, 2, 2]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (1) {
      <a3d-polyhedron
        type="icosahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.5, 0]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (2) {
      <a3d-torus
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.2, 0.4, 16, 100]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (3) {
      <a3d-polyhedron
        type="octahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.5, 0]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (4) {
      <a3d-polyhedron
        type="tetrahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.5, 0]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (5) {
      <a3d-polyhedron
        type="dodecahedron"
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.5, 0]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (6) {
      <a3d-cylinder
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1, 1, 2, 32]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (7) {
      <a3d-torus
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1, 0.3, 100, 16]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (8) {
      <a3d-sphere
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.5, 32, 32]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (9) {
      <a3d-cylinder
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[0, 1.2, 2.5, 32]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } @case (10) {
      <a3d-sphere
        [position]="[0, 0, 9.5]"
        [rotation]="getRotation()"
        [scale]="getWireframeScale()"
        [args]="[1.2, 32, 32]"
        [color]="whiteColor"
        [wireframe]="true"
      />
      } } }
    </a3d-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValuePropositions3DSceneComponent {
  /**
   * Active library index (0-10) from parent component
   */
  readonly activeLibraryIndex = input<number>(0);

  /**
   * Scroll progress within current library section (0-1)
   */
  readonly scrollProgress = input<number>(0);

  /**
   * Show wireframe overlay for extra detail
   */
  readonly showWireframe = input<boolean>(true);

  // Color constants using Colors3D configuration
  readonly indigoColor = Colors3D.neon.indigo.hex; // ChromaDB
  readonly purpleColor = Colors3D.neon.purple.hex; // Neo4j
  readonly cyanColor = Colors3D.neon.cyan.hex; // Memory
  readonly greenColor = Colors3D.accent.emerald.hex; // Checkpoint
  readonly amberColor = Colors3D.accent.amber.hex; // Functional
  readonly pinkColor = Colors3D.accent.pink.hex; // Multi-Agent
  readonly blueColor = Colors3D.accent.blue.hex; // Platform
  readonly violetColor = Colors3D.accent.violet.hex; // Time-Travel
  readonly tealColor = Colors3D.accent.teal.hex; // Monitoring
  readonly redColor = Colors3D.neon.red.hex; // HITL
  readonly cyanBrightColor = Colors3D.accent.brightCyan.hex; // Streaming
  readonly whiteColor = Colors3D.material.white.hex; // Wireframe

  /**
   * Get rotation based on scroll progress
   * Rotates on Y and X axes as user scrolls
   */
  getRotation(): [number, number, number] {
    const progress = this.scrollProgress();
    const baseRotation = this.activeLibraryIndex() * 0.5;

    return [
      Math.PI * 0.2 + progress * Math.PI * 0.3,
      baseRotation + progress * Math.PI * 2,
      Math.PI * 0.1,
    ];
  }

  /**
   * Get scale with breathing effect
   * Scales up/down based on scroll progress
   */
  getScale(): [number, number, number] {
    const progress = this.scrollProgress();
    const breathe = 0.8 + Math.sin(progress * Math.PI) * 0.4;

    return [breathe, breathe, breathe];
  }

  /**
   * Get wireframe overlay scale (slightly larger than main geometry)
   */
  getWireframeScale(): [number, number, number] {
    const scale = this.getScale();
    return [scale[0] * 1.02, scale[1] * 1.02, scale[2] * 1.02];
  }
}
