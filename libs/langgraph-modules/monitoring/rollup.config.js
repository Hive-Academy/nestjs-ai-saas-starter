import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/monitoring/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/monitoring/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/monitoring/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/monitoring/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/monitoring/types',
        rootDir: 'libs/langgraph-modules/monitoring/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: ['@nestjs/common', 'reflect-metadata'],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/monitoring/types/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/monitoring/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: ['@nestjs/common', 'reflect-metadata'],
  },
]);
