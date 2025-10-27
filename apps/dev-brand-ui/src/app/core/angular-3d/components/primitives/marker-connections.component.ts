import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  input,
} from '@angular/core';
import * as THREE from 'three';

interface ConnectionLine {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  glowGeometry?: THREE.BufferGeometry;
  glowMaterial?: THREE.LineBasicMaterial;
}

/**
 * MarkerConnectionsComponent
 *
 * Draws connection lines between the 4 tech stack markers to visualize integration.
 * Creates a connected graph showing relationships: LangChain ↔ LangGraph ↔ ChromaDB ↔ Neo4j ↔ LangChain
 *
 * Network topology:
 * - Line 1: LangChain → LangGraph (top horizontal)
 * - Line 2: LangGraph → ChromaDB (right diagonal)
 * - Line 3: ChromaDB → Neo4j (bottom horizontal)
 * - Line 4: Neo4j → LangChain (left diagonal)
 *
 * Features:
 * - Reactive opacity control via input
 * - Optional glow effect for enhanced visibility
 * - Theme-consistent indigo color scheme
 */
@Component({
  selector: 'app-marker-connections',
  standalone: true,
  imports: [],
  template: `
    <ngt-group>
      @for (line of lines; track line.id) {
      <!-- Glow layer (optional, behind main line) -->
      @if (line.glowGeometry && line.glowMaterial) {
      <ngt-line [geometry]="line.glowGeometry" [material]="line.glowMaterial" />
      }
      <!-- Main connection line -->
      <ngt-line [geometry]="line.geometry" [material]="line.material" />
      }
    </ngt-group>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerConnectionsComponent {
  /**
   * Controls line visibility (0 = invisible, 1 = fully visible)
   * Connected to state store for synchronized animations
   */
  opacity = input<number>(0);

  /**
   * Enable glow effect for enhanced visual impact
   */
  enableGlow = input<boolean>(true);

  /**
   * Array of connection lines with geometries and materials
   */
  protected lines: ConnectionLine[] = [];

  // Marker positions (reference from hero-scene-graph)
  private readonly positions = {
    langchain: new THREE.Vector3(-3, 3, 9.5),
    langgraph: new THREE.Vector3(3.5, 2.5, 9.5),
    neo4j: new THREE.Vector3(-2.5, -3, 9.5),
    chromadb: new THREE.Vector3(3, -2.5, 9.5),
  };

  // Theme color: indigo-500
  private readonly lineColor = 0x6366f1;

  constructor() {
    this.initializeLines();

    // Reactive opacity updates
    effect(() => {
      const opacity = this.opacity();
      this.lines.forEach((line) => {
        line.material.opacity = opacity;
        if (line.glowMaterial) {
          // Glow is more transparent for subtle effect
          line.glowMaterial.opacity = opacity * 0.3;
        }
      });
    });
  }

  /**
   * Creates the 4 connection lines forming a connected graph
   */
  private initializeLines(): void {
    const connections: Array<{
      id: string;
      name: string;
      start: THREE.Vector3;
      end: THREE.Vector3;
    }> = [
      {
        id: 'line-1',
        name: 'LangChain → LangGraph',
        start: this.positions.langchain,
        end: this.positions.langgraph,
      },
      {
        id: 'line-2',
        name: 'LangGraph → ChromaDB',
        start: this.positions.langgraph,
        end: this.positions.chromadb,
      },
      {
        id: 'line-3',
        name: 'ChromaDB → Neo4j',
        start: this.positions.chromadb,
        end: this.positions.neo4j,
      },
      {
        id: 'line-4',
        name: 'Neo4j → LangChain',
        start: this.positions.neo4j,
        end: this.positions.langchain,
      },
    ];

    this.lines = connections.map((conn) => {
      // Main line geometry
      const geometry = new THREE.BufferGeometry().setFromPoints([
        conn.start,
        conn.end,
      ]);

      // Main line material
      const material = new THREE.LineBasicMaterial({
        color: this.lineColor,
        opacity: 0,
        transparent: true,
        linewidth: 2, // Note: linewidth > 1 may not work in WebGL, kept for reference
      });

      // Glow layer (optional)
      let glowGeometry: THREE.BufferGeometry | undefined;
      let glowMaterial: THREE.LineBasicMaterial | undefined;

      if (this.enableGlow()) {
        glowGeometry = new THREE.BufferGeometry().setFromPoints([
          conn.start,
          conn.end,
        ]);

        glowMaterial = new THREE.LineBasicMaterial({
          color: this.lineColor,
          opacity: 0,
          transparent: true,
          linewidth: 4, // Thicker for glow effect
        });
      }

      return {
        id: conn.id,
        name: conn.name,
        geometry,
        material,
        glowGeometry,
        glowMaterial,
      };
    });
  }
}
