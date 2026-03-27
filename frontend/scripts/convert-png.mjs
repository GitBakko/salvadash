#!/usr/bin/env node
/**
 * Convert SVG icons to PNG for PWA manifest.
 * Run: node scripts/convert-png.mjs
 */
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

const conversions = [
  { input: 'pwa-192x192.svg', output: 'pwa-192x192.png', size: 192 },
  { input: 'pwa-512x512.svg', output: 'pwa-512x512.png', size: 512 },
  { input: 'pwa-maskable-512x512.svg', output: 'pwa-maskable-512x512.png', size: 512 },
  { input: 'apple-touch-icon.svg', output: 'apple-touch-icon.png', size: 180 },
];

for (const { input, output, size } of conversions) {
  await sharp(resolve(PUBLIC, input))
    .resize(size, size)
    .png()
    .toFile(resolve(PUBLIC, output));
  console.log(`✓ ${output}`);
}

console.log('\nAll PNG icons generated.');
