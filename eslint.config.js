import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier/flat';

export default [
  {
    ignores: [
      'dist',
      '.astro',
      'node_modules',
      'worker-configuration.d.ts',
      'test-results',
      'playwright-report',
      '.atl',
      '.claude',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    // Pure content/i18n logic must stay testable without Astro virtual modules.
    files: ['src/lib/**/*.{ts,js}'],
    ignores: ['src/lib/content/queries.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['astro:*'],
              message: 'Only src/lib/content/queries.ts may import astro:* modules.',
            },
          ],
        },
      ],
    },
  },
  prettier,
];
