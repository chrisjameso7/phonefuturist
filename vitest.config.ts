import { defineConfig } from 'vitest/config';
// Each database suite starts a PostgreSQL WASM instance. Bound concurrency so
// CI and developer laptops do not exhaust memory while keeping isolation intact.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'], maxWorkers: 2 } });
