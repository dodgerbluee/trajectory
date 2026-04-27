/**
 * Image-cropping pipeline shared by every avatar upload entry point.
 *
 * The pipeline:
 *   1. Convert HEIC/HEIF (iPhone, many Androids) to JPEG via heic2any (lazy-loaded).
 *   2. Decode through an Image element using URL.createObjectURL — universally
 *      compatible across Android browsers, no data-URL memory pressure.
 *   3. Validate decoded dimensions and downscale to MAX_SOURCE_DIM if needed,
 *      so the cropper never works near the Android canvas-size cap (~4096px on
 *      many devices, where decode silently fails to a black image).
 *   4. Drawing through a canvas bakes EXIF orientation into the source on
 *      modern browsers (Chrome 81+, Safari 13.1+).
 *
 * Callers handle UI loading/error states. This module is pure async functions.
 */

// Many Android devices cap canvas surfaces around 4096px and fail silently
// (black image) near that limit. 2048px is plenty for an avatar and stays
// well under every device's hard ceiling.
const MAX_SOURCE_DIM = 2048;
const HEIC_EXT_RE = /\.(heic|heif)$/i;

export function isHeic(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  return t === 'image/heic' || t === 'image/heif' || HEIC_EXT_RE.test(file.name);
}

async function convertHeicIfNeeded(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  try {
    const { default: heic2any } = await import('heic2any');
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.error('[image-crop] HEIC conversion failed', err);
    throw new Error('Couldn’t convert this HEIC photo. Try a different image.');
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image element failed to decode'));
    img.src = url;
  });
}

export interface PreparedImageSource {
  /** Object URL pointing at the (possibly converted/downscaled) image. */
  url: string;
  /** The decoded HTMLImageElement for direct drawImage in the final crop. */
  image: HTMLImageElement;
  width: number;
  height: number;
}

export async function prepareImageSource(file: File): Promise<PreparedImageSource> {
  const blob = await convertHeicIfNeeded(file);
  const sourceUrl = URL.createObjectURL(blob);
  let image: HTMLImageElement;
  try {
    image = await loadImage(sourceUrl);
  } catch {
    URL.revokeObjectURL(sourceUrl);
    throw new Error(`Couldn’t decode this image (${file.type || 'unknown type'}). Try a JPEG or PNG.`);
  }

  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;
  if (!naturalW || !naturalH) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Image decoded with 0 dimensions — the format may be unsupported on this device.');
  }

  const maxDim = Math.max(naturalW, naturalH);
  if (maxDim <= MAX_SOURCE_DIM) {
    return { url: sourceUrl, image, width: naturalW, height: naturalH };
  }

  const scale = MAX_SOURCE_DIM / maxDim;
  const w = Math.round(naturalW * scale);
  const h = Math.round(naturalH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Canvas 2D context unavailable on this device.');
  }
  ctx.drawImage(image, 0, 0, w, h);

  const downscaledBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas failed to encode (out of memory?)'))),
      'image/jpeg',
      0.92,
    );
  });

  URL.revokeObjectURL(sourceUrl);

  const downscaledUrl = URL.createObjectURL(downscaledBlob);
  const downscaledImage = await loadImage(downscaledUrl);
  return { url: downscaledUrl, image: downscaledImage, width: w, height: h };
}

export function releaseImageSource(source: PreparedImageSource | null | undefined): void {
  if (source) URL.revokeObjectURL(source.url);
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropToFile(
  source: PreparedImageSource,
  area: CropArea,
  options: { filename?: string; quality?: number } = {},
): Promise<File> {
  const { filename = 'avatar.jpg', quality = 0.95 } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = area.width;
  canvas.height = area.height;

  ctx.drawImage(
    source.image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve(new File([blob], filename, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality,
    );
  });
}
