import { describe, expect, it } from 'vitest';
import { formatPeriod } from '../../../src/lib/content/period';

describe('formatPeriod', () => {
  it('formats an open range in English with the present label', () => {
    expect(formatPeriod('2024-05', 'present', 'en', 'Present')).toBe('May 2024 - Present');
  });

  it('formats an open range in Spanish without "de"', () => {
    expect(formatPeriod('2024-05', 'present', 'es', 'Actualidad')).toBe('mayo 2024 - Actualidad');
  });

  it('formats closed ranges in both locales', () => {
    expect(formatPeriod('2019-04', '2023-01', 'es', 'Actualidad')).toBe('abril 2019 - enero 2023');
    expect(formatPeriod('2019-04', '2023-01', 'en', 'Present')).toBe('April 2019 - January 2023');
  });

  it('is not shifted by the host time zone at month boundaries', () => {
    expect(formatPeriod('2023-01', '2023-12', 'en', 'Present')).toBe(
      'January 2023 - December 2023',
    );
  });

  it('throws on malformed input', () => {
    expect(() => formatPeriod('May 2024', 'present', 'en', 'Present')).toThrow(/May 2024/);
    expect(() => formatPeriod('2024-13', 'present', 'en', 'Present')).toThrow(/2024-13/);
    expect(() => formatPeriod('2024-05', '2023', 'en', 'Present')).toThrow(/2023/);
    expect(() => formatPeriod('2024-05', 'now', 'en', 'Present')).toThrow(/now/);
  });
});
