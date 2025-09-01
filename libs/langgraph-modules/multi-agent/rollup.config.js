import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/multi-agent/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/multi-agent/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/multi-agent/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/multi-agent/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/multi-agent/types',
        rootDir: 'libs/langgraph-modules/multi-agent/src',
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
    input: 'dist/libs/langgraph-modules/multi-agent/types/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/multi-agent/index.d.ts',
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
