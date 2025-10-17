import { Component } from '@angular/core';

/**
 * Minimal scene graph component for Angular Three NgtCanvas
 * This component is used internally by HybridSceneComponent to provide
 * the required sceneGraph input to NgtCanvas.
 */
@Component({
  selector: 'app-hybrid-scene-graph',
  standalone: true,
  template: `
    <!-- Scene graph content projection -->
    <ng-content></ng-content>
  `,
})
export class HybridSceneGraphComponent {}
