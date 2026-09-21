// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', '.venv/*', 'pipeline/*', 'src/content/questions.ts', 'scripts/*'],
  },
  {
    // TRD §6: every user-visible string lives in en.json. A string literal in
    // JSX is a build failure, not a code-review note.
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        { noStrings: true, allowedStrings: ['/', '·', '—', '%', '(', ')'], ignoreProps: true },
      ],
    },
  },
]);
