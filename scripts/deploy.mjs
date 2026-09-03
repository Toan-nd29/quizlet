// Patches the build's generated wrangler.json with the real production Worker name and D1
// database (vinext build always emits placeholder values meant for a hosting control plane to
// fill in), then deploys with `wrangler deploy`. Run after `npm run build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WORKER_NAME = 'memostudy';
const DATABASE_NAME = 'memostudy-production';
const DATABASE_ID = 'c9fa50d3-0699-4e29-a352-bc8e2b7d0f15';
const CONFIG_PATH = 'dist/server/wrangler.json';

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
config.name = WORKER_NAME;
config.topLevelName = WORKER_NAME;
config.d1_databases = [{ binding: 'DB', database_name: DATABASE_NAME, database_id: DATABASE_ID }];
writeFileSync(CONFIG_PATH, JSON.stringify(config));

execFileSync('npx', ['wrangler', 'deploy', '--config', 'wrangler.json'], { cwd: 'dist/server', stdio: 'inherit', shell: true });
