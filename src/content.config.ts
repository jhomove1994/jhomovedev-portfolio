import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { stackSchema } from './lib/content/schemas';

// Stack ids come from the kebab-case filename (default glob id), not from a field.
const stack = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/stack' }),
  schema: stackSchema,
});

export const collections = { stack };
