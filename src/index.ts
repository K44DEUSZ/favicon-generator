export type FaviconErrorCode =
  | "invalid_image"
  | "invalid_options"
  | "browser_required"
  | "canvas_unavailable"
  | "encoding_failed"
  | "invalid_ico";
export class FaviconError extends Error {
  constructor(public readonly code: FaviconErrorCode) {
    super(code);
    this.name = "FaviconError";
  }
}

export function iconBounds(
  width: number,
  height: number,
  size: number,
  scale: number,
  maskable = false,
) {
  if (
    ![width, height, size, scale].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 4096 ||
    scale <= 0 ||
    scale > 100
  )
    throw new FaviconError("invalid_options");
  const ratio = width / height;
  let maximum = (size * scale) / 100;
  if (maskable)
    maximum = Math.min(maximum, (0.8 * size) / Math.sqrt(1 + Math.min(ratio, 1 / ratio) ** 2));
  const outputWidth = ratio > 1 ? maximum : maximum * ratio;
  const outputHeight = ratio > 1 ? maximum / ratio : maximum;
  return {
    x: (size - outputWidth) / 2,
    y: (size - outputHeight) / 2,
    width: outputWidth,
    height: outputHeight,
  };
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new FaviconError("encoding_failed"))),
      "image/png",
    ),
  );
}

export async function renderIcon(
  image: HTMLImageElement,
  size: number,
  scale: number,
  background: string | null,
  maskable = false,
): Promise<Blob> {
  const bounds = iconBounds(image.naturalWidth, image.naturalHeight, size, scale, maskable);
  if (typeof document === "undefined") throw new FaviconError("browser_required");
  if (background !== null && (typeof background !== "string" || background.length > 128))
    throw new FaviconError("invalid_options");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new FaviconError("canvas_unavailable");
  if (background || maskable) {
    context.fillStyle = background ?? "#000000";
    context.fillRect(0, 0, size, size);
  } else context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
  return canvasBlob(canvas);
}

export async function createIco(
  entries: ReadonlyArray<{ size: number; blob: Blob }>,
): Promise<Blob> {
  if (
    !Array.isArray(entries) ||
    !entries.length ||
    entries.length > 16 ||
    new Set(entries.map((entry) => entry.size)).size !== entries.length
  )
    throw new FaviconError("invalid_ico");
  const payloads = await Promise.all(
    entries.map(async (entry) => {
      if (
        !Number.isInteger(entry.size) ||
        entry.size < 1 ||
        entry.size > 256 ||
        !(entry.blob instanceof Blob) ||
        entry.blob.size > 2097152
      )
        throw new FaviconError("invalid_ico");
      const bytes = new Uint8Array(await entry.blob.arrayBuffer());
      const signature = [137, 80, 78, 71, 13, 10, 26, 10];
      if (
        bytes.length < 33 ||
        signature.some((value, index) => bytes[index] !== value) ||
        String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
      )
        throw new FaviconError("invalid_ico");
      const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (header.getUint32(16) !== entry.size || header.getUint32(20) !== entry.size)
        throw new FaviconError("invalid_ico");
      return bytes;
    }),
  );
  const headerSize = 6 + entries.length * 16;
  const buffer = new ArrayBuffer(
    headerSize + payloads.reduce((sum, payload) => sum + payload.length, 0),
  );
  const view = new DataView(buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, entries.length, true);
  let offset = headerSize;
  entries.forEach((entry, index) => {
    const directory = 6 + index * 16;
    view.setUint8(directory, entry.size === 256 ? 0 : entry.size);
    view.setUint8(directory + 1, entry.size === 256 ? 0 : entry.size);
    view.setUint16(directory + 4, 1, true);
    view.setUint16(directory + 6, 32, true);
    view.setUint32(directory + 8, payloads[index].length, true);
    view.setUint32(directory + 12, offset, true);
    new Uint8Array(buffer, offset, payloads[index].length).set(payloads[index]);
    offset += payloads[index].length;
  });
  return new Blob([buffer], { type: "image/x-icon" });
}
