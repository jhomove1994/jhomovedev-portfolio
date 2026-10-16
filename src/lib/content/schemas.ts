import { z } from 'astro/zod';
import { emptyToUndefined } from '../text';

/** `YYYY-MM`, the only date shape stored in content (see experience start/end). */
export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');

/** Public media path written by the CMS (`public_folder: /uploads`); `""` means "not set". */
export const uploadPath = () =>
  z.preprocess(emptyToUndefined, z.string().startsWith('/uploads/').optional());

export const CLUSTERS = [
  'frontend',
  'backend',
  'aws-serverless',
  'data',
  'devops-iac',
  'ai',
  'languages',
  'tools',
] as const;

/** The entry id is the kebab-case filename, so there is deliberately no `id` field. */
export const stackSchema = z.object({
  name: z.string(),
  cluster: z.enum(CLUSTERS),
  years: z.number().min(0).optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export const AVAILABILITY = ['open-to-offers', 'freelance', 'not-available'] as const;

/** Optional text the CMS writes as `""` when cleared; normalised to `undefined`. */
const optionalText = (schema: z.ZodType = z.string()) =>
  z.preprocess(emptyToUndefined, schema.optional());

/** Per-locale singleton (`profile/<locale>.json`). Shared fields are duplicated by the CMS. */
export const profileSchema = z.object({
  name: z.string(),
  brand: z.string(),
  headline: z.string(),
  bio: z.string(),
  location: z.string(),
  remote: z.boolean(),
  yearsExperience: z.number().int().positive(),
  availability: z.enum(AVAILABILITY),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  contact: z.object({
    email: z.email(),
    linkedin: z.url(),
    whatsapp: optionalText(),
  }),
  seo: z.object({ title: z.string(), description: z.string() }),
});

/** Per-locale downloadable and social assets; both are optional until the author uploads them. */
export const mediaSchema = z.object({
  cv: uploadPath(),
  ogImage: uploadPath(),
});

/** A dated milestone toward the Tech Lead path; `evidence` is mandatory (rule: no claim without proof). */
export const leadershipSchema = z.object({
  title: z.string(),
  evidence: z.string().trim().min(1),
  date: optionalText(z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Expected YYYY-MM or YYYY')),
  link: optionalText(z.url()),
  order: z.number().int(),
});

/**
 * One role. `stackRef` is injected: the registry passes `z.string()`, the Astro collection passes
 * `reference('stack')`. `achievements` is ONE per-locale Markdown string (a bullet list), not an
 * array, because Sveltia 0.245 cannot add items to a translatable list outside the default locale.
 */
export const experienceSchema = ({ stackRef }: { stackRef: z.ZodType }) =>
  z
    .object({
      role: z.string(),
      company: z.string(),
      location: z.string(),
      start: yearMonth,
      end: z.union([yearMonth, z.literal('present')]),
      achievements: z.string().trim().min(1),
      stack: z.array(stackRef),
      order: z.number().int(),
    })
    .refine((role) => role.end === 'present' || role.end >= role.start, {
      message: 'end must not be before start',
      path: ['end'],
    });

export const CERTIFICATION_KINDS = ['certification', 'education', 'training'] as const;
export const CERTIFICATION_STATUSES = ['completed', 'in-progress'] as const;

/** A credential, degree or course. "Course" is only a UI label for `training`. */
export const certificationSchema = z.object({
  kind: z.enum(CERTIFICATION_KINDS),
  name: z.string(),
  code: optionalText(),
  issuer: z.string(),
  year: z.number().int().min(1000).max(9999),
  status: z.enum(CERTIFICATION_STATUSES).default('completed'),
  credentialUrl: optionalText(z.url()),
  badge: uploadPath(),
  order: z.number().int(),
});

/**
 * One case study. Projects are private, so every narrative field is anonymised prose (or
 * `TODO(autor): ...` until the author writes it). `decisions` is ONE per-locale Markdown string (a
 * bullet list), not an array, for the same Sveltia 0.245 reason as experience `achievements`.
 * `published` has no default on purpose: publishing is an explicit act (the admin widget defaults
 * to false); `repoUrl` is only for projects whose repository is public.
 */
export const projectSchema = ({ stackRef }: { stackRef: z.ZodType }) =>
  z.object({
    title: z.string(),
    summary: z.string(),
    context: z.string(),
    challenge: z.string(),
    role: z.string(),
    decisions: z.string().trim().min(1),
    result: z.string(),
    stack: z.array(stackRef),
    featured: z.boolean().default(false),
    order: z.number().int(),
    published: z.boolean(),
    repoUrl: optionalText(z.url()),
  });

/** Collection name -> schema; the admin parity guard compares this against config.yml. */
export const schemaRegistry = {
  stack: stackSchema,
  profile: profileSchema,
  media: mediaSchema,
  leadership: leadershipSchema,
  experience: experienceSchema({ stackRef: z.string() }),
  certifications: certificationSchema,
  projects: projectSchema({ stackRef: z.string() }),
};
