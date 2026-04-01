/**
 * Post-build script: adds .js extensions to relative imports
 * in Prisma-generated files under dist/generated/prisma/.
 *
 * Prisma 7 generates extensionless imports (e.g. "./internal/class")
 * which break Node.js ESM resolution.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PRISMA_DIR = join(import.meta.dirname, '..', 'dist', 'generated', 'prisma');

async function getJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJsFiles(full)));
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

// Match relative imports/exports without a file extension
const RE = /(from\s+['"])(\.\.?\/[^'"]*?)(?<!\.\w+)(['"])/g;

async function fixFile(filePath) {
  const src = await readFile(filePath, 'utf8');
  const fixed = src.replace(RE, (match, pre, specifier, quote) => {
    // Skip if it already has an extension
    if (extname(specifier)) return match;
    return `${pre}${specifier}.js${quote}`;
  });
  if (fixed !== src) {
    await writeFile(filePath, fixed, 'utf8');
    console.log(`  fixed: ${filePath}`);
  }
}

const files = await getJsFiles(PRISMA_DIR);
console.log(`Fixing Prisma ESM imports in ${files.length} files...`);
await Promise.all(files.map(fixFile));
console.log('Done.');
