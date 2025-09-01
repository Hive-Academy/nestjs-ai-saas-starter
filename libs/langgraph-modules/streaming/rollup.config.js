import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/langgraph-modules/streaming/src/index.ts',
    output: [
      {
        file: 'dist/libs/langgraph-modules/streaming/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/langgraph-modules/streaming/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/langgraph-modules/streaming/tsconfig.lib.json',
        declaration: true,
        declarationDir: './dist/libs/langgraph-modules/streaming/src',
        rootDir: './libs/langgraph-modules/streaming/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: [
      '@hive-academy/langgraph-core',
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/websockets',
      'rxjs',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/langgraph-modules/streaming/src/index.d.ts',
    output: {
      file: 'dist/libs/langgraph-modules/streaming/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@hive-academy/langgraph-core',
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/websockets',
      'rxjs',
    ],
  },
]);
