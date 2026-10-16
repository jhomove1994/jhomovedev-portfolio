import { describe, expect, it } from 'vitest';
import { uploadPath, yearMonth } from '../../../src/lib/content/schemas';

describe('yearMonth', () => {
  it.each(['2024-05', '2019-12', '1999-01'])('accepts %s', (value) => {
    expect(yearMonth.safeParse(value).success).toBe(true);
  });

  it.each(['May 2024', '2024-13', '2024-00', '2024-5', '2024', 'present'])(
    'rejects %s',
    (value) => {
      expect(yearMonth.safeParse(value).success).toBe(false);
    },
  );
});

describe('uploadPath', () => {
  const schema = uploadPath();

  it('accepts a path under /uploads/', () => {
    expect(schema.parse('/uploads/cv-es.pdf')).toBe('/uploads/cv-es.pdf');
  });

  it('turns an empty string into undefined (Sveltia clears optionals this way)', () => {
    expect(schema.parse('')).toBeUndefined();
  });

  it('accepts a missing value', () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('rejects paths outside /uploads/', () => {
    expect(schema.safeParse('/tmp/x.pdf').success).toBe(false);
  });
});
