/**
 * Shrinks a photo in the browser before upload so shop pages stay fast on slow
 * connections. Product photos target 40 KB: the image is scaled down, then JPEG
 * quality is stepped down until it fits (or we run out of room to give).
 */

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    img.src = url;
  });

const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

export interface CompressOptions {
  /** Target size in kilobytes. */
  maxKb?: number;
  /** Longest edge in pixels after scaling. */
  maxEdge?: number;
}

export async function compressImage(
  file: File,
  { maxKb = 40, maxEdge = 900 }: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size <= maxKb * 1024 && file.type === 'image/jpeg') return file;

  const img = await loadImage(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  let best: Blob | null = null;
  for (let pass = 0; pass < 4; pass++) {
    canvas.width = Math.max(1, Math.round(width / (pass === 0 ? 1 : 1 + pass * 0.35)));
    canvas.height = Math.max(1, Math.round(height / (pass === 0 ? 1 : 1 + pass * 0.35)));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.7, 0.58, 0.45, 0.35, 0.25]) {
      const blob = await toBlob(canvas, quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= maxKb * 1024) {
        return new File([blob], renameJpg(file.name), { type: 'image/jpeg' });
      }
    }
  }

  if (!best) return file;
  return new File([best], renameJpg(file.name), { type: 'image/jpeg' });
}

const renameJpg = (name: string) => `${(name || 'photo').replace(/\.[^.]+$/, '')}.jpg`;

export const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
