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
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react-runtime', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
              // Keep immutable evidence payloads out of the executable simulator chunks.
              { name: 'simulation-data', test: /data[\\/](calibration|catalog)[\\/]/, maxSize: 200000, priority: 15 },
              { name: 'simulation-modules', test: /src[\\/]lib[\\/]simulation[\\/]/, minSize: 40000, maxSize: 240000, priority: 10 },
            ],
          },
        },
      },
    },
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
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
    },
  },
});
