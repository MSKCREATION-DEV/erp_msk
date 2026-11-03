/** Compresse / recadre une image pour upload avatar (évite 413 Server Actions). */

export type CompressedImage = {
  blob: Blob;
  fileName: string;
  mime: string;
  width: number;
  height: number;
};

const MAX_EDGE = 800;
const JPEG_QUALITY = 0.82;
/** Cible sous la limite Server Action (1 Mo défaut) avec marge multipart. */
const MAX_OUTPUT_BYTES = 700_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire l’image"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression échouée"))),
      mime,
      quality,
    );
  });
}

/**
 * Recadre au centre en carré, redimensionne, exporte JPEG.
 */
export async function compressAvatarImage(file: File): Promise<CompressedImage> {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const out = Math.min(MAX_EDGE, side);

  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

  let quality = JPEG_QUALITY;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > MAX_OUTPUT_BYTES && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new Error(
      "Image trop lourde même après compression — choisissez une photo plus légère",
    );
  }

  return {
    blob,
    fileName: "avatar.jpg",
    mime: "image/jpeg",
    width: out,
    height: out,
  };
}
