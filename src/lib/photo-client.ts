const MAX_SOURCE_BYTES = 1_000_000;
const MAX_THUMBNAIL_DIMENSION = 400;
const MAX_THUMBNAIL_BYTES = 160 * 1024;
const ALLOWED_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("This browser could not compress the photo."));
        }
      },
      "image/webp",
      quality,
    );
  });
}

export async function createPhotoThumbnail(file: File) {
  if (!ALLOWED_SOURCE_TYPES.has(file.type) || file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose a JPEG, PNG, or WebP image no larger than 1 MB.");
  }

  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(
      1,
      MAX_THUMBNAIL_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("This browser could not resize the photo.");
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.8, 0.68, 0.56]) {
      const thumbnail = await canvasToWebp(canvas, quality);

      if (thumbnail.size <= MAX_THUMBNAIL_BYTES) {
        return thumbnail;
      }
    }

    throw new Error("The photo could not be compressed enough. Try another image.");
  } finally {
    bitmap.close();
  }
}
