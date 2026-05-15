const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const webpack = require('webpack');
const { join } = require('path');

/**
 * Webpack config for the e2e test-bootstrap bundle.
 *
 * Strategy: pass `externalDependencies` as an array containing ONLY a short
 * list of optional NestJS / hive-academy peer modules. Everything else
 * (including all ESM-only packages such as @langchain/*) is inlined into the
 * output CJS bundle. This eliminates the runtime `require('@langchain/...')`
 * calls that would otherwise hit ERR_REQUIRE_ESM when Jest loads the
 * artifact under Node's CJS host.
 *
 * Production webpack.config.js is untouched — this file is referenced only by
 * the dev-brand-api:build-test-bootstrap Nx target.
 */
// Optional peer dependencies that NestJS / Terminus / hive-academy libs
// reference behind try/catch guards (e.g. `@mikro-orm/core`, `@nestjs/typeorm`).
// They are not installed and never used at runtime; webpack must leave them
// as external requires so the bundle compiles.
const OPTIONAL_PEERS = [
  '@mikro-orm/core',
  '@nestjs/microservices',
  '@nestjs/microservices/microservices-module',
  '@nestjs/mongoose',
  '@nestjs/sequelize/dist/common/sequelize.utils',
  '@nestjs/typeorm/dist/common/typeorm.utils',
  'class-transformer/storage',
  // langgraph-core's published bundle has relative requires to
  // ./node-id.inference / ./node-id.normalization that don't exist in the
  // shipped package. Externalize so resolution happens at runtime (matches
  // prod-bundle behaviour) — Node 22 handles the require() either way.
  '@hive-academy/langgraph-core',
  // Externalize @nestjs/core + @nestjs/common so the bundle and the e2e
  // harness share the same runtime class identities. Without this, the
  // bundle inlines its own copies of HttpAdapterHost / Reflector / etc.,
  // and any harness-side DI override (e.g. providing a stub HttpAdapterHost
  // for ClsRootModule under createApplicationContext()) targets a different
  // class identity than the bundle's injection metadata — so the override
  // never matches the inject token and DI still fails.
  '@nestjs/core',
  '@nestjs/common',
];

module.exports = {
  output: {
    path: join(__dirname, '..', '..', 'dist-test', 'apps', 'dev-brand-api'),
    filename: 'test-bootstrap.js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    // Prefer the `import` condition so webpack can pull ESM-only packages
    // (e.g. file-type) into the bundle. Webpack 5 consumes ESM and emits CJS
    // for `target: 'node'`, which is exactly what this bundle needs.
    conditionNames: ['import', 'node', 'require', 'default'],
    // Force `tslib` to resolve to its CJS entry. With the `import` condition
    // prioritized above, webpack would otherwise pick `tslib.es6.mjs`, whose
    // ESM-only exports (e.g. `__extends`) end up undefined when consumed by
    // CJS-emitted helpers in the bundle. Pinning to the CJS file restores the
    // expected runtime shape for downcompiled TS helpers.
    alias: {
      tslib: require.resolve('tslib/tslib.js'),
    },
  },
  // Silence noisy source-map-loader warnings about missing .ts files inside
  // node_modules — they don't affect runtime correctness of the bundle.
  ignoreWarnings: [
    { module: /node_modules/ },
    /Failed to parse source map/,
    /Critical dependency: the request of a dependency is an expression/,
  ],
  plugins: [
    // Several dist packages (e.g. @nestjs/terminus checkPackage.util.js) use
    // a dynamic `require(\`${module}\`)` which webpack treats as a context
    // dependency and tries to bundle every file in the package — including
    // `.js.map` / `.d.ts` files that aren't valid JS modules. Ignore those.
    new webpack.IgnorePlugin({
      resourceRegExp: /(\.js\.map|\.d\.ts|\.d\.ts\.map|\.d)$/,
    }),
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/test-bootstrap.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      // Array form: ONLY these specific optional peers are left as runtime
      // `require()` calls. Every other dep (including all ESM-only packages
      // like @langchain/*) is inlined into the bundle. This is the key to
      // eliminating ERR_REQUIRE_ESM under Jest's CJS host.
      externalDependencies: OPTIONAL_PEERS,
      // Disable source-maps for this bundle. source-map-loader runs as a
      // pre-loader when enabled and chokes on `.js.map` / `.d.ts` files
      // inside node_modules (treats them as JS modules). The harness only
      // needs runtime correctness, not stack-trace mapping.
      sourceMap: false,
    }),
  ],
};
