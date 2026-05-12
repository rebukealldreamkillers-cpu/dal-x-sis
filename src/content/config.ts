import { defineCollection, z } from 'astro:content';

const briefings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    issue: z.number(),
    author: z.string().default('Kevin Moore'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { briefings };
