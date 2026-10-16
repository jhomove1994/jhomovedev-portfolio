import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
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
    // Pure core (content, i18n, terminal engine, hero math) must stay testable without
    // Astro virtual modules, React or the heavy 3D/scroll libraries.
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
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'three',
                'three/*',
                '@react-three/*',
                'postprocessing',
                'gsap',
                'gsap/*',
                'lenis',
                'lenis/*',
              ],
              message:
                'src/lib is the pure core: no React and no 3D/scroll libraries. Keep it DOM- and framework-free.',
            },
          ],
        },
      ],
    },
  },
  {
    // The 3D and scroll libraries ship only in the lazily imported scene chunk: static
    // value imports in the always-loaded hero/terminal islands would leak them into the
    // static bundle. Dynamic import() and `import type` stay allowed.
    files: ['src/components/hero/**/*.{ts,tsx}', 'src/components/terminal/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'three',
                'three/*',
                '@react-three/*',
                'postprocessing',
                'gsap',
                'gsap/*',
                'lenis',
                'lenis/*',
              ],
              allowTypeImports: true,
              message:
                'Load three, R3F, gsap and lenis only through the dynamic import of src/components/three.',
            },
          ],
        },
      ],
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ['**/*.tsx'],
  },
  prettier,
];
