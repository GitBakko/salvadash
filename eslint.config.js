import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.gen.ts',
      'frontend/public/**',
      '**/scripts/**',
      // TSC build outputs that sit next to .ts/.tsx sources (frontend uses tsc -b)
      'frontend/src/**/*.js',
      'frontend/src/**/*.js.map',
      'frontend/src/**/*.d.ts',
      'frontend/src/**/*.d.ts.map',
      '**/__tests__/*.js',
      '**/__tests__/*.js.map',
      '**/__tests__/*.d.ts',
      '**/__tests__/*.d.ts.map',
      'backend/src/generated/**',
      'graphify-out/**',
      'dist-release/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
