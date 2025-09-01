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
        tsconfig: 'libs/langgraph-modules/nestjs-langgraph/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/langgraph-modules/nestjs-langgraph/src',
        rootDir: 'libs/langgraph-modules/nestjs-langgraph/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@hive-academy/langgraph-core',
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/config',
      'reflect-metadata',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/nestjs-langgraph/src/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/nestjs-langgraph/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@hive-academy/langgraph-core',
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/config',
      'reflect-metadata',
    ],
  },
]);
