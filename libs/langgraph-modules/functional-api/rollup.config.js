import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/functional-api/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/functional-api/src',
        rootDir: 'libs/langgraph-modules/functional-api/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@hive-academy/langgraph-core',
      '@hive-academy/langgraph-checkpoint',
      '@nestjs/common',
      'reflect-metadata',
      '@nestjs-plus/discovery',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/functional-api/src/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/functional-api/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@hive-academy/langgraph-core',
      '@hive-academy/langgraph-checkpoint',
      '@nestjs/common',
      'reflect-metadata',
      '@nestjs-plus/discovery',
    ],
  },
]);
