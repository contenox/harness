import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const docsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  draft: z.boolean().optional(),
});

const docs = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!development/internal/**'], base: '../docs' }),
  schema: docsSchema,
});

export const collections = { docs };
