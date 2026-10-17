import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Page } from '@playwright/test';

export type PageLocale = 'es' | 'en';

export interface SeededProfile {
  name: string;
  brand: string;
  headline: string;
  whoami: string;
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

export interface SeededRole {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  achievements: string;
  stack: string[];
  order: number;
}

/** Seeded roles of one locale in `order` (front matter of the Markdown files). */
export function seededExperience(locale: PageLocale): SeededRole[] {
  const dir = join(process.cwd(), 'src/content/experience', locale);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const source = readFileSync(join(dir, file), 'utf8');
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
      return parse(match?.[1] ?? '') as SeededRole;
    })
    .sort((a, b) => a.order - b.order);
}

export interface SeededCertification {
  kind: 'certification' | 'education' | 'training';
  name: string;
  code?: string;
  issuer: string;
  year: number;
  status: 'completed' | 'in-progress';
  credentialUrl?: string;
  order: number;
}

export function seededCertifications(locale: PageLocale): SeededCertification[] {
  const dir = join(process.cwd(), 'src/content/certifications', locale);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as SeededCertification)
    .sort((a, b) => a.order - b.order);
}

/** Stack catalog names by id, so chips are asserted against content rather than copied. */
export function seededStackName(id: string): string {
  const file = join(process.cwd(), 'src/content/stack', `${id}.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as { name: string }).name;
}

export type Gpu = 'hardware' | 'software' | 'none';

/** Deterministic WebGL2: headless Chromium varies, so the context probe is stubbed per scenario. */
export async function stubWebgl2(page: Page, gpu: Gpu): Promise<void> {
  await page.addInitScript((kind: Gpu) => {
    const real = HTMLCanvasElement.prototype.getContext;
    const fake = { getExtension: () => null };
    // @ts-expect-error -- test double: only the probe's `getContext('webgl2')` call is served.
    HTMLCanvasElement.prototype.getContext = function (id: string, attrs?: unknown) {
      if (id !== 'webgl2') return real.call(this, id as '2d', attrs as never);
      const strict =
        (attrs as { failIfMajorPerformanceCaveat?: boolean } | undefined)
          ?.failIfMajorPerformanceCaveat === true;
      if (kind === 'none') return null;
      if (kind === 'software' && strict) return null;
      return fake;
    };
  }, gpu);
}
