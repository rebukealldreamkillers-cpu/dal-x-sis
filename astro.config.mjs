import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://www.dal-x.com',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [sitemap()],
});
