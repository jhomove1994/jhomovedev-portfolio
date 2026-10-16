import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import { schemaRegistry } from '../../../src/lib/content/schemas';
import { compareSchemaToConfig, type AdminConfig, type SchemaRegistry } from '../../helpers/parity';

type Field = Record<string, unknown>;

function makeRegistry(): SchemaRegistry {
  return {
    experience: z.object({
      role: z.string(),
      kind: z.enum(['full', 'part']),
      end: z.string().optional(),
      featured: z.boolean().default(false),
      meta: z.object({ url: z.string() }),
      links: z.array(z.object({ label: z.string() })),
      stack: z.array(z.string()),
    }),
    profile: z.object({ name: z.string(), badge: z.preprocess((v) => v, z.string().optional()) }),
  };
}

function makeConfig(): { collections: Record<string, unknown>[] } {
  return {
    collections: [
      {
        name: 'experience',
        folder: 'src/content/experience',
        i18n: true,
        fields: [
          { name: 'role', widget: 'string', i18n: true },
          {
            name: 'kind',
            widget: 'select',
            options: [
              { label: 'Full', value: 'full' },
              { label: 'Part', value: 'part' },
            ],
            i18n: 'duplicate',
          },
          { name: 'end', widget: 'string', required: false, i18n: 'duplicate' },
          { name: 'featured', widget: 'boolean', required: false, i18n: 'duplicate' },
          {
            name: 'meta',
            widget: 'object',
            i18n: true,
            fields: [{ name: 'url', widget: 'string' }],
          },
          {
            name: 'links',
            widget: 'list',
            i18n: true,
            fields: [{ name: 'label', widget: 'string' }],
          },
          { name: 'stack', widget: 'list', i18n: 'duplicate' },
        ],
      },
      {
        name: 'settings',
        i18n: true,
        files: [
          {
            name: 'profile',
            file: 'src/content/profile/{{locale}}.json',
            fields: [
              { name: 'name', widget: 'string', i18n: true },
              { name: 'badge', widget: 'image', required: false, i18n: true },
            ],
          },
        ],
      },
    ],
  };
}

function experienceFields(config: ReturnType<typeof makeConfig>): Field[] {
  return config.collections[0].fields as Field[];
}

function check(config: ReturnType<typeof makeConfig>, registry = makeRegistry()): string[] {
  return compareSchemaToConfig(registry, config as AdminConfig);
}

describe('compareSchemaToConfig', () => {
  it('passes when schema and config are in sync', () => {
    expect(check(makeConfig())).toEqual([]);
  });

  it('fails naming a field that exists only in the schema', () => {
    const registry = makeRegistry();
    registry.experience = registry.experience.extend({ foo: z.string() });
    expect(check(makeConfig(), registry)).toEqual([expect.stringContaining('experience.foo')]);
  });

  it('fails naming a field that exists only in the config', () => {
    const config = makeConfig();
    experienceFields(config).push({ name: 'bar', widget: 'string', i18n: true });
    expect(check(config)).toEqual([expect.stringContaining('experience.bar')]);
  });

  it('fails on select options that drift from the schema enum', () => {
    const config = makeConfig();
    experienceFields(config)[1].options = [
      { label: 'Full', value: 'full' },
      { label: 'Intern', value: 'intern' },
    ];
    expect(check(config)).toEqual([expect.stringContaining('experience.kind')]);
  });

  it('accepts plain string select options in the same order-insensitive set', () => {
    const config = makeConfig();
    experienceFields(config)[1].options = ['part', 'full'];
    expect(check(config)).toEqual([]);
  });

  it('fails when an optional schema field is required in the config', () => {
    const config = makeConfig();
    delete experienceFields(config)[2].required;
    expect(check(config)).toEqual([expect.stringContaining('experience.end')]);
  });

  it('fails when a required schema field is marked required:false in the config', () => {
    const config = makeConfig();
    experienceFields(config)[0].required = false;
    expect(check(config)).toEqual([expect.stringContaining('experience.role')]);
  });

  it('treats schema defaults as not required', () => {
    const config = makeConfig();
    delete experienceFields(config)[3].required;
    expect(check(config)).toEqual([expect.stringContaining('experience.featured')]);
  });

  it('fails on a config collection that has no schema', () => {
    const config = makeConfig();
    config.collections.push({ name: 'ghost', folder: 'src/content/ghost', fields: [] });
    expect(check(config)).toEqual([expect.stringContaining('ghost')]);
  });

  it('fails on a schema that has no config collection', () => {
    const config = makeConfig();
    config.collections.splice(0, 1);
    expect(check(config)).toEqual([expect.stringContaining('experience')]);
  });

  it('maps files collection entries to registry keys by file name', () => {
    const config = makeConfig();
    const settings = config.collections[1] as { files: { name: string }[] };
    settings.files[0].name = 'media';
    const issues = check(config);
    expect(issues).toHaveLength(2);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('media'),
        expect.stringContaining('profile'),
      ]),
    );
  });

  it('checks nested object and list-of-object fields', () => {
    const config = makeConfig();
    (experienceFields(config)[4].fields as Field[]).push({ name: 'extra', widget: 'string' });
    (experienceFields(config)[5].fields as Field[]).push({ name: 'bar', widget: 'string' });
    const issues = check(config);
    expect(issues).toHaveLength(2);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('experience.meta.extra'),
        expect.stringContaining('experience.links.bar'),
      ]),
    );
  });

  it('fails when a field in an i18n collection declares i18n:false', () => {
    const config = makeConfig();
    experienceFields(config)[0].i18n = false;
    expect(check(config)).toEqual([expect.stringContaining('experience.role')]);
  });

  it('fails when a field in an i18n collection omits the i18n mode', () => {
    const config = makeConfig();
    delete experienceFields(config)[0].i18n;
    expect(check(config)).toEqual([expect.stringContaining('experience.role')]);
  });

  it('does not require i18n modes in a non-i18n collection', () => {
    const registry: SchemaRegistry = { stack: z.object({ name: z.string() }) };
    const config = {
      collections: [
        {
          name: 'stack',
          folder: 'src/content/stack',
          i18n: false,
          fields: [{ name: 'name', widget: 'string' }],
        },
      ],
    };
    expect(check(config as ReturnType<typeof makeConfig>, registry)).toEqual([]);
  });
});

const configText = (): string => readFileSync('public/admin/config.yml', 'utf8');
const realConfig = (): Record<string, unknown> => parse(configText()) as Record<string, unknown>;

describe('public/admin/config.yml', () => {
  it('is in sync with the Zod schema registry', () => {
    expect(compareSchemaToConfig(schemaRegistry, realConfig())).toEqual([]);
  });

  it('uses the github backend on main with the simple workflow', () => {
    const config = realConfig();
    expect(config.backend).toMatchObject({ name: 'github', branch: 'main' });
    expect((config.backend as { repo: string }).repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
    expect(config.publish_mode ?? 'simple').toBe('simple');
  });

  it('stores media under public/uploads served from /uploads', () => {
    const config = realConfig();
    expect(config.media_folder).toBe('public/uploads');
    expect(config.public_folder).toBe('/uploads');
  });

  it('declares es (default) and en locales in separate folders', () => {
    expect(realConfig().i18n).toMatchObject({
      structure: 'multiple_folders',
      locales: ['es', 'en'],
      default_locale: 'es',
    });
  });

  it('declares profile and media as i18n files of the settings collection', () => {
    const settings = (realConfig().collections as Record<string, unknown>[]).find(
      (collection) => collection.name === 'settings',
    ) as { i18n: unknown; files: { name: string; file: string; i18n: unknown }[] };

    expect(settings.files.map(({ name, file }) => [name, file])).toEqual([
      ['profile', 'src/content/profile/{{locale}}.json'],
      ['media', 'src/content/media/{{locale}}.json'],
    ]);
    // Sveltia 0.245 rejects the config unless BOTH the collection and each {{locale}} file declare i18n.
    expect(settings.i18n).toBe(true);
    expect(settings.files.map((file) => file.i18n)).toEqual([true, true]);
  });

  it('declares leadership as an i18n folder collection loaded from */*.json', () => {
    const leadership = (realConfig().collections as Record<string, unknown>[]).find(
      (collection) => collection.name === 'leadership',
    );

    expect(leadership).toMatchObject({
      folder: 'src/content/leadership',
      extension: 'json',
      format: 'json',
      i18n: true,
    });
  });

  it('declares experience as an i18n Markdown front matter collection', () => {
    const experience = (realConfig().collections as Record<string, unknown>[]).find(
      (collection) => collection.name === 'experience',
    ) as { fields: { name: string; widget?: string; i18n?: unknown; multiple?: boolean }[] };

    expect(experience).toMatchObject({
      folder: 'src/content/experience',
      extension: 'md',
      format: 'frontmatter',
      i18n: true,
    });
    const field = (name: string) => experience.fields.find((candidate) => candidate.name === name);
    // One Markdown string per locale instead of a list (Sveltia cannot grow translatable lists).
    expect(field('achievements')).toMatchObject({ widget: 'markdown', i18n: true });
    expect(field('stack')).toMatchObject({ widget: 'relation', multiple: true, i18n: 'duplicate' });
    for (const name of ['start', 'end', 'order', 'location']) {
      expect(field(name)?.i18n).toBe('duplicate');
    }
  });

  it('declares certifications as an i18n JSON folder collection with enum selects', () => {
    const certifications = (realConfig().collections as Record<string, unknown>[]).find(
      (collection) => collection.name === 'certifications',
    ) as { fields: { name: string; default?: unknown; required?: boolean }[] };

    expect(certifications).toMatchObject({
      folder: 'src/content/certifications',
      extension: 'json',
      format: 'json',
      i18n: true,
    });
    const status = certifications.fields.find((field) => field.name === 'status');
    // The Zod default is "completed", so the widget must preselect it and not demand a value.
    expect(status).toMatchObject({ default: 'completed', required: false });
  });

  it('keeps the repo placeholder flagged until the owner is confirmed', () => {
    expect(configText()).toMatch(/repo:.*#\s*TODO\(autor\)/);
  });

  it('contains no personal access token patterns', () => {
    expect(configText()).not.toMatch(/github_pat_|ghp_/);
  });

  it('points at the same directories as the content loaders', () => {
    const loaderBases = [
      ...readFileSync('src/content.config.ts', 'utf8').matchAll(
        /base:\s*'\.\/(src\/content\/[^']+)'/g,
      ),
    ].map((match) => match[1]);
    const adminDirs = (realConfig().collections as Record<string, unknown>[]).flatMap(
      (collection) =>
        Array.isArray(collection.files)
          ? (collection.files as { file: string }[]).map((file) => dirname(file.file))
          : [String(collection.folder)],
    );

    expect(loaderBases.length).toBeGreaterThan(0);
    expect(adminDirs.sort()).toEqual(loaderBases.sort());
    for (const dir of adminDirs) expect(existsSync(dir)).toBe(true);
  });
});
