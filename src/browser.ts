import { FaviconError, iconBounds } from "./core.js";

export type IconRenderOptions = { signal?: AbortSignal; maxPixels?: number };

function checkOptions(options: IconRenderOptions): void {
  if (
    !options ||
    typeof options !== "object" ||
    (options.maxPixels !== undefined &&
      (!Number.isSafeInteger(options.maxPixels) || options.maxPixels < 1)) ||
    (options.signal !== undefined &&
      (!options.signal ||
        typeof options.signal.aborted !== "boolean" ||
        typeof options.signal.addEventListener !== "function" ||
        typeof options.signal.removeEventListener !== "function"))
  )
    throw new FaviconError("invalid_options");
  if (options.signal?.aborted) throw new FaviconError("aborted");
}

export function canvasBlob(
  canvas: HTMLCanvasElement,
  options: IconRenderOptions = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    checkOptions(options);
    if (!canvas || typeof canvas.toBlob !== "function") throw new FaviconError("invalid_options");
    const signal = options.signal;
    const onAbort = () => reject(new FaviconError("aborted"));
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      canvas.toBlob((blob) => {
        signal?.removeEventListener("abort", onAbort);
        if (signal?.aborted) reject(new FaviconError("aborted"));
        else if (!blob || blob.type !== "image/png") reject(new FaviconError("encoding_failed"));
        else resolve(blob);
      }, "image/png");
    } catch (error) {
      signal?.removeEventListener("abort", onAbort);
      reject(
        new FaviconError(
          error instanceof DOMException && error.name === "SecurityError"
            ? "canvas_security"
            : "encoding_failed",
        ),
      );
    }
  });
}

/** The caller owns the decoded image; cancellation discards work but cannot stop a native encoder. */
export async function renderIcon(
  image: HTMLImageElement,
  size: number,
  scale: number,
  background: string | null,
  maskable = false,
  options: IconRenderOptions = {},
): Promise<Blob> {
  checkOptions(options);
  if (
    !image ||
    !Number.isFinite(image.naturalWidth) ||
    !Number.isFinite(image.naturalHeight) ||
    image.naturalWidth <= 0 ||
    image.naturalHeight <= 0
  )
    throw new FaviconError("invalid_image");
  const bounds = iconBounds(image.naturalWidth, image.naturalHeight, size, scale, maskable);
  if (background !== null && (typeof background !== "string" || background.length > 128))
    throw new FaviconError("invalid_options");
  if (options.maxPixels !== undefined && size * size > options.maxPixels)
    throw new FaviconError("invalid_options");
  if (typeof document === "undefined") throw new FaviconError("browser_required");
  if (background && typeof CSS !== "undefined" && !CSS.supports("color", background))
    throw new FaviconError("invalid_options");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new FaviconError("canvas_unavailable");
    if (background || maskable) {
      context.fillStyle = background ?? "#000000";
      context.fillRect(0, 0, size, size);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    try {
      context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
    } catch {
      throw new FaviconError("invalid_image");
    }
    return await canvasBlob(canvas, options);
  } catch (error) {
    if (error instanceof FaviconError) throw error;
    throw new FaviconError("encoding_failed");
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
