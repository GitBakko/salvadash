#!/usr/bin/env node
/**
 * Regenerate full icon pack from a single source PNG (Aurora coin v5).
 *
 * Usage:
 *   node scripts/regenerate-icons-from-png.mjs <path-to-source-png>
 *
 * Source must be square (≥ 1024x1024 recommended). Aurora theme colors:
 *   - near-black surface: #0A0A0F
 *   - violet brand:        #8E78FF
 *
 * Outputs (frontend/public/):
 *   - favicon-16x16.png, favicon-32x32.png         (resize)
 *   - apple-touch-icon.png (180x180, opaque)       (resize on dark bg)
 *   - pwa-{48,72,96,128,144,192,384,512}.png       (resize)
 *   - pwa-maskable-{192,512}.png                   (resize @ 80% with safe zone)
 *   - apple-splash-*.png                           (icon @ 20% centered, dark bg)
 */
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/regenerate-icons-from-png.mjs <source.png>');
  process.exit(1);
}

// Auto-sample the icon's corner pixel to use as the splash/maskable canvas color.
// This guarantees the icon blends into the splash background instead of sitting
// on a contrasting block (which looks broken on iOS PWA launch).
const cornerBuf = await sharp(src)
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .raw()
  .toBuffer();
const BG = { r: cornerBuf[0], g: cornerBuf[1], b: cornerBuf[2], alpha: 1 };
const BG_HEX =
  '#' + [BG.r, BG.g, BG.b].map((c) => c.toString(16).padStart(2, '0').toUpperCase()).join('');
console.log(`Sampled icon bg color: ${BG_HEX} (rgb ${BG.r}, ${BG.g}, ${BG.b})`);

// ── PWA standard icons (transparent OK, but source is opaque so output opaque) ──
const pwaSizes = [48, 72, 96, 128, 144, 192, 384, 512];
for (const s of pwaSizes) {
  await sharp(src)
    .resize(s, s, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, `pwa-${s}x${s}.png`));
  console.log(`✓ pwa-${s}x${s}.png`);
}

// ── Maskable icons (Android adaptive: needs 80% safe zone, full bleed) ──
// Source is composited at 80% of canvas centered, with violet bg fill so the
// outer 10% safe-zone gets cropped by the OS mask without revealing emptiness.
const maskableSizes = [192, 512];
for (const s of maskableSizes) {
  const inner = Math.round(s * 0.8);
  const offset = Math.round((s - inner) / 2);
  const innerBuf = await sharp(src).resize(inner, inner, { fit: 'cover' }).toBuffer();
  await sharp({
    create: { width: s, height: s, channels: 4, background: BG },
  })
    .composite([{ input: innerBuf, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, `pwa-maskable-${s}x${s}.png`));
  console.log(`✓ pwa-maskable-${s}x${s}.png`);
}

// ── Apple touch icon (180x180, MUST be opaque per Apple HIG) ──
await sharp(src)
  .resize(180, 180, { fit: 'cover' })
  .flatten({ background: BG })
  .png({ compressionLevel: 9 })
  .toFile(resolve(PUBLIC, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// ── Favicons (16x16, 32x32) ──
for (const s of [16, 32]) {
  await sharp(src)
    .resize(s, s, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, `favicon-${s}x${s}.png`));
  console.log(`✓ favicon-${s}x${s}.png`);
}

// ── Apple splash screens ──
// Icon centered on near-black canvas at ~20% of min(width, height).
const applesSplash = [
  { w: 640, h: 1136 },
  { w: 750, h: 1334 },
  { w: 828, h: 1792 },
  { w: 1080, h: 2340 },
  { w: 1125, h: 2436 },
  { w: 1170, h: 2532 },
  { w: 1179, h: 2556 },
  { w: 1206, h: 2622 },
  { w: 1242, h: 2208 },
  { w: 1242, h: 2688 },
  { w: 1284, h: 2778 },
  { w: 1290, h: 2796 },
  { w: 1536, h: 2048 },
  { w: 1620, h: 2160 },
  { w: 1668, h: 2388 },
  { w: 2048, h: 2732 },
];
for (const { w, h } of applesSplash) {
  const iconSize = Math.round(Math.min(w, h) * 0.22);
  const iconBuf = await sharp(src).resize(iconSize, iconSize, { fit: 'cover' }).toBuffer();
  const left = Math.round((w - iconSize) / 2);
  const top = Math.round((h - iconSize) / 2);
  await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([{ input: iconBuf, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(PUBLIC, `apple-splash-${w}x${h}.png`));
  console.log(`✓ apple-splash-${w}x${h}.png`);
}

console.log('\nDone. All icons regenerated from', src);
