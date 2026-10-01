/* eslint-env node */
// ESLint config for the React + Vite client (`npm run lint` runs with --max-warnings 0,
// so every enabled rule effectively fails the build).
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dev-dist', 'node_modules', 'android', '*.cjs'],
  rules: {
    // Pervasive in this codebase (100+ sites); tighten in a dedicated cleanup.
    '@typescript-eslint/no-explicit-any': 'off',
    // `_`-prefixed names mark intentionally unused values.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // Apostrophes in JSX text are fine; this rule is about stray `>` / `}` typos.
    'react/no-unescaped-entities': 'off',
    // ~30 pre-existing effects with incomplete dependency arrays. Changing them alters
    // fetch timing, so re-enable and fix deliberately rather than in a lint sweep.
    'react-hooks/exhaustive-deps': 'off',
  },
};
