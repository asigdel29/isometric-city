// ============================================================================
// IMAGE LOADING UTILITIES
// ============================================================================
// Handles loading and caching of sprite images with optional background filtering
// and WebP optimization for faster loading on slow connections.

import {
  GAME_ASSET_SCHEME_VERSION,
  CHROMA_KEY_THRESHOLD,
  processGameAssetRgba,
} from '@/lib/gameAssetColorGrade';

/** @deprecated use GAME_ASSET_SCHEME_VERSION */
export const SPRITE_FRONTEND_SCHEME_VERSION = GAME_ASSET_SCHEME_VERSION;

export { applyFrontendSchemeToRgb } from '@/lib/gameAssetColorGrade';

// Image cache for building sprites
const imageCache = new Map<string, HTMLImageElement>();

// Track WebP support (detected once on first use)
let webpSupported: boolean | null = null;

// Event emitter for image loading progress (to trigger re-renders)
type ImageLoadCallback = () => void;
const imageLoadCallbacks = new Set<ImageLoadCallback>();

/**
 * Check if the browser supports WebP format
 * Uses a small test image to detect support
 */
async function checkWebPSupport(): Promise<boolean> {
  if (webpSupported !== null) {
    return webpSupported;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      webpSupported = img.width > 0 && img.height > 0;
      resolve(webpSupported);
    };
    img.onerror = () => {
      webpSupported = false;
      resolve(false);
    };
    // Tiny 1x1 WebP image
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
}

/**
 * Get the WebP path for a PNG image
 */
function getWebPPath(src: string): string | null {
  if (src.endsWith('.png')) {
    return src.replace(/\.png$/, '.webp');
  }
  return null;
}

/**
 * Register a callback to be notified when images are loaded
 * @returns Cleanup function to unregister the callback
 */
export function onImageLoaded(callback: ImageLoadCallback): () => void {
  imageLoadCallbacks.add(callback);
  return () => {
    imageLoadCallbacks.delete(callback);
  };
}

/**
 * Notify all registered callbacks that an image has loaded
 */
function notifyImageLoaded() {
  imageLoadCallbacks.forEach((cb) => cb());
}

/**
 * Load an image directly without WebP optimization
 * @param src The image source path
 * @returns Promise resolving to the loaded image
 */
function loadImageDirect(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      notifyImageLoaded();
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Load an image from a source URL, preferring WebP if available
 * @param src The image source path (PNG)
 * @returns Promise resolving to the loaded image
 */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  // Return cached image if available
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }

  // Check if we should try WebP
  const webpPath = getWebPPath(src);
  if (webpPath) {
    const supportsWebP = await checkWebPSupport();

    if (supportsWebP) {
      // Try loading WebP first
      try {
        const img = await loadImageDirect(webpPath);
        // Also cache under the PNG path for future lookups
        imageCache.set(src, img);
        return img;
      } catch {
        // WebP failed (file might not exist), fall back to PNG
        console.debug(`WebP not available for ${src}, using PNG`);
      }
    }
  }

  // Load PNG directly
  return loadImageDirect(src);
}

/**
 * Chroma-key + color grade (sprite sheets).
 */
export function filterBackgroundColor(
  img: HTMLImageElement,
  threshold: number = CHROMA_KEY_THRESHOLD,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      processGameAssetRgba(imageData.data, { chromaKey: true, threshold });
      ctx.putImageData(imageData, 0, 0);

      const filteredImg = new Image();
      filteredImg.onload = () => {
        resolve(filteredImg);
      };
      filteredImg.onerror = () => {
        reject(new Error('Failed to create filtered image'));
      };
      filteredImg.src = canvas.toDataURL();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Color grade only (no chroma key) — water.png and similar full textures.
 */
function gradeFullRasterImage(img: HTMLImageElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      processGameAssetRgba(imageData.data, { chromaKey: false });
      ctx.putImageData(imageData, 0, 0);
      const out = new Image();
      out.onload = () => resolve(out);
      out.onerror = () => reject(new Error('Failed to grade image'));
      out.src = canvas.toDataURL();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Load and cache a full-bleed raster (e.g. water) with the same grade as sprites.
 */
export async function loadTexturedAsset(src: string): Promise<HTMLImageElement> {
  const cacheKey = `${src}_tex_v${GAME_ASSET_SCHEME_VERSION}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  const raw = await loadImage(src);
  const graded = await gradeFullRasterImage(raw);
  imageCache.set(cacheKey, graded);
  notifyImageLoaded();
  return graded;
}

export function getTexturedAsset(src: string): HTMLImageElement | undefined {
  return imageCache.get(`${src}_tex_v${GAME_ASSET_SCHEME_VERSION}`);
}

/**
 * Loads an image and applies background color filtering if it's a sprite sheet
 * @param src The image source path
 * @param applyFilter Whether to apply background color filtering (default: true for sprite sheets)
 * @returns Promise resolving to the loaded (and optionally filtered) image
 */
export function loadSpriteImage(src: string, applyFilter: boolean = true): Promise<HTMLImageElement> {
  const cacheKey = applyFilter ? `${src}_f_v${GAME_ASSET_SCHEME_VERSION}` : src;
  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey)!);
  }

  return loadImage(src).then((img) => {
    if (applyFilter) {
      return filterBackgroundColor(img).then((filteredImg: HTMLImageElement) => {
        imageCache.set(cacheKey, filteredImg);
        return filteredImg;
      });
    }
    return img;
  });
}

/**
 * Check if an image is cached
 * @param src The image source path
 * @param filtered Whether to check for the filtered version
 */
export function isImageCached(src: string, filtered: boolean = false): boolean {
  const cacheKey = filtered ? `${src}_f_v${GAME_ASSET_SCHEME_VERSION}` : src;
  return imageCache.has(cacheKey);
}

/**
 * Get a cached image if available
 * @param src The image source path
 * @param filtered Whether to get the filtered version
 */
export function getCachedImage(src: string, filtered: boolean = false): HTMLImageElement | undefined {
  const cacheKey = filtered ? `${src}_f_v${GAME_ASSET_SCHEME_VERSION}` : src;
  return imageCache.get(cacheKey);
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}
