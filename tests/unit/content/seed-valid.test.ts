import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { entryIdFromPath, parseEntryId } from '../../../src/lib/content/entry-id';
import { findDanglingRefs } from '../../../src/lib/content/integrity';
import {
  certificationSchema,
  experienceSchema,
  leadershipSchema,
  mediaSchema,
  profileSchema,
  projectSchema,
  stackSchema,
} from '../../../src/lib/content/schemas';
import { SHARED_FIELDS, findSharedMismatches } from '../../../src/lib/content/shared-fields';
import { isTodo } from '../../../src/lib/text';
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
      expect(JSON.stringify(file.data)).not.toMatch(/t[e]l:|wa\.me|\+?\d[\d\s-]{8,}\d/);
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

const leadership = loadCollection('leadership');
const certifications = loadCollection('certifications');

const slugsOf = (files: { id: string }[], locale: string) =>
  files
    .map((file) => parseEntryId(file.id))
    .filter((parsed) => parsed.locale === locale)
    .map((parsed) => parsed.slug)
    .sort();

describe('seed: leadership', () => {
  it.each(leadership.map((file) => [file.id, file] as const))('%s validates', (_id, file) => {
    const result = leadershipSchema.safeParse(file.data);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('has 5 milestones per locale, with the same slugs', () => {
    expect(slugsOf(leadership, 'es')).toHaveLength(5);
    expect(slugsOf(leadership, 'en')).toEqual(slugsOf(leadership, 'es'));
  });

  it('has exactly one TODO(autor) placeholder per locale and four evidence-backed milestones', () => {
    for (const locale of ['es', 'en']) {
      const own = leadership.filter((file) => parseEntryId(file.id).locale === locale);
      expect(own.filter((file) => isTodo(file.data.title))).toHaveLength(1);
      expect(own.filter((file) => !isTodo(file.data.title))).toHaveLength(4);
    }
  });

  it('keeps shared fields equal across locales with no unpaired entry', () => {
    const report = findSharedMismatches(leadership, SHARED_FIELDS.leadership);
    expect(report.mismatches).toEqual([]);
    expect(report.unpaired).toEqual([]);
  });

  it('mentions neither mainframe nor COBOL', () => {
    expect(JSON.stringify(leadership.map((file) => file.data))).not.toMatch(/mainframe|cobol/i);
  });
});

describe('seed: certifications', () => {
  it.each(certifications.map((file) => [file.id, file] as const))('%s validates', (_id, file) => {
    const result = certificationSchema.safeParse(file.data);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('has the same slugs in es and en and no unpaired entry', () => {
    expect(slugsOf(certifications, 'en')).toEqual(slugsOf(certifications, 'es'));
    const report = findSharedMismatches(certifications, SHARED_FIELDS.certifications);
    expect(report.mismatches).toEqual([]);
    expect(report.unpaired).toEqual([]);
  });

  it('has 2 AWS certifications with Credly URLs, 2 education entries and 2 training entries', () => {
    const es = certifications.filter((file) => parseEntryId(file.id).locale === 'es');
    const ofKind = (kind: string) => es.filter((file) => file.data.kind === kind);
    const aws = ofKind('certification');
    expect(aws.map((file) => file.data.code).sort()).toEqual(['AIF-C01', 'CLF-C02']);
    for (const file of aws) {
      expect(file.data.issuer).toBe('AWS');
      expect(String(file.data.credentialUrl)).toMatch(/^https:\/\/www\.credly\.com\/badges\//);
    }
    expect(ofKind('education')).toHaveLength(2);
    expect(ofKind('training')).toHaveLength(2);
  });

  it('marks only the UNIR master as in progress', () => {
    const inProgress = certifications
      .filter((file) => parseEntryId(file.id).locale === 'es' && file.data.status === 'in-progress')
      .map((file) => parseEntryId(file.id).slug);
    expect(inProgress).toEqual(['unir-ai-finance-master']);
  });
});

const projects = loadCollection('projects');
const projectValidator = projectSchema({ stackRef: z.string() });

describe('seed: projects', () => {
  it('has entries in both locales', () => {
    const locales = new Set(projects.map((file) => parseEntryId(file.id).locale));
    expect([...locales].sort()).toEqual(['en', 'es']);
  });

  it.each(projects.map((file) => [file.id, file] as const))('%s validates', (_id, file) => {
    const result = projectValidator.safeParse(file.data);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('every stack id resolves to the catalog', () => {
    const refs = projects.map((file) => ({
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
      projects
        .map((file) => parseEntryId(file.id))
        .filter((parsed) => parsed.locale === locale)
        .map((parsed) => parsed.slug)
        .sort();
    expect(slugs('es')).toEqual([
      'fraud-pilot',
      'legacy-to-nest',
      'this-portfolio',
      'virtual-card',
    ]);
    expect(slugs('en')).toEqual(slugs('es'));
  });

  it('keeps shared fields equal across locales with no unpaired entry', () => {
    const report = findSharedMismatches(projects, SHARED_FIELDS.projects);
    expect(report.mismatches).toEqual([]);
    expect(report.unpaired).toEqual([]);
  });

  it('keeps every seeded project an unpublished draft without a repository link', () => {
    for (const file of projects) {
      expect(file.data.published, file.id).toBe(false);
      expect(file.data.repoUrl, file.id).toBeUndefined();
    }
  });
});
