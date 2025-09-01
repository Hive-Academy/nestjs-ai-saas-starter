import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/time-travel/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/time-travel/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/time-travel/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/time-travel/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/time-travel/types',
        rootDir: 'libs/langgraph-modules/time-travel/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@hive-academy/langgraph-checkpoint',
      '@langchain/core',
      '@langchain/langgraph',
      '@nestjs/common',
      'reflect-metadata',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/time-travel/types/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/time-travel/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@hive-academy/langgraph-checkpoint',
      '@langchain/core',
      '@langchain/langgraph',
      '@nestjs/common',
      'reflect-metadata',
    ],
  },
]);
