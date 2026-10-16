import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLUSTERS, stackSchema } from '../../../src/lib/content/schemas';

function fixture(name: string): unknown {
  const url = new URL(`../../fixtures/content/stack/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

describe('stackSchema', () => {
  it('accepts a complete stack item', () => {
    const result = stackSchema.safeParse(fixture('valid'));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'NestJS',
      cluster: 'backend',
      years: 3,
      icon: 'nestjs',
      order: 2,
    });
  });

  it('accepts an item without years (never invented)', () => {
    const result = stackSchema.safeParse(fixture('no-years'));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'TypeScript', cluster: 'languages' });
  });

  it('rejects an unknown cluster naming the field', () => {
    const result = stackSchema.safeParse(fixture('unknown-cluster'));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['cluster']);
  });

  it('rejects negative years naming the field', () => {
    const result = stackSchema.safeParse(fixture('negative-years'));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['years']);
  });

  it('accepts zero years', () => {
    expect(stackSchema.safeParse({ name: 'Rust', cluster: 'languages', years: 0 }).success).toBe(
      true,
    );
  });

  it('does not define an id field: the id comes from the filename', () => {
    expect('id' in stackSchema.shape).toBe(false);
    expect(stackSchema.parse(fixture('extra-id'))).toEqual({ name: 'NestJS', cluster: 'backend' });
  });

  it('exposes the eight clusters in a fixed order', () => {
    expect(CLUSTERS).toEqual([
      'frontend',
      'backend',
      'aws-serverless',
      'data',
      'devops-iac',
      'ai',
      'languages',
      'tools',
    ]);
  });
});
