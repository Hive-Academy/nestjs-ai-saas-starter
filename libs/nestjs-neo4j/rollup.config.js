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
        tsconfig: 'libs/nestjs-neo4j/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/nestjs-neo4j/src',
        rootDir: 'libs/nestjs-neo4j/src',
      }),
    ],
    external: [
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/config',
      '@nestjs/terminus',
      'neo4j-driver',
      'reflect-metadata',
    ],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/nestjs-neo4j/src/index.d.ts',
    output: {
      file: 'dist/libs/nestjs-neo4j/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/config',
      '@nestjs/terminus',
      'neo4j-driver',
      'reflect-metadata',
    ],
  },
]);
