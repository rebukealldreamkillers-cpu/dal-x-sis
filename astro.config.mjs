import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.dal-x.com',
  output: 'static',
  integrations: [sitemap({ customPages: ['https://www.dal-x.com/weekly/lets-talk-about-it/'] })],
});
