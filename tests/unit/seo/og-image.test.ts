import { describe, expect, it } from 'vitest';
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  ogImageAlt,
  ogImageType,
} from '../../../src/lib/seo/og-image';

describe('og image helpers', () => {
  it('exposes the 1200x630 share size', () => {
    expect([OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT]).toEqual([1200, 630]);
  });

  it('derives the MIME type from the file extension', () => {
    expect(ogImageType('/uploads/og.png')).toBe('image/png');
    expect(ogImageType('/uploads/og.PNG')).toBe('image/png');
    expect(ogImageType('https://x.dev/a/og.jpg?v=1')).toBe('image/jpeg');
    expect(ogImageType('/uploads/og.webp')).toBe('image/webp');
    expect(ogImageType('/uploads/og.bin')).toBeUndefined();
  });

  it('builds the alt text from name and headline', () => {
    expect(ogImageAlt('Ada', 'Engineer')).toBe('Ada · Engineer');
  });
});
