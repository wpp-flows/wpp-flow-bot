const MAX_DIMENSION = 1280;
const OUTPUT_QUALITY = 0.85;

const RESIZABLE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type DecodedImage = ImageBitmap | HTMLImageElement;

export async function downscaleImage(file: File): Promise<File> {
  if (!RESIZABLE_TYPES.has(file.type)) return file;
  if (typeof globalThis.document === 'undefined') return file;

  let decoded: DecodedImage | null = null;
  try {
    decoded = await loadDecoded(file);
    const { width: srcW, height: srcH } = sizeOf(decoded);
    const { width, height } = scaleDown(srcW, srcH);
    if (width === srcW && height === srcH) return file;

    const canvas = globalThis.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(decoded, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, file.type, OUTPUT_QUALITY),
    );
    if (!blob) return file;

    return new File([blob], file.name, {
      type: blob.type || file.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    if (decoded && isBitmap(decoded)) decoded.close();
  }
}

async function loadDecoded(file: File): Promise<DecodedImage> {
  if (typeof globalThis.createImageBitmap === 'function') {
    try {
      return await globalThis.createImageBitmap(file);
    } catch {
      // fall through to <img>
    }
  }
  return loadImg(file);
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function isBitmap(value: DecodedImage): value is ImageBitmap {
  return typeof (value as ImageBitmap).close === 'function';
}

function sizeOf(value: DecodedImage): { width: number; height: number } {
  if (isBitmap(value)) return { width: value.width, height: value.height };
  return { width: value.naturalWidth, height: value.naturalHeight };
}

function scaleDown(w: number, h: number): { width: number; height: number } {
  const max = Math.max(w, h);
  if (max <= MAX_DIMENSION) return { width: w, height: h };
  const ratio = MAX_DIMENSION / max;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}
