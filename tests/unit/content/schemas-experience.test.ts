import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { experienceSchema } from '../../../src/lib/content/schemas';

type Json = Record<string, unknown>;

const schema = experienceSchema({ stackRef: z.string() });

const valid = (): Json =>
  JSON.parse(
    readFileSync(new URL('../../fixtures/content/experience/valid.json', import.meta.url), 'utf8'),
  ) as Json;

const withFields = (overrides: Json): Json => ({ ...valid(), ...overrides });

describe('experienceSchema', () => {
  it('accepts an ongoing role (end "present")', () => {
    const result = schema.safeParse(valid());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ start: '2024-05', end: 'present', order: 1 });
    expect(result.data?.stack).toEqual(['typescript', 'nestjs']);
  });

  it('accepts a closed range where end is after start', () => {
    expect(schema.safeParse(withFields({ start: '2019-04', end: '2023-01' })).success).toBe(true);
  });

  it('accepts a range that starts and ends in the same month', () => {
    expect(schema.safeParse(withFields({ start: '2023-01', end: '2023-01' })).success).toBe(true);
  });

  it('rejects an end before the start naming end', () => {
    const result = schema.safeParse(withFields({ start: '2024-05', end: '2023-01' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['end']);
  });

  it.each(['May 2024', '2024-5', '2024-13'])('rejects the start %s', (start) => {
    const result = schema.safeParse(withFields({ start }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['start']);
  });

  it('rejects an end that is neither YYYY-MM nor "present"', () => {
    expect(schema.safeParse(withFields({ end: 'now' })).success).toBe(false);
  });

  it('keeps achievements as one Markdown list string', () => {
    const { achievements } = schema.parse(valid());
    expect(typeof achievements).toBe('string');
    const bullets = achievements.split('\n').filter((line) => /^\s*[-*]\s+\S/.test(line));
    expect(bullets).toHaveLength(3);
  });

  it('rejects an array of achievements', () => {
    const result = schema.safeParse(withFields({ achievements: ['one', 'two'] }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['achievements']);
  });

  it('rejects empty or whitespace-only achievements', () => {
    expect(schema.safeParse(withFields({ achievements: '' })).success).toBe(false);
    expect(schema.safeParse(withFields({ achievements: '  \n ' })).success).toBe(false);
  });

  it('takes stack ids as strings through the injected reference schema', () => {
    expect(schema.safeParse(withFields({ stack: [1] })).success).toBe(false);
    const strict = experienceSchema({ stackRef: z.enum(['typescript']) });
    expect(strict.safeParse(withFields({ stack: ['cobol'] })).success).toBe(false);
  });

  it('requires an integer order', () => {
    expect(schema.safeParse(withFields({ order: 1.5 })).success).toBe(false);
    const withoutOrder = valid();
    delete withoutOrder.order;
    expect(schema.safeParse(withoutOrder).success).toBe(false);
  });

  it('exposes its shape for the admin parity guard', () => {
    expect(Object.keys(schema.shape).sort()).toEqual(
      ['achievements', 'company', 'end', 'location', 'order', 'role', 'stack', 'start'].sort(),
    );
  });
});
