import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  // JavaScript bundle
  {
    input: 'libs/dev-brand/backend/feature/src/index.ts',
    output: [
      {
        file: 'dist/libs/dev-brand/backend/feature/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/libs/dev-brand/backend/feature/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'libs/dev-brand/backend/feature/tsconfig.lib.json',
        declaration: true,
        declarationDir: 'dist/libs/dev-brand/backend/feature/types',
        rootDir: 'libs/dev-brand/backend/feature/src',
        compilerOptions: {
          module: 'ESNext',
        },
      }),
    ],
    external: ['@nestjs/common', 'reflect-metadata'],
  },
  // TypeScript definitions bundle
  {
    input: 'dist/libs/dev-brand/backend/feature/types/index.d.ts',
    output: {
      file: 'dist/libs/dev-brand/backend/feature/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: ['@nestjs/common', 'reflect-metadata'],
  },
]);
