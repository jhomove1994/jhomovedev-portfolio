import { describe, expect, it } from 'vitest';
import { emptyToUndefined, isTodo } from '../../src/lib/text';

describe('isTodo', () => {
  it('detects the TODO(autor) marker', () => {
    expect(isTodo('TODO(autor): x')).toBe(true);
    expect(isTodo('  TODO(autor)')).toBe(true);
  });

  it('rejects other text', () => {
    expect(isTodo('todo later')).toBe(false);
    expect(isTodo('Done. TODO(autor) later')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isTodo(undefined)).toBe(false);
    expect(isTodo(42)).toBe(false);
    expect(isTodo(null)).toBe(false);
  });
});

describe('emptyToUndefined', () => {
  it('maps the empty string to undefined', () => {
    expect(emptyToUndefined('')).toBeUndefined();
  });

  it('leaves other values unchanged', () => {
    expect(emptyToUndefined('/uploads/cv.pdf')).toBe('/uploads/cv.pdf');
    expect(emptyToUndefined(0)).toBe(0);
    expect(emptyToUndefined(undefined)).toBeUndefined();
    expect(emptyToUndefined(false)).toBe(false);
  });
});
