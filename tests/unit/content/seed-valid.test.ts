import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { entryIdFromPath, parseEntryId } from '../../../src/lib/content/entry-id';
import { findDanglingRefs } from '../../../src/lib/content/integrity';
import {
  experienceSchema,
  mediaSchema,
  profileSchema,
  stackSchema,
} from '../../../src/lib/content/schemas';
import { SHARED_FIELDS, findSharedMismatches } from '../../../src/lib/content/shared-fields';
import { loadCollection } from '../../helpers/load-content';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const stack = loadCollection('stack');
const experience = loadCollection('experience');
const experienceValidator = experienceSchema({ stackRef: z.string() });

describe('seed: stack catalog', () => {
  it('is not empty', () => {
    expect(stack.length).toBeGreaterThan(0);
  });

  it.each(stack.map((file) => [file.path, file] as const))(
    '%s has a kebab-case filename and a valid body',
    (_path, file) => {
      expect(file.id).toMatch(KEBAB);
      const result = stackSchema.safeParse(file.data);
      expect(result.error?.issues ?? []).toEqual([]);
      expect(file.data).not.toHaveProperty('years');
    },
  );
});

describe('seed: experience', () => {
  it('has entries in both locales', () => {
    const locales = new Set(experience.map((file) => parseEntryId(file.id).locale));
    expect([...locales].sort()).toEqual(['en', 'es']);
  });

  it.each(experience.map((file) => [file.id, file] as const))('%s validates', (_id, file) => {
    const result = experienceValidator.safeParse({ ...file.data, stack: [] });
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it.each(experience.map((file) => [file.id, file] as const))(
    '%s achievements is a Markdown list of 3 to 4 bullets',
    (_id, file) => {
      const bullets = String(file.data.achievements)
        .split('\n')
        .filter((line) => line.startsWith('- '));
      expect(bullets.length).toBeGreaterThanOrEqual(3);
      expect(bullets.length).toBeLessThanOrEqual(4);
    },
  );

  it('every stack id resolves to the catalog', () => {
    const refs = experience.map((file) => ({
      file: file.path,
      ids: (file.data.stack as string[] | undefined) ?? [],
    }));
    expect(
      findDanglingRefs(
        refs,
        stack.map((file) => file.id),
      ),
    ).toEqual([]);
  });

  it('has the same slugs in es and en', () => {
    const slugs = (locale: string) =>
      experience
        .map((file) => parseEntryId(file.id))
        .filter((parsed) => parsed.locale === locale)
        .map((parsed) => parsed.slug)
        .sort();
    expect(slugs('en')).toEqual(slugs('es'));
  });

  it('keeps shared fields equal across locales with no unpaired entry', () => {
    const report = findSharedMismatches(experience, SHARED_FIELDS.experience);
    expect(report.mismatches).toEqual([]);
    expect(report.unpaired).toEqual([]);
  });
});

/** Singleton files (`es.json`) get the Content Layer id `es/index`. */
const singletons = (collection: string) =>
  loadCollection(collection).map((file) => ({ ...file, id: entryIdFromPath(file.path) }));

const profile = singletons('profile');
const media = singletons('media');

describe('seed: profile', () => {
  it('has exactly one file per locale', () => {
    expect(profile.map((file) => file.id).sort()).toEqual(['en/index', 'es/index']);
  });

  it.each(profile.map((file) => [file.id, file] as const))('%s validates', (_id, file) => {
    const result = profileSchema.safeParse(file.data);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it.each(profile.map((file) => [file.id, file] as const))(
    '%s never publishes WhatsApp or a phone number',
    (_id, file) => {
      expect(file.data.contact).not.toHaveProperty('whatsapp');
      expect(JSON.stringify(file.data)).not.toMatch(/tel:|wa\.me|\+?\d[\d\s-]{8,}\d/);
    },
  );

  it('keeps shared fields equal across locales', () => {
    const report = findSharedMismatches(profile, SHARED_FIELDS.profile);
    expect(report.mismatches).toEqual([]);
    expect(report.unpaired).toEqual([]);
  });

  it('uses the CV email and LinkedIn, and the approved headline per locale', () => {
    const byLocale = Object.fromEntries(
      profile.map((file) => [parseEntryId(file.id).locale, file]),
    );
    expect(byLocale.es?.data.contact).toEqual({
      email: 'aplicacionesjmoreno@gmail.com',
      linkedin: 'https://linkedin.com/in/jhonatan-moreno-velasquez',
    });
    expect(byLocale.es?.data.headline).toBe('Senior Full Stack Developer · camino a Tech Lead');
    expect(byLocale.en?.data.headline).toBe(
      'Senior Full Stack Developer · on the path to Tech Lead',
    );
  });

  it('lists the same number of languages in both locales (Sveltia cannot add items in en)', () => {
    const counts = profile.map((file) => (file.data.languages as unknown[]).length);
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBeGreaterThan(0);
  });

  it('keeps the contact email inside content only', () => {
    const root = join(process.cwd(), 'src');
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
        const full = join(dir, dirent.name);
        return dirent.isDirectory() ? walk(full) : [full];
      });
    const offenders = walk(root)
      .filter((file) => !file.includes(`${join('src', 'content')}/`))
      .filter((file) => readFileSync(file, 'utf8').includes('aplicacionesjmoreno@gmail.com'));
    expect(offenders).toEqual([]);
  });
});

describe('seed: media', () => {
  it('has exactly one file per locale', () => {
    expect(media.map((file) => file.id).sort()).toEqual(['en/index', 'es/index']);
  });

  it.each(media.map((file) => [file.id, file] as const))(
    '%s validates and carries no upload yet',
    (_id, file) => {
      const result = mediaSchema.safeParse(file.data);
      expect(result.error?.issues ?? []).toEqual([]);
      expect(file.data).toEqual({});
    },
  );
});
