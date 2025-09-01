import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/core/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/core/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/core/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/core/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/core/types',
        rootDir: 'libs/langgraph-modules/core/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@langchain/core',
      '@langchain/langgraph',
      '@nestjs/common',
      'reflect-metadata',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/core/types/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/core/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@langchain/core',
      '@langchain/langgraph',
      '@nestjs/common',
      'reflect-metadata',
    ],
  },
]);
