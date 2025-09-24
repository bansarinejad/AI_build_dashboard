#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const schema = process.env.PRISMA_SCHEMA
  ? path.resolve(process.env.PRISMA_SCHEMA)
  : path.resolve('prisma/schema.postgres.prisma');
const fallbackMigration = '20250924030000_drop_username';

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status ?? 0,
    output: stdout + stderr,
  };
}

function resolveMigration(migration) {
  console.log(`Attempting to mark migration "${migration}" as rolled back...`);
  return run('npx', [
    'prisma',
    'migrate',
    'resolve',
    '--schema',
    schema,
    '--rolled-back',
    migration,
  ]);
}

function deploy() {
  return run('npx', ['prisma', 'migrate', 'deploy', '--schema', schema]);
}

const firstAttempt = deploy();
if (firstAttempt.status === 0) {
  process.exit(0);
}

const log = firstAttempt.output;
if (!/P3009/.test(log)) {
  process.exit(firstAttempt.status);
}

const match = log.match(/`([^`]+)` migration/);
const migrationName = match?.[1] ?? fallbackMigration;

const resolveResult = resolveMigration(migrationName);
if (resolveResult.status !== 0) {
  process.exit(resolveResult.status);
}

console.log('Retrying prisma migrate deploy...');
const retry = deploy();
process.exit(retry.status);
