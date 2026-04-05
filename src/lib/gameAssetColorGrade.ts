/**
 * Unified “parchment / ink” color treatment for all raster game assets
 * (IsoCity + coaster sprite sheets, water textures, landing galleries).
 * Bump GAME_ASSET_SCHEME_VERSION when the formula changes to invalidate caches.
 */

export const GAME_ASSET_SCHEME_VERSION = 2;

export const CHROMA_KEY_BG = { r: 255, g: 0, b: 0 };
export const CHROMA_KEY_THRESHOLD = 155;

/** Warm, slightly desaturated grade aligned with globals.css UI tokens */
export function applyFrontendSchemeToRgb(r: number, g: number, b: number): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const desat = 0.84;
  let r1 = lum + (r - lum) * desat;
  let g1 = lum + (g - lum) * desat;
  let b1 = lum + (b - lum) * desat;
  r1 = r1 * 1.05 + 16;
  g1 = g1 * 1.02 + 11;
  b1 = b1 * 0.88 + 5;
  const contrast = 1.08;
  const mid = 130;
  r1 = (r1 - mid) * contrast + mid;
  g1 = (g1 - mid) * contrast + mid;
  b1 = (b1 - mid) * contrast + mid;
  const bright = 1.04;
  r1 *= bright;
  g1 *= bright;
  b1 *= bright;
  return [
    Math.max(0, Math.min(255, Math.round(r1))),
    Math.max(0, Math.min(255, Math.round(g1))),
    Math.max(0, Math.min(255, Math.round(b1))),
  ];
}

/**
 * Mutates RGBA buffer in place.
 * - chromaKey: magenta/red studio backdrop → transparent, then grade visible pixels
 * - !chromaKey: grade only pixels with alpha > 0 (full-bleed textures like water.png)
 */
export function processGameAssetRgba(
  data: Uint8ClampedArray,
  opts: { chromaKey: boolean; threshold?: number },
): void {
  const threshold = opts.threshold ?? CHROMA_KEY_THRESHOLD;
  const bg = CHROMA_KEY_BG;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (opts.chromaKey) {
      const distance = Math.sqrt(
        Math.pow(r - bg.r, 2) + Math.pow(g - bg.g, 2) + Math.pow(b - bg.b, 2),
      );
      if (distance <= threshold) {
        data[i + 3] = 0;
        continue;
      }
    } else if (data[i + 3] === 0) {
      continue;
    }
    const [nr, ng, nb] = applyFrontendSchemeToRgb(r, g, b);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}

/** Sync path for coaster canvas pipeline */
export function processSpriteSheetToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  processGameAssetRgba(imageData.data, { chromaKey: true, threshold: CHROMA_KEY_THRESHOLD });
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
