import js from '@eslint/js';
import hooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.expo/**', 'test-results/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest', sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { process: 'readonly', require: 'readonly', console: 'readonly', fetch: 'readonly', URL: 'readonly', AbortController: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', __DEV__: 'readonly' }
    },
    plugins: { 'react-hooks': hooks, react },
    rules: { ...hooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error', 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] }
  },
  { files: ['tests/e2e/**'], languageOptions: { globals: { document: 'readonly' } } }
];
