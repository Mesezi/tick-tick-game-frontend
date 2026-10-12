/**
 * generate-icons.mjs
 * Generates PWA icons and splash artwork from the Tick-Tick logo.
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Requirements:
 *   npm install --save-dev sharp
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const logoBuffer = readFileSync(resolve(root, 'public/tick-tick-logo.png'));

for (const size of [192, 512]) {
  const logo = await sharp(logoBuffer)
    .resize({ width: Math.round(size * 0.8), height: Math.round(size * 0.8), fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#6b4423',
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(resolve(root, `public/pwa-${size}.png`));
  console.log(`✓  public/pwa-${size}.png  (${size}×${size})`);
}

const splashSizes = [
  [1170, 2532],
  [1290, 2796],
  [1284, 2778],
  [1125, 2436],
  [828, 1792],
  [750, 1334],
];

for (const [width, height] of splashSizes) {
  const logo = await sharp(logoBuffer)
    .resize({
      width: Math.round(width * 0.3),
      height: Math.round(height * 0.3),
      fit: 'inside',
    })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#6b4423',
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(resolve(root, `public/apple-splash-${width}x${height}.png`));
  console.log(`✓  public/apple-splash-${width}x${height}.png  (${width}×${height})`);
}
