import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const directory = path.dirname(fileURLToPath(import.meta.url));
const migrations = await readD1Migrations(path.join(directory, 'migrations'));
process.env.SOURCE_HASH_SECRET ||= 'test-source-hash-secret';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          SOURCE_HASH_SECRET: 'test-source-hash-secret'
        }
      }
    })
  ],
  test: {
    setupFiles: ['./test/apply-migrations.js'],
    fileParallelism: false,
    maxWorkers: 1
  }
});
