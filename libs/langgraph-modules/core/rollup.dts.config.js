import dts from 'rollup-plugin-dts';

export default {
  input: 'dist/libs/langgraph-modules/core/src/index.d.ts',
  output: {
    file: 'dist/libs/langgraph-modules/core/index.d.ts',
    format: 'es',
  },
  plugins: [dts()],
  external: [],
};
