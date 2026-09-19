import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',

  // Supabase owns sessions; do not auto-provision a second session store.
  session: false,

  markdown: {
    syntaxHighlight: false,
  },

  adapter: cloudflare({
    imageService: 'passthrough',
  }),

  integrations: [react()],

  vite: {
    optimizeDeps: {
      include: [
        'astro/assets/services/noop',
        'astro/logger/json',
      ],
    },
  },

  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
    },
  },
});