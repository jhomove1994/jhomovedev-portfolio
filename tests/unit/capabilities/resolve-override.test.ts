import { describe, expect, it } from 'vitest';
import {
  HERO_MODE_QUERY_PARAM,
  HERO_MODE_STORAGE_KEY,
  overrideToStored,
  parseOverrideValue,
  resolveOverride,
} from '../../../src/lib/capabilities';

describe('storage contract', () => {
  it('uses the documented key, query parameter and 1/0 values', () => {
    expect(HERO_MODE_STORAGE_KEY).toBe('jhomove:hero-mode');
    expect(HERO_MODE_QUERY_PARAM).toBe('3d');
    expect(overrideToStored('on')).toBe('1');
    expect(overrideToStored('off')).toBe('0');
  });
});

describe('parseOverrideValue', () => {
  it.each([
    ['1', 'on'],
    ['0', 'off'],
    ['maybe', null],
    ['', null],
    ['true', null],
    [null, null],
  ])('%j -> %j', (raw, expected) => {
    expect(parseOverrideValue(raw)).toBe(expected);
  });
});

describe('resolveOverride', () => {
  it('lets the query win over storage and persists the query value', () => {
    expect(resolveOverride({ query: '0', stored: '1' })).toEqual({ override: 'off', persist: '0' });
    expect(resolveOverride({ query: '1', stored: '0' })).toEqual({ override: 'on', persist: '1' });
  });

  it('uses the stored value when there is no query and persists nothing', () => {
    expect(resolveOverride({ query: null, stored: '1' })).toEqual({
      override: 'on',
      persist: null,
    });
    expect(resolveOverride({ query: null, stored: '0' })).toEqual({
      override: 'off',
      persist: null,
    });
  });

  it('ignores invalid values and persists nothing', () => {
    expect(resolveOverride({ query: 'maybe', stored: 'x' })).toEqual({
      override: null,
      persist: null,
    });
  });

  it('falls back to a valid stored value when the query is invalid', () => {
    expect(resolveOverride({ query: 'maybe', stored: '1' })).toEqual({
      override: 'on',
      persist: null,
    });
  });

  it('resolves to null when storage is unavailable and there is no query', () => {
    expect(resolveOverride({ query: null, stored: null })).toEqual({
      override: null,
      persist: null,
    });
  });

  it('still honours the query when storage is unavailable', () => {
    expect(resolveOverride({ query: '1', stored: null })).toEqual({ override: 'on', persist: '1' });
  });
});
