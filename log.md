Angular is running in development mode.
content_script_bundle.js:1 Attempting initialization Tue Oct 14 2025 23:33:41 GMT+0300 (Eastern European Summer Time)
resource.mjs:140 The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed)
effect @ resource.mjs:140Understand this warning
content-texture-pipeline.service.ts:220 ContentTexturePipeline initialized successfully
three-integration.service.ts:113 3D scene 'platform-pillars' created successfully
three-integration.service.ts:141 3D scene 'platform-pillars' activated
root_effect_scheduler.mjs:3583 ERROR RuntimeError: NG0203: effect() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at <https://angular.dev/errors/NG0203>
at assertInInjectionContext (root_effect_scheduler.mjs:2374:15)
at effect (resource.mjs:137:9)
at \_HybridSceneComponent.setupReactiveEffects (hybrid-scene.component.ts:581:5)
at_HybridSceneComponent.<anonymous> (hybrid-scene.component.ts:325:10)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at \_ZoneDelegate.invoke (zone.js:398:28)
at Object.onInvoke (debug_node.mjs:16672:33)
at \_ZoneDelegate.invoke (zone.js:397:34)
at ZoneImpl.run (zone.js:113:43)
handleError @ root_effect_scheduler.mjs:3583Understand this error
hybrid-scene.component.ts:543 Angular Three canvas created: Object
hybrid-three-scene.component.ts:99 Phase 2 Hybrid Three Scene initialized with reactive lighting
client:745 WebSocket connection to 'ws://localhost:4200/?token=1qgqx5dRXc--' failed:
createConnection @ client:745Understand this error
client:755 WebSocket connection to 'ws://localhost:4200/?token=1qgqx5dRXc--' failed:
createConnection @ client:755Understand this error
client:765 [vite] failed to connect to websocket.
your current setup:
(browser) localhost:4200/ <--[HTTP]--> localhost:4200/ (server)
(browser) localhost:4200/ <--[WebSocket (failing)]--> localhost:4200/ (server)
Check out your Vite / network configuration and <https://vite.dev/config/server-options.html#server-hmr> .
connect @ client:765Understand this error
angular-three-foundation.service.ts:144 Failed to initialize Angular Three foundation: Error: Angular Three initialization timeout
at_AngularThreeFoundationService.<anonymous> (angular-three-foundation.service.ts:142:13)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at \_ZoneDelegate.invoke (zone.js:398:28)
at Object.onInvoke (debug_node.mjs:16672:33)
at \_ZoneDelegate.invoke (zone.js:397:34)
at ZoneImpl.run (zone.js:113:43)
at zone.js:2537:40
at_ZoneDelegate.invokeTask (zone.js:431:33)
at debug_node.mjs:16336:55
(anonymous) @ angular-three-foundation.service.ts:144Understand this error
card3d.component.ts:466 Failed to initialize Card3D: Error: Angular Three not initialized
at_AngularThreeFoundationService.createHybridGroup (angular-three-foundation.service.ts:178:13)
at \_HybridUIService.<anonymous> (hybrid-ui.service.ts:173:50)
at Generator.next (<anonymous>)
at chunk-R2QGWZ7S.js:50:61
at new ZoneAwarePromise (zone.js:2701:25)
at **async (chunk-R2QGWZ7S.js:34:10)
at_HybridUIService.createHybridElement (hybrid-ui.service.ts:164:40)
at \_Card3DComponent.<anonymous> (card3d.component.ts:451:56)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
(anonymous) @ card3d.component.ts:466Understand this error
root_effect_scheduler.mjs:3583 ERROR RuntimeError: NG0203: takeUntilDestroyed() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at <https://angular.dev/errors/NG0203>
at assertInInjectionContext (root_effect_scheduler.mjs:2374:15)
at takeUntilDestroyed (rxjs-interop.mjs:29:22)
at_Card3DComponent.setupEventListeners (card3d.component.ts:549:13)
at \_Card3DComponent.<anonymous> (card3d.component.ts:374:10)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at_ZoneDelegate.invoke (zone.js:398:28)
at Object.onInvoke (debug_node.mjs:16672:33)
at_ZoneDelegate.invoke (zone.js:397:34)
at ZoneImpl.run (zone.js:113:43)
handleError @ root_effect_scheduler.mjs:3583Understand this error
card3d.component.ts:466 Failed to initialize Card3D: Error: Angular Three not initialized
at \_AngularThreeFoundationService.createHybridGroup (angular-three-foundation.service.ts:178:13)
at_HybridUIService.<anonymous> (hybrid-ui.service.ts:173:50)
at Generator.next (<anonymous>)
at chunk-R2QGWZ7S.js:50:61
at new ZoneAwarePromise (zone.js:2701:25)
at**async (chunk-R2QGWZ7S.js:34:10)
at \_HybridUIService.createHybridElement (hybrid-ui.service.ts:164:40)
at_Card3DComponent.<anonymous> (card3d.component.ts:451:56)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
(anonymous) @ card3d.component.ts:466Understand this error
root_effect_scheduler.mjs:3583 ERROR RuntimeError: NG0203: takeUntilDestroyed() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at <https://angular.dev/errors/NG0203>
at assertInInjectionContext (root_effect_scheduler.mjs:2374:15)
at takeUntilDestroyed (rxjs-interop.mjs:29:22)
at \_Card3DComponent.setupEventListeners (card3d.component.ts:549:13)
at_Card3DComponent.<anonymous> (card3d.component.ts:374:10)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at \_ZoneDelegate.invoke (zone.js:398:28)
at Object.onInvoke (debug_node.mjs:16672:33)
at \_ZoneDelegate.invoke (zone.js:397:34)
at ZoneImpl.run (zone.js:113:43)
handleError @ root_effect_scheduler.mjs:3583Understand this error
card3d.component.ts:466 Failed to initialize Card3D: Error: Angular Three not initialized
at_AngularThreeFoundationService.createHybridGroup (angular-three-foundation.service.ts:178:13)
at \_HybridUIService.<anonymous> (hybrid-ui.service.ts:173:50)
at Generator.next (<anonymous>)
at chunk-R2QGWZ7S.js:50:61
at new ZoneAwarePromise (zone.js:2701:25)
at **async (chunk-R2QGWZ7S.js:34:10)
at_HybridUIService.createHybridElement (hybrid-ui.service.ts:164:40)
at \_Card3DComponent.<anonymous> (card3d.component.ts:451:56)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
(anonymous) @ card3d.component.ts:466Understand this error
root_effect_scheduler.mjs:3583 ERROR RuntimeError: NG0203: takeUntilDestroyed() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at <https://angular.dev/errors/NG0203>
at assertInInjectionContext (root_effect_scheduler.mjs:2374:15)
at takeUntilDestroyed (rxjs-interop.mjs:29:22)
at_Card3DComponent.setupEventListeners (card3d.component.ts:549:13)
at \_Card3DComponent.<anonymous> (card3d.component.ts:374:10)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at_ZoneDelegate.invoke (zone.js:398:28)
at Object.onInvoke (debug_node.mjs:16672:33)
at_ZoneDelegate.invoke (zone.js:397:34)
at ZoneImpl.run (zone.js:113:43)
handleError @ root_effect_scheduler.mjs:3583Understand this error
card3d.component.ts:466 Failed to initialize Card3D: Error: Angular Three not initialized
at \_AngularThreeFoundationService.createHybridGroup (angular-three-foundation.service.ts:178:13)
at_HybridUIService.<anonymous> (hybrid-ui.service.ts:173:50)
at Generator.next (<anonymous>)
at chunk-R2QGWZ7S.js:50:61
at new ZoneAwarePromise (zone.js:2701:25)
at**async (chunk-R2QGWZ7S.js:34:10)
at \_HybridUIService.createHybridElement (hybrid-ui.service.ts:164:40)
at_Card3DComponent.<anonymous> (card3d.component.ts:451:56)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
(anonymous) @ card3d.component.ts:466Understand this error
root_effect_scheduler.mjs:3583 ERROR RuntimeError: NG0203: takeUntilDestroyed() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at <https://angular.dev/errors/NG0203>
at assertInInjectionContext (root_effect_scheduler.mjs:2374:15)
at takeUntilDestroyed (rxjs-interop.mjs:29:22)
at \_Card3DComponent.setupEventListeners (card3d.component.ts:549:13)
at_Card3DComponent.<anonymous> (card3d.component.ts:374:10)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at \_ZoneDelegate.invoke (zone.js:398:28)
at Object.onInvoke (debug_node.mjs:16672:33)
at \_ZoneDelegate.invoke (zone.js:397:34)
at ZoneImpl.run (zone.js:113:43)
handleError @ root_effect_scheduler.mjs:3583Understand this error
angular-three-foundation.service.ts:144 Failed to initialize Angular Three foundation: Error: Angular Three initialization timeout
at_AngularThreeFoundationService.<anonymous> (angular-three-foundation.service.ts:142:13)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at \_ZoneDelegate.invoke (zone.js:398:28)
at ZoneImpl.run (zone.js:113:43)
at zone.js:2537:40
at_ZoneDelegate.invokeTask (zone.js:431:33)
at ZoneImpl.runTask (zone.js:161:47)
at drainMicroTaskQueue (zone.js:612:35)
at invokeTask (zone.js:519:21)
(anonymous) @ angular-three-foundation.service.ts:144Understand this error
hybrid-scene.component.ts:572 Failed to initialize unified hybrid scene: Error: Failed to initialize Angular Three foundation
at \_HybridSceneComponent.<anonymous> (hybrid-scene.component.ts:569:15)
at Generator.next (<anonymous>)
at fulfilled (chunk-R2QGWZ7S.js:37:24)
at_ZoneDelegate.invoke (zone.js:398:28)
at ZoneImpl.run (zone.js:113:43)
at zone.js:2537:40
at \_ZoneDelegate.invokeTask (zone.js:431:33)
at ZoneImpl.runTask (zone.js:161:47)
at drainMicroTaskQueue (zone.js:612:35)
at invokeTask (zone.js:519:21)
(anonymous) @ hybrid-scene.component.ts:572Understand this error
