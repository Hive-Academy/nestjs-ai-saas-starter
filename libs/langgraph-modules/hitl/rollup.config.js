import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/hitl/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/hitl/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/hitl/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/hitl/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/hitl/types',
        rootDir: 'libs/langgraph-modules/hitl/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@hive-academy/langgraph-core',
      '@langchain/core',
      '@langchain/langgraph',
      '@nestjs/common',
      'reflect-metadata',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/hitl/types/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/hitl/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@hive-academy/langgraph-core',
      '@langchain/core',
      '@langchain/langgraph',
      '@nestjs/common',
      'reflect-metadata',
    ],
  },
]);
