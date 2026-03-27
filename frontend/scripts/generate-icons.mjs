#!/usr/bin/env node
/**
 * Generate PWA icons from SVG template using sharp.
 * Run: node scripts/generate-icons.mjs
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

function createSVG(size, padding = 0.15) {
  const p = Math.round(size * padding);
  const inner = size - p * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;
  const fontSize = Math.round(inner * 0.55);
  const textY = cy + fontSize * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#0a0a0f"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#00d4a0" stroke-width="${Math.round(size * 0.03)}" opacity="0.25"/>
  <text x="${cx}" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#00d4a0" text-anchor="middle">$</text>
</svg>`;
}

function createMaskableSVG(size) {
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.round(size * 0.4);
  const textY = cy + fontSize * 0.35;

  // Maskable: safe zone is inner 80%, so icon fills more
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0f"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.round(size * 0.32)}" fill="none" stroke="#00d4a0" stroke-width="${Math.round(size * 0.025)}" opacity="0.25"/>
  <text x="${cx}" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#00d4a0" text-anchor="middle">$</text>
</svg>`;
}

// Generate SVGs (we'll convert to PNG with sharp when available)
const sizes = [192, 512];

for (const size of sizes) {
  writeFileSync(resolve(PUBLIC, `pwa-${size}x${size}.svg`), createSVG(size));
  console.log(`✓ pwa-${size}x${size}.svg`);
}

writeFileSync(resolve(PUBLIC, 'pwa-maskable-512x512.svg'), createMaskableSVG(512));
console.log('✓ pwa-maskable-512x512.svg');

// Apple touch icon (180x180)
writeFileSync(resolve(PUBLIC, 'apple-touch-icon.svg'), createSVG(180));
console.log('✓ apple-touch-icon.svg');

console.log('\nTo convert to PNG, install sharp and run:');
console.log('  npm i -D sharp && node scripts/convert-png.mjs');
console.log('Or use any SVG-to-PNG tool on the generated files.');
