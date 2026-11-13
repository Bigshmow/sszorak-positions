import type { Pixels } from './pixels';

export async function blobToPixels(blob: Blob): Promise<Pixels> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function pixelsToCanvas(px: Pixels): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = px.width;
  canvas.height = px.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(px.data), px.width, px.height), 0, 0);
  return canvas;
}

export function imageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items ?? [];
  for (const item of items) {
    if (item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
}
