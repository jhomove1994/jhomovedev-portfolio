import { readdirSync, readFileSync } from 'node:fs';
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

export interface SeededMilestone {
  title: string;
  evidence: string;
  date?: string;
  order: number;
}

const TODO_MARKER = /^\s*TODO\(autor\)/;

/** Seeded milestones of one locale in `order`; placeholders are excluded unless asked for. */
export function seededLeadership(
  locale: PageLocale,
  { includeTodo = false }: { includeTodo?: boolean } = {},
): SeededMilestone[] {
  const dir = join(process.cwd(), 'src/content/leadership', locale);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as SeededMilestone)
    .filter((m) => includeTodo || !(TODO_MARKER.test(m.title) || TODO_MARKER.test(m.evidence)))
    .sort((a, b) => a.order - b.order);
}
