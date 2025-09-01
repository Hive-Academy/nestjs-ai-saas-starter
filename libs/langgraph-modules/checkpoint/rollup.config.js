import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/checkpoint/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/checkpoint/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/checkpoint/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/checkpoint/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/checkpoint/types',
        rootDir: 'libs/langgraph-modules/checkpoint/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@langchain/core',
      '@langchain/langgraph',
      '@langchain/langgraph-checkpoint-redis',
      '@langchain/langgraph-checkpoint-postgres',
      '@nestjs/common',
      '@nestjs/config',
      'reflect-metadata',
      '@hive-academy/langgraph-core',
      'ioredis',
      'pg',
      'sqlite',
      'sqlite3',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/checkpoint/types/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/checkpoint/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@langchain/core',
      '@langchain/langgraph',
      '@langchain/langgraph-checkpoint-redis',
      '@langchain/langgraph-checkpoint-postgres',
      '@nestjs/common',
      '@nestjs/config',
      'reflect-metadata',
      '@hive-academy/langgraph-core',
      'ioredis',
      'pg',
      'sqlite',
      'sqlite3',
    ],
  },
]);
