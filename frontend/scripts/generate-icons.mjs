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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0f"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.round(size * 0.32)}" fill="none" stroke="#00d4a0" stroke-width="${Math.round(size * 0.025)}" opacity="0.25"/>
  <text x="${cx}" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#00d4a0" text-anchor="middle">$</text>
</svg>`;
}

function createSplashSVG(width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const iconSize = Math.min(width, height) * 0.2;
  const fontSize = Math.round(iconSize * 0.55);
  const textY = cy + fontSize * 0.35;
  const r = iconSize / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#0a0a0f"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#00d4a0" stroke-width="${Math.round(iconSize * 0.03)}" opacity="0.25"/>
  <text x="${cx}" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#00d4a0" text-anchor="middle">$</text>
</svg>`;
}

// ── PWA icons (Android + general) ──────────────────────────
const pwaSizes = [48, 72, 96, 128, 144, 192, 384, 512];
for (const size of pwaSizes) {
  writeFileSync(resolve(PUBLIC, `pwa-${size}x${size}.svg`), createSVG(size));
  console.log(`✓ pwa-${size}x${size}.svg`);
}

// ── Maskable icons ─────────────────────────────────────────
const maskableSizes = [192, 512];
for (const size of maskableSizes) {
  writeFileSync(resolve(PUBLIC, `pwa-maskable-${size}x${size}.svg`), createMaskableSVG(size));
  console.log(`✓ pwa-maskable-${size}x${size}.svg`);
}

// ── Apple touch icon (180x180) ─────────────────────────────
writeFileSync(resolve(PUBLIC, 'apple-touch-icon.svg'), createSVG(180));
console.log('✓ apple-touch-icon.svg');

// ── Apple splash screens (portrait only) ───────────────────
const applesSplash = [
  // iPhone SE, iPod touch
  { w: 640, h: 1136, name: 'apple-splash-640x1136' },
  // iPhone 6/7/8
  { w: 750, h: 1334, name: 'apple-splash-750x1334' },
  // iPhone 6+/7+/8+
  { w: 1242, h: 2208, name: 'apple-splash-1242x2208' },
  // iPhone X/XS/11 Pro
  { w: 1125, h: 2436, name: 'apple-splash-1125x2436' },
  // iPhone XR/11
  { w: 828, h: 1792, name: 'apple-splash-828x1792' },
  // iPhone XS Max/11 Pro Max
  { w: 1242, h: 2688, name: 'apple-splash-1242x2688' },
  // iPhone 12 mini/13 mini
  { w: 1080, h: 2340, name: 'apple-splash-1080x2340' },
  // iPhone 12/12 Pro/13/13 Pro/14
  { w: 1170, h: 2532, name: 'apple-splash-1170x2532' },
  // iPhone 12 Pro Max/13 Pro Max/14 Plus
  { w: 1284, h: 2778, name: 'apple-splash-1284x2778' },
  // iPhone 14 Pro
  { w: 1179, h: 2556, name: 'apple-splash-1179x2556' },
  // iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus
  { w: 1290, h: 2796, name: 'apple-splash-1290x2796' },
  // iPhone 15/15 Pro/16/16 Pro
  { w: 1206, h: 2622, name: 'apple-splash-1206x2622' },
  // iPad mini
  { w: 1536, h: 2048, name: 'apple-splash-1536x2048' },
  // iPad Air / iPad 10.2"
  { w: 1620, h: 2160, name: 'apple-splash-1620x2160' },
  // iPad Pro 11"
  { w: 1668, h: 2388, name: 'apple-splash-1668x2388' },
  // iPad Pro 12.9"
  { w: 2048, h: 2732, name: 'apple-splash-2048x2732' },
];

for (const { w, h, name } of applesSplash) {
  writeFileSync(resolve(PUBLIC, `${name}.svg`), createSplashSVG(w, h));
  console.log(`✓ ${name}.svg`);
}

console.log('\nAll SVGs generated. Run: node scripts/convert-png.mjs');
