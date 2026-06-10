import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    icon: z.string().default('&#9881;'),
    image: z.string().optional(),
    date: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.string(),
    venue: z.string(),
    year: z.number(),
    doi: z.string().optional(),
    link: z.string().optional(),
    abstract: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

export const collections = { projects, publications, blog };
