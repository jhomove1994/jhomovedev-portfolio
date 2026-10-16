import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { projectSchema } from '../../../src/lib/content/schemas';

type Json = Record<string, unknown>;

const schema = projectSchema({ stackRef: z.string() });

const valid = (): Json =>
  JSON.parse(
    readFileSync(new URL('../../fixtures/content/project/valid.json', import.meta.url), 'utf8'),
  ) as Json;

const withFields = (overrides: Json): Json => ({ ...valid(), ...overrides });
const without = (key: string): Json =>
  Object.fromEntries(Object.entries(valid()).filter(([name]) => name !== key));

describe('projectSchema', () => {
  it('accepts an unpublished draft whose narrative fields are TODO(autor)', () => {
    const result = schema.safeParse(valid());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ published: false, order: 1 });
    expect(result.data?.summary).toMatch(/^TODO\(autor\)/);
  });

  it('rejects a project without an explicit published flag naming published', () => {
    const result = schema.safeParse(without('published'));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['published']);
  });

  it('rejects a non-boolean published value', () => {
    expect(schema.safeParse(withFields({ published: 'yes' })).success).toBe(false);
  });

  it('accepts published true', () => {
    expect(schema.parse(withFields({ published: true })).published).toBe(true);
  });

  it('defaults featured to false when omitted', () => {
    expect(schema.parse(without('featured')).featured).toBe(false);
  });

  it('keeps an explicit featured true', () => {
    expect(schema.parse(withFields({ featured: true })).featured).toBe(true);
  });

  it('treats repoUrl as optional', () => {
    expect(schema.parse(valid()).repoUrl).toBeUndefined();
  });

  it('accepts a valid repoUrl', () => {
    const url = 'https://github.com/example/repo';
    expect(schema.parse(withFields({ repoUrl: url })).repoUrl).toBe(url);
  });

  it('rejects a repoUrl that is not a URL naming repoUrl', () => {
    const result = schema.safeParse(withFields({ repoUrl: 'not a url' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['repoUrl']);
  });

  it('normalises a cleared repoUrl ("") to undefined', () => {
    expect(schema.parse(withFields({ repoUrl: '' })).repoUrl).toBeUndefined();
  });

  it('keeps decisions as one Markdown list string and rejects an array', () => {
    expect(schema.parse(valid()).decisions).toContain('\n- ');
    expect(schema.safeParse(withFields({ decisions: ['a', 'b'] })).success).toBe(false);
  });

  it.each(['', '   '])('rejects empty decisions %j', (decisions) => {
    expect(schema.safeParse(withFields({ decisions })).success).toBe(false);
  });

  it.each(['title', 'summary', 'context', 'challenge', 'role', 'result', 'order'])(
    'requires %s',
    (key) => {
      const result = schema.safeParse(without(key));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual([key]);
    },
  );

  it('injects stackRef for stack ids', () => {
    const strict = projectSchema({ stackRef: z.enum(['typescript']) });
    expect(strict.safeParse(withFields({ stack: ['typescript'] })).success).toBe(true);
    expect(strict.safeParse(withFields({ stack: ['cobol'] })).success).toBe(false);
  });

  it('requires an integer order', () => {
    expect(schema.safeParse(withFields({ order: 1.5 })).success).toBe(false);
  });
});
