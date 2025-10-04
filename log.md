```bash
debug_node.mjs:17990 Angular is running in development mode.
content_script_bundle.js:1 Attempting initialization Sat Oct 04 2025 12:00:44 GMT+0300 (Eastern European Summer Time)
resource.mjs:140 The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed)
effect @ resource.mjs:140
content-texture-pipeline.service.ts:220 ContentTexturePipeline initialized successfully
three-integration.service.ts:113 3D scene 'platform-pillars' created successfully
three-integration.service.ts:141 3D scene 'platform-pillars' activated
root_effect_scheduler.mjs:3583 ERROR RuntimeError: NG0203: effect() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at <https://angular.dev/errors/NG0203>
    at assertInInjectionContext (root_effect_scheduler.mjs:2374:15)
    at effect (resource.mjs:137:9)
    at_HybridSceneComponent.setupReactiveEffects (hybrid-scene.component.ts:581:5)
    at _HybridSceneComponent.<anonymous> (hybrid-scene.component.ts:325:10)
    at Generator.next (<anonymous>)
    at fulfilled (chunk-R2QGWZ7S.js:37:24)
    at_ZoneDelegate.invoke (zone.js:398:28)
    at Object.onInvoke (debug_node.mjs:16672:33)
    at_ZoneDelegate.invoke (zone.js:397:34)
    at ZoneImpl.run (zone.js:113:43)
handleError @ root_effect_scheduler.mjs:3583
hybrid-scene.component.ts:543 Angular Three canvas created: Object
hybrid-three-scene.component.ts:99 Phase 2 Hybrid Three Scene


Object
advance
:
(timestamp, runGlobalEffects) => {…}
camera
:
PerspectiveCamera {isObject3D: true, uuid: '9aa20b2d-6867-45be-9cdc-24fda6c88110', name: '', type: 'PerspectiveCamera', parent: null, …}
clock
:
Clock {autoStart: true, startTime: 0, oldTime: 0, elapsedTime: 0, running: false}
controls
:
null
events
:
{priority: 1, enabled: true, connected: ngt-canvas.hybrid-scene-canvas.performance-optimal.animation-enabled, handlers: {…}, compute: ƒ, …}
flat
:
false
frameloop
:
"always"
gl
:
WebGLRenderer {isWebGLRenderer: true, domElement: canvas, debug: {…}, autoClear: true, autoClearColor: true, …}
internal
:
{active: true, priority: 0, frames: 0, lastEvent: ElementRef, interaction: Array(0), …}
invalidate
:
(frames = 1) => invalidate(store, frames)
legacy
:
false
linear
:
false
performance
:
{current: 1, min: 0.5, max: 1, debounce: 200, regress: ƒ}
pointer
:
_Vector2 {x: 0, y: 0}
pointerMissed$
:
Observable2 {source: Subject2}
previousRoot
:
undefined
raycaster
:
Raycaster {ray: Ray, near: 0, far: Infinity, camera: PerspectiveCamera, layers: Layers, …}
scene
:
Scene {isObject3D: true, uuid: 'e3326a9c-3f7d-4b13-aca8-f9d94fd7fa62', name: '__ngt_root_scene__', type: 'Scene', parent: null, …}
setDpr
:
(dpr) => {…}
setEvents
:
(events) => {…}
setFrameloop
:
(frameloop = "always") => {…}
setSize
:
(width, height, top, left) => {…}
size
:
{width: 1692, height: 898, top: 0, left: 0}
viewport
:
{initialDpr: 1.5, dpr: 1.5, width: 14.457875987309588, height: 7.673269879789604, top: 0, …}
xr
:
{connect: ƒ, disconnect: ƒ}

initialized with reactive lighting
angular-three-foundation.service.ts:144 Failed to initialize Angular Three foundation: Error: Angular Three initialization timeout
    at _AngularThreeFoundationService.<anonymous> (angular-three-foundation.service.ts:142:13)
    at Generator.next (<anonymous>)
    at fulfilled (chunk-R2QGWZ7S.js:37:24)
    at_ZoneDelegate.invoke (zone.js:398:28)
    at Object.onInvoke (debug_node.mjs:16672:33)
    at_ZoneDelegate.invoke (zone.js:397:34)
    at ZoneImpl.run (zone.js:113:43)
    at zone.js:2537:40
    at _ZoneDelegate.invokeTask (zone.js:431:33)
    at debug_node.mjs:16336:55
```
