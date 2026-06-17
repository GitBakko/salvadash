#!/usr/bin/env node
// Assembles a production release package under dist-release/salvadash-v<version>/.
//
// Honors the prod-deploy gotchas in CLAUDE.md:
//   1. frontend is FLATTENED — frontend/dist/* lands directly in <pkg>/frontend/
//      (IIS site root is <app>\frontend\, not \frontend\dist\).
//   2. frontend/web.config is NEVER shipped (prod has its own minimal config).
//   3. only built output + prod config files — no node_modules / src / .env.
//
// Usage:
//   node scripts/package-release.mjs [--skip-build] [--out <dir>]
//
// A non-zero exit means a structural check failed — never ship a failed package.

import { execSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const outIdx = args.indexOf('--out');
const outBase = outIdx !== -1 ? resolve(args[outIdx + 1]) : join(ROOT, 'dist-release');

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const dest = join(outBase, `salvadash-v${version}`);

function copyDir(from, to) {
  cpSync(from, to, { recursive: true });
}

console.log(`\n📦 Packaging SalvaDash v${version} → ${dest}\n`);

if (!skipBuild) {
  console.log('› Building (shared → backend → frontend)…');
  execSync('pnpm build', { cwd: ROOT, stdio: 'inherit' });
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

// ── Root workspace files ──────────────────────────────────
for (const f of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
  copyFileSync(join(ROOT, f), join(dest, f));
}

// ── shared (built) ────────────────────────────────────────
mkdirSync(join(dest, 'shared'), { recursive: true });
copyDir(join(ROOT, 'shared/dist'), join(dest, 'shared/dist'));
copyFileSync(join(ROOT, 'shared/package.json'), join(dest, 'shared/package.json'));

// ── backend (built + prod config) ─────────────────────────
const beDest = join(dest, 'backend');
mkdirSync(join(beDest, 'prisma'), { recursive: true });
copyDir(join(ROOT, 'backend/dist'), join(beDest, 'dist'));
for (const f of ['package.json', 'ecosystem.config.json', 'prisma.config.ts']) {
  copyFileSync(join(ROOT, 'backend', f), join(beDest, f));
}
copyFileSync(join(ROOT, 'backend/prisma/schema.prisma'), join(beDest, 'prisma/schema.prisma'));

// ── frontend (FLATTENED, web.config EXCLUDED) ─────────────
const feDest = join(dest, 'frontend');
cpSync(join(ROOT, 'frontend/dist'), feDest, {
  recursive: true,
  filter: (src) => !src.endsWith('web.config'),
});
rmSync(join(feDest, 'web.config'), { force: true }); // belt-and-suspenders

// ── Structural validation ─────────────────────────────────
const checks = [
  [existsSync(join(feDest, 'index.html')), 'frontend/index.html present (flattened)'],
  [!existsSync(join(feDest, 'web.config')), 'frontend/web.config absent'],
  [existsSync(join(feDest, 'assets')), 'frontend/assets/ present'],
  [!existsSync(join(feDest, 'dist')), 'frontend NOT double-nested (no frontend/dist/)'],
  [existsSync(join(beDest, 'dist', 'index.js')), 'backend/dist/index.js built'],
  [existsSync(join(beDest, 'prisma', 'schema.prisma')), 'backend/prisma/schema.prisma present'],
  [existsSync(join(dest, 'shared', 'dist')), 'shared/dist present'],
  [existsSync(join(dest, 'pnpm-lock.yaml')), 'pnpm-lock.yaml present'],
];

let ok = true;
for (const [pass, msg] of checks) {
  console.log(`  ${pass ? '✓' : '✗'} ${msg}`);
  if (!pass) ok = false;
}

if (!ok) {
  console.error('\n✗ Release validation FAILED — package not usable.\n');
  process.exit(1);
}

console.log(`\n✓ Release package ready: ${dest}`);
console.log(`  Reminder: add UPGRADE-v${version}.md (manual, release-specific) before shipping.\n`);
