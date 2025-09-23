#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function selectSchema() {
  if (process.env.PRISMA_SCHEMA) return process.env.PRISMA_SCHEMA;
  const url = process.env.DATABASE_URL || '';
  if (/^postgres(ql)?:\/\//i.test(url)) {
    return 'prisma/schema.postgres.prisma';
  }
  return 'prisma/schema.prisma';
}

const schemaPath = selectSchema();
const resolved = path.resolve(schemaPath);

const result = spawnSync('npx', ['prisma', 'generate', '--schema', resolved], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
