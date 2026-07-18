// Placeholder icon/splash generator for Plan 03-01 Task 3.
// Generates 5 PNGs at exact dimensions with exact colors.
// Founder replaces with final design assets when ready; @capacitor/assets
// can regenerate platform variants from the new masters.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = resolve(__dirname, '..', 'resources');

const BRAND_ORANGE = '#e8590c';
const NEUTRAL_DARK = '#171717';
const NEUTRAL_DARKER = '#0a0a0a';
const WHITE = '#ffffff';

/**
 * Renders a thick stylized "M" centered on a transparent SVG canvas.
 * Returns the SVG string.
 *
 * Style: angular geometric M, slightly tilted at the apex peaks
 * to suggest wing/motion (airline miles theme). Stroke-based so it
 * scales cleanly to any size.
 */
function svgM(canvasSize, color, paddingRatio = 0.18) {
  const size = canvasSize;
  const pad = size * paddingRatio;
  const inner = size - pad * 2;

  // M anchor points (relative to inner box):
  //   (0, 1) bottom-left foot
  //   (0, 0) top-left
  //   (0.5, 0.45) middle valley (lifted to evoke motion)
  //   (1, 0) top-right
  //   (1, 1) bottom-right foot
  const x0 = pad;
  const x1 = pad + inner * 0.5;
  const x2 = pad + inner;
  const y0 = pad;
  const y1 = pad + inner * 0.5;
  const y2 = pad + inner;

  const strokeWidth = inner * 0.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <path d="M ${x0} ${y2} L ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y0} L ${x2} ${y2}"
          fill="none"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="square"
          stroke-linejoin="miter" />
  </svg>`;
}

async function ensureDir() {
  await mkdir(RESOURCES_DIR, { recursive: true });
}

/**
 * 1. resources/icon.png — 1024x1024, solid brand orange background with white M centered.
 */
async function genIcon() {
  const size = 1024;
  const overlay = Buffer.from(svgM(size, WHITE, 0.2));

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_ORANGE,
    },
  })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(RESOURCES_DIR, 'icon.png'));

  console.log('✓ resources/icon.png (1024x1024, solid #e8590c + white M)');
}

/**
 * 2. resources/icon-foreground.png — 1024x1024, transparent background with white M.
 * Android adaptive icon foreground: ~25% padding so the M sits in the masked safe area.
 */
async function genIconForeground() {
  const size = 1024;
  const overlay = Buffer.from(svgM(size, WHITE, 0.25));

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent
    },
  })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(RESOURCES_DIR, 'icon-foreground.png'));

  console.log('✓ resources/icon-foreground.png (1024x1024, transparent + white M, 25% padding)');
}

/**
 * 3. resources/icon-background.png — 1024x1024, solid #171717 fill, nothing else.
 * Android adaptive icon background layer.
 */
async function genIconBackground() {
  const size = 1024;

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: NEUTRAL_DARK,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(resolve(RESOURCES_DIR, 'icon-background.png'));

  console.log('✓ resources/icon-background.png (1024x1024, solid #171717)');
}

/**
 * 4. resources/splash.png — 2732x2732, solid #171717 background with brand-orange M
 * centered at ~30% of canvas size (light splash master for @capacitor/assets).
 */
async function genSplashLight() {
  const canvasSize = 2732;
  const logoSize = Math.round(canvasSize * 0.3);
  const overlay = Buffer.from(svgM(logoSize, BRAND_ORANGE, 0.05));

  const left = Math.round((canvasSize - logoSize) / 2);
  const top = Math.round((canvasSize - logoSize) / 2);

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: NEUTRAL_DARK,
    },
  })
    .composite([{ input: overlay, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(RESOURCES_DIR, 'splash.png'));

  console.log('✓ resources/splash.png (2732x2732, #171717 + orange M at 30%)');
}

/**
 * 5. resources/splash-dark.png — 2732x2732, same M but on #0a0a0a (dark variant).
 */
async function genSplashDark() {
  const canvasSize = 2732;
  const logoSize = Math.round(canvasSize * 0.3);
  const overlay = Buffer.from(svgM(logoSize, BRAND_ORANGE, 0.05));

  const left = Math.round((canvasSize - logoSize) / 2);
  const top = Math.round((canvasSize - logoSize) / 2);

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: NEUTRAL_DARKER,
    },
  })
    .composite([{ input: overlay, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(RESOURCES_DIR, 'splash-dark.png'));

  console.log('✓ resources/splash-dark.png (2732x2732, #0a0a0a + orange M at 30%)');
}

await ensureDir();
await genIcon();
await genIconForeground();
await genIconBackground();
await genSplashLight();
await genSplashDark();

console.log('\nAll 5 placeholders written to resources/. Replace with final design assets when ready;\n@capacitor/assets generate consumes the same filenames.');
