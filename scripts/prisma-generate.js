#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const schema = process.env.PRISMA_SCHEMA || 'prisma/schema.prisma';
const resolved = path.resolve(schema);

const result = spawnSync('npx', ['prisma', 'generate', '--schema', resolved], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
