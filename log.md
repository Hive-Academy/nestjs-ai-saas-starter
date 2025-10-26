npm warn config cache-max This option has been deprecated in favor of `--prefer-online`
(node:17180) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
(Use `node --trace-deprecation ...` to show where the warning was created)

> nx run dev-brand-ui:build:production

[33m❯[39m Building...
[32m✔[39m Building...
[37mApplication bundle generation failed. [4.950 seconds][39m
[37m[39m
[1m[31m[31mX [41;31m[[41;97mERROR[41;31m][0m [1mTS2305: Module '"angular-three"' has no exported member 'injectNgtRef'.[0m [1m[35m[plugin angular-compiler][0m[39m[22m
[1m[31m[39m[22m
[1m[31m apps/dev-brand-ui/src/app/core/angular-3d/components/effects/bloom-effect.component.ts:35:37:[39m[22m
[1m[31m[37m 35 │ ...{ extend, injectBeforeRender, [32minjectNgtRef[37m } from 'angular-three';[39m[22m
[1m[31m ╵ [32m~~~~~~~~~~~~[0m[39m[22m
[1m[31m[39m[22m
[1m[31m[39m[22m

NX Running target build for project dev-brand-ui failed

Failed tasks:

- dev-brand-ui:build:production

Hint: run the command with --verbose for more details.
