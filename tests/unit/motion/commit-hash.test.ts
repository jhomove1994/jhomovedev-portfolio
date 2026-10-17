import { describe, expect, it } from 'vitest';
import { shortHash } from '../../../src/lib/motion/commit-hash';

describe('shortHash', () => {
  it('is a 7-character lowercase hex string, like a short git hash', () => {
    expect(shortHash('2024-05-lead')).toMatch(/^[0-9a-f]{7}$/);
    expect(shortHash('')).toMatch(/^[0-9a-f]{7}$/);
  });

  it('is deterministic: the same slug always gives the same hash', () => {
    expect(shortHash('first-lead-role')).toBe(shortHash('first-lead-role'));
  });

  it('differs between slugs', () => {
    const hashes = ['a', 'b', 'c', 'first-lead-role', 'second-lead-role'].map(shortHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('honours the requested length', () => {
    expect(shortHash('x', 10)).toHaveLength(10);
  });
});
