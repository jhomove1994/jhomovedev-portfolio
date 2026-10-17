import type { Locale } from '../../i18n/locales';
import { t } from '../../i18n/ui';
import type { AVAILABILITY } from './schemas';

type Availability = (typeof AVAILABILITY)[number];

/**
 * Visible label for the profile availability, or `null` when nothing should be shown.
 * `not-available` renders nothing: the site does not advertise being closed to work.
 */
export function availabilityLabel(locale: Locale, value: Availability): string | null {
  switch (value) {
    case 'open-to-offers':
      return t(locale, 'availability.openToOffers');
    case 'freelance':
      return t(locale, 'availability.freelance');
    case 'not-available':
      return null;
  }
}
