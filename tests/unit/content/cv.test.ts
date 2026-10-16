import { describe, expect, it } from 'vitest';
import { resolveCv } from '../../../src/lib/content/cv';

const ES = '/uploads/cv-es.pdf';
const EN = '/uploads/cv-en.pdf';

describe('resolveCv', () => {
  it('serves the Spanish CV to a Spanish visitor without fallback', () => {
    expect(resolveCv({ es: { cv: ES } }, 'es')).toEqual({
      href: ES,
      fileLocale: 'es',
      isFallback: false,
    });
  });

  it('falls back to the Spanish CV for an English visitor when no English CV is set', () => {
    expect(resolveCv({ es: { cv: ES }, en: {} }, 'en')).toEqual({
      href: ES,
      fileLocale: 'es',
      isFallback: true,
    });
  });

  it('serves the English CV to an English visitor when both exist', () => {
    expect(resolveCv({ es: { cv: ES }, en: { cv: EN } }, 'en')).toEqual({
      href: EN,
      fileLocale: 'en',
      isFallback: false,
    });
  });

  it('keeps the Spanish CV for a Spanish visitor even when an English CV exists', () => {
    expect(resolveCv({ es: { cv: ES }, en: { cv: EN } }, 'es')?.href).toBe(ES);
  });

  it('returns null when no CV is uploaded for any locale', () => {
    expect(resolveCv({ es: {}, en: {} }, 'en')).toBeNull();
    expect(resolveCv({}, 'es')).toBeNull();
  });

  it('returns null for an English-only upload seen by a Spanish visitor', () => {
    // The default locale is the source of truth: an English CV is never served in place of it.
    expect(resolveCv({ es: {}, en: { cv: EN } }, 'es')).toBeNull();
  });

  it('treats an empty string as not uploaded', () => {
    expect(resolveCv({ es: { cv: '' } }, 'es')).toBeNull();
    expect(resolveCv({ es: { cv: ES }, en: { cv: '' } }, 'en')?.isFallback).toBe(true);
  });
});
