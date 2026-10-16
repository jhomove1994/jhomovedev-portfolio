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

/** Collection name -> schema; the admin parity guard compares this against config.yml. */
export const schemaRegistry = { stack: stackSchema };
