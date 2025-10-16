import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three';
import { HybridThreeSceneComponent } from '../components/hybrid-three-scene.component';

/**
 * Test component to verify Angular Three integration
 * This will help us understand the correct import and usage patterns
 */
@Component({
  selector: 'app-angular-three-test',
  standalone: true,
  imports: [NgtCanvas],
  template: `
    <ngt-canvas [sceneGraph]="sceneComponent">
      <!-- Test basic canvas setup -->
    </ngt-canvas>
  `,
})
export class AngularThreeTestComponent {
  readonly sceneComponent = HybridThreeSceneComponent;
}
