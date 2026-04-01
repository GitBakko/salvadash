#!/usr/bin/env node
/**
 * Convert SVG icons to optimized PNG for PWA manifest + iOS splash screens.
 * Run: node scripts/convert-png.mjs
 */
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

// ── PWA icons ──────────────────────────────────────────────
const pwaSizes = [48, 72, 96, 128, 144, 192, 384, 512];
const maskableSizes = [192, 512];

const conversions = [];

for (const size of pwaSizes) {
  conversions.push({ input: `pwa-${size}x${size}.svg`, output: `pwa-${size}x${size}.png`, w: size, h: size });
}
for (const size of maskableSizes) {
  conversions.push({ input: `pwa-maskable-${size}x${size}.svg`, output: `pwa-maskable-${size}x${size}.png`, w: size, h: size });
}
conversions.push({ input: 'apple-touch-icon.svg', output: 'apple-touch-icon.png', w: 180, h: 180 });

// ── Favicon ICO (from 32x32 favicon.svg) ───────────────────
conversions.push({ input: 'favicon.svg', output: 'favicon-32x32.png', w: 32, h: 32 });
conversions.push({ input: 'favicon.svg', output: 'favicon-16x16.png', w: 16, h: 16 });

// ── Apple splash screens ───────────────────────────────────
const splashFiles = readdirSync(PUBLIC).filter((f) => f.startsWith('apple-splash-') && f.endsWith('.svg'));
for (const f of splashFiles) {
  const match = f.match(/apple-splash-(\d+)x(\d+)\.svg/);
  if (match) {
    conversions.push({ input: f, output: f.replace('.svg', '.png'), w: +match[1], h: +match[2] });
  }
}

// ── Convert all ────────────────────────────────────────────
for (const { input, output, w, h } of conversions) {
  await sharp(resolve(PUBLIC, input)).resize(w, h).png({ quality: 90, compressionLevel: 9 }).toFile(resolve(PUBLIC, output));
  console.log(`✓ ${output}`);
}

// ── Generate favicon.ico (multi-size) ──────────────────────
// sharp doesn't produce .ico natively, so we include 32x32 PNG as fallback
// The SVG favicon is preferred by modern browsers

console.log(`\n✅ ${conversions.length} PNG files generated.`);
