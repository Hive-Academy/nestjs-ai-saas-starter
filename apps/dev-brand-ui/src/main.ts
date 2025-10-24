import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerAngularThreePrimitives } from './app/core/angular-3d/utils/angular-three-primitives';

// Register Angular Three primitives ONCE at application startup
registerAngularThreePrimitives();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
