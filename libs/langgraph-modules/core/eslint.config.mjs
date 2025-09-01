import baseConfig from '../../../eslint.config.mjs';
import { libraryEslintConfig } from '../../../eslint.library.config.mjs';

export default [
  ...baseConfig,
  libraryEslintConfig,
];
