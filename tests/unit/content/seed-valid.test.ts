import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { parseEntryId } from '../../../src/lib/content/entry-id';
import { findDanglingRefs } from '../../../src/lib/content/integrity';
import { experienceSchema, stackSchema } from '../../../src/lib/content/schemas';
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
