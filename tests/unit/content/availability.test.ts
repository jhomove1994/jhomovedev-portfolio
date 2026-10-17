import { describe, expect, it } from 'vitest';
import { availabilityLabel } from '../../../src/lib/content/availability';
import { AVAILABILITY } from '../../../src/lib/content/schemas';

describe('availabilityLabel', () => {
  it('labels open-to-offers in both locales', () => {
    expect(availabilityLabel('es', 'open-to-offers')).toBe('Abierto a ofertas');
    expect(availabilityLabel('en', 'open-to-offers')).toBe('Open to offers');
  });

  it('labels freelance in both locales', () => {
    expect(availabilityLabel('es', 'freelance')).toBe('Disponible para proyectos freelance');
    expect(availabilityLabel('en', 'freelance')).toBe('Available for freelance work');
  });

  it('renders nothing for not-available', () => {
    expect(availabilityLabel('es', 'not-available')).toBeNull();
    expect(availabilityLabel('en', 'not-available')).toBeNull();
  });

  it('never returns an empty label and never echoes the raw enum value', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const value of AVAILABILITY) {
        const label = availabilityLabel(locale, value);
        if (label === null) continue;
        expect(label.trim()).not.toBe('');
        expect(label).not.toBe(value);
      }
    }
  });
});
