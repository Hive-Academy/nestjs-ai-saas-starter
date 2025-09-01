import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/dev-brand/backend/data-access/src/index.ts',
    output: [
      {
        file: 'dist/libs/dev-brand/backend/data-access/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/dev-brand/backend/data-access/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/dev-brand/backend/data-access/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/dev-brand/backend/data-access/types',
        rootDir: 'libs/dev-brand/backend/data-access/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: ['@nestjs/common', 'reflect-metadata'],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/dev-brand/backend/data-access/types/index.d.ts',
    output: {
      file: 'dist/libs/dev-brand/backend/data-access/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: ['@nestjs/common', 'reflect-metadata'],
  },
]);
