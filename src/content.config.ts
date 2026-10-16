import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { entryIdFromPath } from './lib/content/entry-id';
import { leadershipSchema, mediaSchema, profileSchema, stackSchema } from './lib/content/schemas';

// Stack ids come from the kebab-case filename (default glob id), not from a field.
const stack = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/stack' }),
  schema: stackSchema,
});

// Per-locale singletons: `profile/es.json` -> id `es/index`.
const profile = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: './src/content/profile',
    generateId: ({ entry }) => entryIdFromPath(entry),
  }),
  schema: profileSchema,
});

const media = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: './src/content/media',
    generateId: ({ entry }) => entryIdFromPath(entry),
  }),
  schema: mediaSchema,
});

// `leadership/<locale>/<slug>.json` -> id `<locale>/<slug>`.
const leadership = defineCollection({
  loader: glob({
    pattern: '*/*.json',
    base: './src/content/leadership',
    generateId: ({ entry }) => entryIdFromPath(entry),
  }),
  schema: leadershipSchema,
});

export const collections = { stack, profile, media, leadership };
