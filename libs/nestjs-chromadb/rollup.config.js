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
        tsconfig: 'libs/nestjs-chromadb/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/nestjs-chromadb/src',
        rootDir: 'libs/nestjs-chromadb/src',
      }),
    ],
    external: [
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/config',
      '@nestjs/terminus',
      'chromadb',
      'reflect-metadata',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/nestjs-chromadb/src/index.d.ts',
    output: {
      file: 'dist/libs/nestjs-chromadb/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/config',
      '@nestjs/terminus',
      'chromadb',
      'reflect-metadata',
    ],
  },
]);
