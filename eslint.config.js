import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const noMathRandom = {
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: '시드 RNG(src/engine/rng.ts)만 쓴다.' },
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'sim/out'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: noMathRandom,
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/main.tsx'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['sim/**/*.ts', 'tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // 엔진은 순수 TypeScript. React·DOM·window·localStorage 금지 (CLAUDE.md)
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'react/*', 'react-dom/*', '../ui/*', '../ui'] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator'],
    },
  },
);
