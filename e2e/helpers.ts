import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PageLocale = 'es' | 'en';

export interface SeededProfile {
  name: string;
  brand: string;
  headline: string;
  location: string;
  remote: boolean;
  bio: string;
}

/** Seeded profile of one locale, so expectations follow `src/content/` instead of copying facts. */
export function seededProfile(locale: PageLocale): SeededProfile {
  const file = join(process.cwd(), 'src/content/profile', `${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as SeededProfile;
}
