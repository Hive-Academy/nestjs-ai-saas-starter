import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three';
import { HybridSceneGraphComponent } from '../components/hybrid-scene-graph.component';

/**
 * Test component to verify Angular Three integration
 * Updated to use HybridSceneComponent which now includes lighting internally
 */
@Component({
  selector: 'app-angular-three-test',
  standalone: true,
  imports: [NgtCanvas],
  template: `
    <ngt-canvas [sceneGraph]="sceneGraph">
      <!-- Test basic canvas setup - lighting handled by HybridSceneComponent -->
    </ngt-canvas>
  `,
})
export class AngularThreeTestComponent {
  readonly sceneGraph = HybridSceneGraphComponent;
}
