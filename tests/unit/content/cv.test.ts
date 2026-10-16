import { describe, expect, it } from 'vitest';
import { cvButton, resolveCv } from '../../../src/lib/content/cv';

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

describe('cvButton', () => {
  it('labels the Spanish CV for a Spanish visitor with no suffix', () => {
    expect(cvButton({ es: { cv: ES } }, 'es')).toEqual({
      href: ES,
      label: 'Descargar CV',
      lang: 'es',
    });
  });

  it('adds the language suffix when an English visitor gets the Spanish CV', () => {
    expect(cvButton({ es: { cv: ES } }, 'en')).toEqual({
      href: ES,
      label: 'Download CV (Spanish)',
      lang: 'es',
    });
  });

  it('has no suffix for an English CV served to an English visitor', () => {
    expect(cvButton({ es: { cv: ES }, en: { cv: EN } }, 'en')).toEqual({
      href: EN,
      label: 'Download CV',
      lang: 'en',
    });
  });

  it('is null when no CV is uploaded, so the page renders no broken link', () => {
    expect(cvButton({ es: {}, en: {} }, 'en')).toBeNull();
    expect(cvButton({}, 'es')).toBeNull();
  });
});
