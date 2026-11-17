import exifr from "exifr";
import { PDFDocument } from "pdf-lib";
import { COPY, TRANSFORM, createRotator, type Transform } from "@chimok/jpegtran-js";
import { sizeSlug, stem } from "@/lib/bytes";
import { jpegScanOffset, stripJpegMetadata, stripPngMetadata, stripWebpMetadata } from "@/lib/metadata";
import { isTooLarge, sniff } from "@/lib/sniff";
import {
  CancelledError,
  TooLargeError,
  UserError,
  type JobResult,
  type OutputFile,
  type OutputFormat,
  type Settings,
  type SourceFile,
  type ToolKind,
} from "@/lib/process/types";

type Hooks = {
  progress: (value: number, label: string) => void;
  cancelled: () => boolean;
};

type Encoded = {
  bytes: Uint8Array;
  mime: string;
  ext: string;
  quality?: number;
};

type Decoded = {
  image: ImageData;
  hasAlpha: boolean;
};

const FORMAT_MIME = {
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  png: "image/png",
} as const;

const FORMAT_EXT = {
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
  png: "png",
} as const;

type ConcreteFormat = keyof typeof FORMAT_MIME;

function check(hooks: Hooks) {
  if (hooks.cancelled()) throw new CancelledError();
}

function ownBytes(buffer: ArrayBufferLike): Uint8Array<ArrayBuffer> {
  const view = new Uint8Array(buffer);
  const copy = new ArrayBuffer(view.byteLength);
  new Uint8Array(copy).set(view);
  return new Uint8Array(copy);
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return ownBytes(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).buffer;
}

function ownImage(image: { data: ArrayLike<number>; width: number; height: number }): ImageData {
  const copy = new Uint8ClampedArray(image.width * image.height * 4);
  const data = image.data;
  for (let i = 0; i < copy.length && i < data.length; i++) copy[i] = data[i] ?? 0;
  return new ImageData(copy, image.width, image.height);
}

function hasAlpha(image: ImageData): boolean {
  const data = image.data;
  const pixels = data.length / 4;
  const step = Math.max(1, Math.floor(pixels / 5000));
  for (let p = 0; p < pixels; p += step) {
    if ((data[p * 4 + 3] ?? 255) < 250) return true;
  }
  return false;
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function unsharp(image: ImageData): ImageData {
  const { width, height, data } = image;
  const src = data;
  const out = new Uint8ClampedArray(src);
  const amount = 0.16;
  const threshold = 8;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * width + (x + kx)) * 4 + c] ?? 0;
          }
        }
        const blur = sum / 9;
        const orig = src[i + c] ?? 0;
        const diff = orig - blur;
        if (Math.abs(diff) >= threshold) out[i + c] = clampByte(orig + diff * amount);
      }
    }
  }
  return new ImageData(out, width, height);
}

function flatten(image: ImageData, color: string): ImageData {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new UserError("This browser couldn't prepare a preview canvas.");
  ctx.fillStyle = color || "#ffffff";
  ctx.fillRect(0, 0, image.width, image.height);
  const layer = new OffscreenCanvas(image.width, image.height);
  layer.getContext("2d")?.putImageData(image, 0, 0);
  ctx.drawImage(layer, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

function cropImage(image: ImageData, rect: { x: number; y: number; width: number; height: number }): ImageData {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(rect.y)));
  const width = Math.max(1, Math.min(image.width - x, Math.round(rect.width)));
  const height = Math.max(1, Math.min(image.height - y, Math.round(rect.height)));
  const src = new OffscreenCanvas(image.width, image.height);
  src.getContext("2d")?.putImageData(image, 0, 0);
  const out = new OffscreenCanvas(width, height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new UserError("This browser couldn't crop that photo.");
  ctx.drawImage(src, x, y, width, height, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function transformPixels(image: ImageData, turns: 0 | 90 | 180 | 270, flipH: boolean, flipV: boolean): ImageData {
  if (turns === 0 && !flipH && !flipV) return image;
  const src = new OffscreenCanvas(image.width, image.height);
  src.getContext("2d")?.putImageData(image, 0, 0);
  const swap = turns === 90 || turns === 270;
  const width = swap ? image.height : image.width;
  const height = swap ? image.width : image.height;
  const out = new OffscreenCanvas(width, height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new UserError("This browser couldn't rotate that photo.");
  ctx.translate(width / 2, height / 2);
  ctx.rotate((turns * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(src, -image.width / 2, -image.height / 2);
  return ctx.getImageData(0, 0, width, height);
}

async function decodeBitmap(bytes: Uint8Array, mime: string): Promise<ImageData> {
  const blob = new Blob([asArrayBuffer(bytes)], { type: mime });
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new UserError("This browser couldn't open that photo.");
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function decodeHeic(bytes: Uint8Array): Promise<ImageData> {
  try {
    const decode = (await import("heic-decode")).default;
    const images = await decode.all({ buffer: bytes });
    try {
      if (images.length > 1) {
        throw new UserError("This HEIC holds more than one picture. This version only opens a still photo.");
      }
      const first = await images[0]?.decode();
      if (!first) throw new UserError("This browser couldn't read that HEIC photo.");
      return new ImageData(new Uint8ClampedArray(first.data), first.width, first.height);
    } finally {
      images.dispose();
    }
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError(
      "This browser couldn't read that HEIC photo. Export a JPEG from your camera roll, or open this page in Safari.",
    );
  }
}

async function decodeFile(bytes: Uint8Array, mime: string): Promise<Decoded> {
  let image: ImageData;
  if (mime === "image/jpeg") {
    const decode = (await import("@jsquash/jpeg/decode")).default;
    image = ownImage(await decode(asArrayBuffer(bytes), { preserveOrientation: false }));
  } else if (mime === "image/png") {
    const { decode } = await import("@jsquash/png/decode");
    image = ownImage(await decode(asArrayBuffer(bytes)));
  } else if (mime === "image/webp") {
    const decode = (await import("@jsquash/webp/decode")).default;
    image = ownImage(await decode(asArrayBuffer(bytes)));
  } else if (mime === "image/avif") {
    const decode = (await import("@jsquash/avif/decode")).default;
    const decoded = await decode(asArrayBuffer(bytes));
    if (!decoded) throw new UserError("This browser couldn't read that AVIF photo.");
    image = ownImage(decoded);
  } else if (mime === "image/heic" || mime === "image/heif") {
    image = await decodeHeic(bytes);
  } else if (mime === "image/gif" || mime === "image/bmp") {
    image = await decodeBitmap(bytes, mime);
  } else {
    throw new UserError("This file doesn't look like a photo I can open. Try a JPEG, PNG, WebP, HEIC, or a still GIF.");
  }
  return { image, hasAlpha: hasAlpha(image) };
}

function guardSize(width: number, height: number, allowLarge: boolean) {
  if (!allowLarge && isTooLarge(width, height)) throw new TooLargeError(width, height);
}

async function resizeLanczos(image: ImageData, width: number, height: number, hooks: Hooks): Promise<ImageData> {
  check(hooks);
  if (width === image.width && height === image.height) return image;
  const resize = (await import("@jsquash/resize")).default;
  const resized = ownImage(
    await resize(image, {
      width,
      height,
      method: "lanczos3",
      fitMethod: "stretch",
      premultiply: true,
      linearRGB: true,
    }),
  );
  const shrunk = width < image.width - 1 && height < image.height - 1;
  return shrunk ? unsharp(resized) : resized;
}

async function encodeFormat(
  image: ImageData,
  format: ConcreteFormat,
  quality: number,
  effort: boolean,
  avifSharp: boolean,
  fast: boolean,
): Promise<Uint8Array> {
  if (format === "jpeg") {
    const encode = (await import("@jsquash/jpeg/encode")).default;
    const useEffort = effort && !fast;
    const buffer = await encode(image, {
      quality,
      progressive: useEffort,
      optimize_coding: true,
      trellis_multipass: useEffort,
      trellis_opt_zero: useEffort,
      trellis_opt_table: useEffort,
      trellis_loops: useEffort ? 2 : 1,
      auto_subsample: true,
      baseline: false,
      arithmetic: false,
    });
    const bytes = ownBytes(buffer);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new UserError("The JPEG encoder didn't return a photo. Try again, or pick WebP.");
    }
    return bytes;
  }
  if (format === "webp") {
    const encode = (await import("@jsquash/webp/encode")).default;
    const buffer = await encode(image, {
      quality,
      method: fast ? 2 : effort ? 6 : 4,
      use_sharp_yuv: fast ? 0 : 1,
      alpha_quality: 100,
    });
    return ownBytes(buffer);
  }
  if (format === "avif") {
    const encode = (await import("@jsquash/avif/encode")).default;
    const buffer = await encode(image, {
      quality,
      speed: fast ? 8 : effort ? 5 : 6,
      subsample: avifSharp ? 2 : 0,
      sharpness: avifSharp ? 1 : 0,
    });
    return ownBytes(buffer);
  }
  const encodePng = (await import("@jsquash/png/encode")).default;
  const optimise = (await import("@jsquash/oxipng")).optimise;
  const png = ownBytes(await encodePng(image));
  const optimised = ownBytes(
    await optimise(asArrayBuffer(png), { level: fast ? 1 : effort ? 3 : 2, interlace: false, optimiseAlpha: true }),
  );
  return optimised;
}

function resolveFormat(requested: OutputFormat, mime: string, alpha: boolean): ConcreteFormat {
  if (requested === "jpeg" || requested === "webp" || requested === "avif" || requested === "png") return requested;
  if (requested === "keep") {
    if (mime === "image/jpeg") return "jpeg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/avif") return "avif";
    return alpha ? "png" : "jpeg";
  }
  return alpha ? "webp" : "jpeg";
}

function sameFamily(format: ConcreteFormat, mime: string): boolean {
  return (
    (format === "jpeg" && mime === "image/jpeg") ||
    (format === "png" && mime === "image/png") ||
    (format === "webp" && mime === "image/webp") ||
    (format === "avif" && mime === "image/avif")
  );
}

async function encodePrepared(
  image: ImageData,
  format: ConcreteFormat,
  settings: Settings,
  hooks: Hooks,
  fast = false,
  quality = settings.quality,
): Promise<Encoded> {
  check(hooks);
  let prepared = image;
  if (format === "jpeg" && hasAlpha(prepared)) prepared = flatten(prepared, settings.background);
  const bytes = await encodeFormat(prepared, format, quality, settings.effort, settings.avifSharp, fast);
  return { bytes, mime: FORMAT_MIME[format], ext: FORMAT_EXT[format], quality: format === "png" ? undefined : quality };
}

function outputName(fileName: string, ext: string, suffix: string): string {
  return `${stem(fileName)}-${suffix}.${ext}`;
}

function scansMatch(a: Uint8Array, b: Uint8Array): boolean {
  const left = jpegScanOffset(a);
  const right = jpegScanOffset(b);
  if (left < 0 || right < 0) return false;
  if (a.length - left !== b.length - right) return false;
  for (let i = 0; i < a.length - left; i++) {
    if (a[left + i] !== b[right + i]) return false;
  }
  return true;
}

const ORIENTATION_TRANSFORM: Record<number, Transform> = {
  2: TRANSFORM.flipHorizontal,
  3: TRANSFORM.rotate180,
  4: TRANSFORM.flipVertical,
  5: TRANSFORM.transpose,
  6: TRANSFORM.rotate90,
  7: TRANSFORM.transverse,
  8: TRANSFORM.rotate270,
};

async function bakeJpeg(bytes: Uint8Array): Promise<{ bytes: Uint8Array; lossless: boolean; trimmed: boolean }> {
  let orientation = 1;
  try {
    orientation = (await exifr.orientation(bytes)) || 1;
  } catch {
    orientation = 1;
  }
  let current = bytes;
  let trimmed = false;
  if (orientation >= 2 && orientation <= 8) {
    const rotator = await createRotator();
    const transform = ORIENTATION_TRANSFORM[orientation] ?? TRANSFORM.none;
    const turned = rotator.transformDetailed(current, { transform, copy: COPY.all, perfect: false });
    current = new Uint8Array(turned.data);
    trimmed = !rotator.perfectPossible(bytes, transform);
  }
  const stripped = stripJpegMetadata(current);
  if (!stripped) {
    return { bytes: current, lossless: orientation === 1, trimmed };
  }
  return { bytes: stripped.bytes, lossless: true, trimmed };
}

async function losslessTurn(
  bytes: Uint8Array,
  turns: 0 | 90 | 180 | 270,
  flipH: boolean,
  flipV: boolean,
): Promise<{ bytes: Uint8Array; trimmed: boolean }> {
  const rotator = await createRotator();
  let current = bytes;
  let trimmed = false;
  const steps: Transform[] = [];
  if (flipH) steps.push(TRANSFORM.flipHorizontal);
  if (flipV) steps.push(TRANSFORM.flipVertical);
  if (turns === 90) steps.push(TRANSFORM.rotate90);
  if (turns === 180) steps.push(TRANSFORM.rotate180);
  if (turns === 270) steps.push(TRANSFORM.rotate270);
  for (const transform of steps) {
    if (!rotator.perfectPossible(current, transform)) trimmed = true;
    const turned = rotator.transformDetailed(current, { transform, copy: COPY.all, perfect: false });
    current = new Uint8Array(turned.data);
  }
  const stripped = stripJpegMetadata(current);
  return { bytes: stripped?.bytes ?? current, trimmed };
}

function targetSize(image: ImageData, settings: Settings): { width: number; height: number; upscale: boolean } {
  const ratio = image.width / image.height;
  let width = image.width;
  let height = image.height;
  if (settings.resizeMode === "percent") {
    const scale = Math.max(1, settings.percent) / 100;
    width = Math.max(1, Math.round(image.width * scale));
    height = Math.max(1, Math.round(image.height * scale));
  } else if (settings.resizeMode === "long") {
    const edge = Math.max(1, settings.longEdge);
    if (image.width >= image.height) {
      width = edge;
      height = Math.max(1, Math.round(edge / ratio));
    } else {
      height = edge;
      width = Math.max(1, Math.round(edge * ratio));
    }
  } else if (settings.resizeMode === "width") {
    width = Math.max(1, settings.width);
    height = settings.lockRatio ? Math.max(1, Math.round(width / ratio)) : Math.max(1, settings.height);
  } else {
    height = Math.max(1, settings.height);
    width = settings.lockRatio ? Math.max(1, Math.round(height * ratio)) : Math.max(1, settings.width);
  }
  const upscale = width > image.width || height > image.height;
  if (upscale && !settings.allowUpscale) return { width: image.width, height: image.height, upscale: true };
  return { width, height, upscale: false };
}

async function fileToOutput(
  source: SourceFile,
  encoded: Encoded,
  width: number,
  height: number,
  suffix: string,
  extra: Partial<OutputFile> & { note: string },
): Promise<OutputFile> {
  return {
    name: outputName(source.name, encoded.ext, suffix),
    mime: encoded.mime,
    bytes: encoded.bytes,
    width,
    height,
    beforeBytes: source.bytes.byteLength,
    afterBytes: encoded.bytes.byteLength,
    quality: encoded.quality,
    lossless: false,
    resized: false,
    ...extra,
  };
}

async function runCompress(source: SourceFile, settings: Settings, hooks: Hooks, kind: ToolKind): Promise<OutputFile> {
  hooks.progress(8, "Opening the photo");
  const info = sniff(source.bytes, source.type, source.name);
  if (info.mime === "image/svg+xml") {
    throw new UserError("SVG files aren't photos. This version opens JPEG, PNG, WebP, AVIF, HEIC, BMP, and still GIF.");
  }
  if (info.animated) {
    throw new UserError("This is an animated image. This version doesn't flatten animations into a still frame.");
  }
  if (info.width && info.height) guardSize(info.width, info.height, settings.allowLarge);
  check(hooks);
  const decoded = await decodeFile(source.bytes, info.mime);
  guardSize(decoded.image.width, decoded.image.height, settings.allowLarge);
  let image = decoded.image;
  let resized = false;
  let upscaleBlocked = false;
  if (kind === "resize") {
    const next = targetSize(image, settings);
    upscaleBlocked = next.upscale;
    if (next.width !== image.width || next.height !== image.height) {
      hooks.progress(30, "Resizing with Lanczos");
      image = await resizeLanczos(image, next.width, next.height, hooks);
      resized = true;
    }
  }
  if (kind === "crop") {
    if (!settings.crop) throw new UserError("Drag the crop box, then preview it.");
    image = cropImage(image, settings.crop);
  }
  if (kind === "rotate") {
    image = transformPixels(image, settings.turns, settings.flipH, settings.flipV);
  }
  const format = resolveFormat(settings.format, info.mime, hasAlpha(image));
  hooks.progress(55, format === "png" ? "Packing a lossless PNG" : "Encoding");
  const encoded = await encodePrepared(image, format, settings, hooks, false);
  let bytes = encoded.bytes;
  let lossless = false;
  let note = "";
  if (format === "jpeg" && hasAlpha(decoded.image)) {
    note = "Transparent areas were filled so this could be a JPEG. White is the default.";
  }
  if (kind === "compress" && !resized && sameFamily(format, info.mime) && bytes.byteLength >= source.bytes.byteLength) {
    if (info.mime === "image/jpeg" && settings.stripExif) {
      const baked = await bakeJpeg(source.bytes);
      bytes = baked.bytes;
      lossless = baked.lossless && scansMatch(source.bytes, baked.bytes);
      note = "The new file wasn't smaller, so I kept the original pixels and removed the camera details.";
    } else if (!settings.stripExif) {
      bytes = source.bytes;
      lossless = true;
      note = "The original was already smaller, so I left it alone.";
    }
  } else if (kind === "resize" && upscaleBlocked) {
    note = "I didn't enlarge it. Making a photo bigger just looks soft, and this version doesn't invent detail.";
  } else if (kind === "resize" && resized) {
    note = "Resized with Lanczos, then a very light sharpen so edges don't go dull.";
  } else if (kind === "crop") {
    note = `Cropped and saved as ${format.toUpperCase()} at a high setting.`;
  } else if (kind === "convert") {
    note = `Saved as ${format.toUpperCase()}.`;
    if (bytes.byteLength > source.bytes.byteLength) note += " This one is larger than the original.";
  } else if (settings.stripExif) {
    note = note || "Camera details are not in the new file.";
  }
  const suffix =
    kind === "resize" ? `${image.width}w` : kind === "convert" ? format : kind === "crop" ? "cropped" : "compressed";
  hooks.progress(100, "Ready");
  return fileToOutput(source, { ...encoded, bytes }, image.width, image.height, suffix, {
    note,
    lossless,
    resized,
    quality: encoded.quality,
  });
}

async function runTarget(source: SourceFile, settings: Settings, hooks: Hooks): Promise<OutputFile> {
  const target = Math.max(8 * 1024, settings.targetBytes);
  const info = sniff(source.bytes, source.type, source.name);
  if (info.animated) {
    throw new UserError("This is an animated image. This version doesn't flatten animations into a still frame.");
  }
  if (info.mime === "image/svg+xml" || info.mime === "application/octet-stream") {
    throw new UserError("This file doesn't look like a photo I can open. Try a JPEG, PNG, WebP, HEIC, or a still GIF.");
  }
  if (info.width && info.height) guardSize(info.width, info.height, settings.allowLarge);
  const formatRequest = settings.format === "keep" ? "auto" : settings.format;
  const underAlready =
    source.bytes.byteLength <= target &&
    (formatRequest === "auto" || sameFamily(formatRequest, info.mime)) &&
    info.mime !== "image/heic" &&
    info.mime !== "image/heif" &&
    info.mime !== "image/bmp" &&
    info.mime !== "image/gif";
  if (underAlready) {
    let bytes = source.bytes;
    let lossless = true;
    if (settings.stripExif && info.mime === "image/jpeg") {
      const baked = await bakeJpeg(bytes);
      bytes = baked.bytes;
      lossless = baked.lossless;
    } else if (settings.stripExif && info.mime === "image/png") {
      bytes = stripPngMetadata(bytes)?.bytes ?? bytes;
    } else if (settings.stripExif && info.mime === "image/webp") {
      bytes = stripWebpMetadata(bytes)?.bytes ?? bytes;
    }
    if (bytes.byteLength <= target) {
      const ext = info.mime === "image/jpeg" ? "jpg" : info.mime === "image/png" ? "png" : info.mime === "image/webp" ? "webp" : "avif";
      const size = info.width && info.height ? { width: info.width, height: info.height } : await decodeFile(bytes, info.mime).then((d) => d.image);
      hooks.progress(100, "Already under the limit");
      return {
        name: outputName(source.name, ext, sizeSlug(target)),
        mime: info.mime,
        bytes,
        width: size.width,
        height: size.height,
        beforeBytes: source.bytes.byteLength,
        afterBytes: bytes.byteLength,
        lossless,
        resized: false,
        note: "Already under the limit, so the photo was not compressed again.",
      };
    }
  }

  hooks.progress(6, "Opening the photo");
  const decoded = await decodeFile(source.bytes, info.mime);
  guardSize(decoded.image.width, decoded.image.height, settings.allowLarge);
  const format = resolveFormat(formatRequest, info.mime, decoded.hasAlpha);
  let working = decoded.image;
  let resized = false;
  const floor = 50;
  const ceiling = 95;
  const originalLong = Math.max(working.width, working.height);
  const minLong = Math.min(originalLong, Math.max(320, Math.round(originalLong * 0.45)));
  let best: { bytes: Uint8Array; quality: number; image: ImageData } | null = null;
  let closest: { bytes: Uint8Array; quality: number; image: ImageData } | null = null;

  for (let step = 0; step < 9; step++) {
    check(hooks);
    let lo = floor;
    let hi = ceiling;
    let fit: { bytes: Uint8Array; quality: number } | null = null;
    while (hi - lo > 3) {
      check(hooks);
      const mid = Math.round((lo + hi) / 2);
      hooks.progress(Math.min(92, 12 + step * 8), `Trying quality ${mid}`);
      const encoded = await encodePrepared(working, format, settings, hooks, true, mid);
      if (!closest || encoded.bytes.byteLength < closest.bytes.byteLength) {
        closest = { bytes: encoded.bytes, quality: mid, image: working };
      }
      if (encoded.bytes.byteLength <= target) {
        fit = { bytes: encoded.bytes, quality: mid };
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (!fit) {
      const encoded = await encodePrepared(working, format, settings, hooks, true, lo);
      if (encoded.bytes.byteLength <= target) fit = { bytes: encoded.bytes, quality: lo };
      if (!closest || encoded.bytes.byteLength < closest.bytes.byteLength) {
        closest = { bytes: encoded.bytes, quality: lo, image: working };
      }
    }
    if (fit) {
      hooks.progress(94, "Saving the clean version");
      const finalEncode = await encodePrepared(working, format, settings, hooks, false, fit.quality);
      const finalBytes = finalEncode.bytes.byteLength <= target ? finalEncode.bytes : fit.bytes;
      best = { bytes: finalBytes, quality: fit.quality, image: working };
      break;
    }
    const longest = Math.max(working.width, working.height);
    const nextLong = Math.round(longest * 0.82);
    if (nextLong >= longest || nextLong < minLong) break;
    hooks.progress(Math.min(90, 20 + step * 8), "Scaling down a little");
    working = await resizeLanczos(
      decoded.image,
      Math.max(1, Math.round(decoded.image.width * (nextLong / originalLong))),
      Math.max(1, Math.round(decoded.image.height * (nextLong / originalLong))),
      hooks,
    );
    resized = true;
  }

  if (!best) {
    const closestSize = closest ? `${Math.round(closest.bytes.byteLength / 1024)} KB` : "a larger file";
    const where = closest ? `${closest.image.width}×${closest.image.height}` : "the original size";
    throw new UserError(
      `I couldn't get under ${sizeSlug(target).toUpperCase()} without making the photo too small. The closest was ${closestSize} at ${where}. Try a higher limit, or switch to WebP.`,
    );
  }

  const alphaNote =
    format === "jpeg" && decoded.hasAlpha ? " Transparent areas were filled so this could be a JPEG." : "";
  const resizeNote = resized ? ` The long side is now ${Math.max(best.image.width, best.image.height)}px.` : "";
  hooks.progress(100, "Ready");
  return {
    name: outputName(source.name, FORMAT_EXT[format], sizeSlug(target)),
    mime: FORMAT_MIME[format],
    bytes: best.bytes,
    width: best.image.width,
    height: best.image.height,
    beforeBytes: source.bytes.byteLength,
    afterBytes: best.bytes.byteLength,
    quality: best.quality,
    lossless: false,
    resized,
    note: `Fit the limit at quality ${best.quality}.${resizeNote}${alphaNote}`.trim(),
  };
}

async function runExif(source: SourceFile, hooks: Hooks): Promise<OutputFile> {
  hooks.progress(20, "Reading camera details");
  const info = sniff(source.bytes, source.type, source.name);
  if (info.animated) {
    throw new UserError("This is an animated image. This version doesn't edit animations.");
  }
  if (info.mime === "image/jpeg") {
    const baked = await bakeJpeg(source.bytes);
    const size = sniff(baked.bytes, "image/jpeg");
    const identical = scansMatch(source.bytes, baked.bytes);
    hooks.progress(100, "Ready");
    return {
      name: outputName(source.name, "jpg", "no-exif"),
      mime: "image/jpeg",
      bytes: baked.bytes,
      width: size.width ?? info.width ?? 0,
      height: size.height ?? info.height ?? 0,
      beforeBytes: source.bytes.byteLength,
      afterBytes: baked.bytes.byteLength,
      lossless: baked.lossless,
      resized: false,
      note: identical
        ? "Location, camera, and thumbnail details were removed. The photo pixels are unchanged."
        : baked.trimmed
          ? "The photo was turned upright without recompressing. A thin edge was trimmed so the blocks stayed aligned, and the camera details are gone."
          : "The photo was turned upright without recompressing, and the camera details are gone.",
    };
  }
  if (info.mime === "image/png") {
    const stripped = stripPngMetadata(source.bytes);
    hooks.progress(100, "Ready");
    return {
      name: outputName(source.name, "png", "no-exif"),
      mime: "image/png",
      bytes: stripped?.bytes ?? source.bytes,
      width: info.width ?? 0,
      height: info.height ?? 0,
      beforeBytes: source.bytes.byteLength,
      afterBytes: (stripped?.bytes ?? source.bytes).byteLength,
      lossless: true,
      resized: false,
      note: stripped?.changed
        ? "Text and camera chunks were removed. The picture data is unchanged."
        : "I didn't find camera or text details in this PNG, so the file is unchanged.",
    };
  }
  if (info.mime === "image/webp") {
    const stripped = stripWebpMetadata(source.bytes);
    hooks.progress(100, "Ready");
    return {
      name: outputName(source.name, "webp", "no-exif"),
      mime: "image/webp",
      bytes: stripped?.bytes ?? source.bytes,
      width: info.width ?? 0,
      height: info.height ?? 0,
      beforeBytes: source.bytes.byteLength,
      afterBytes: (stripped?.bytes ?? source.bytes).byteLength,
      lossless: true,
      resized: false,
      note: stripped?.changed
        ? "EXIF and XMP were removed. The picture data is unchanged."
        : "I didn't find camera details in this WebP, so the file is unchanged.",
    };
  }
  hooks.progress(40, "Saving a clean copy");
  const decoded = await decodeFile(source.bytes, info.mime);
  const format = decoded.hasAlpha ? "png" : "jpeg";
  const encoded = await encodePrepared(decoded.image, format, { ...settingsHigh(settingsFrom(source)), quality: 90 }, hooks, false);
  hooks.progress(100, "Ready");
  return fileToOutput(source, encoded, decoded.image.width, decoded.image.height, "no-exif", {
    note: "This format had to be saved again to drop the extra details. Quality was kept high.",
    lossless: false,
  });
}

function settingsFrom(_source: SourceFile): Settings {
  return {
    format: "keep",
    quality: 90,
    effort: true,
    stripExif: true,
    targetBytes: 200 * 1024,
    resizeMode: "long",
    width: 1,
    height: 1,
    longEdge: 1,
    percent: 100,
    lockRatio: true,
    allowUpscale: false,
    crop: null,
    turns: 0,
    flipH: false,
    flipV: false,
    background: "#ffffff",
    avifSharp: false,
    allowLarge: true,
    pdfMode: "fit",
    pdfMargin: 0,
    pdfName: "locapix.pdf",
  };
}

function settingsHigh(settings: Settings): Settings {
  return settings;
}

async function runRotate(source: SourceFile, settings: Settings, hooks: Hooks): Promise<OutputFile> {
  if (settings.turns === 0 && !settings.flipH && !settings.flipV) {
    throw new UserError("Turn or flip the photo first.");
  }
  const info = sniff(source.bytes, source.type, source.name);
  if (info.animated) throw new UserError("This is an animated image. This version doesn't turn animations.");
  hooks.progress(15, "Turning the photo");
  if (info.mime === "image/jpeg") {
    try {
      const baked = await bakeJpeg(source.bytes);
      const turned = await losslessTurn(baked.bytes, settings.turns, settings.flipH, settings.flipV);
      const size = sniff(turned.bytes, "image/jpeg");
      hooks.progress(100, "Ready");
      return {
        name: outputName(source.name, "jpg", "rotated"),
        mime: "image/jpeg",
        bytes: turned.bytes,
        width: size.width ?? 0,
        height: size.height ?? 0,
        beforeBytes: source.bytes.byteLength,
        afterBytes: turned.bytes.byteLength,
        lossless: true,
        resized: false,
        note: turned.trimmed || baked.trimmed
          ? "Turned without recompressing. A thin edge was trimmed so the blocks stayed aligned. Camera details were removed so the photo doesn't turn twice."
          : "Turned without recompressing. Camera details were removed so the photo doesn't turn twice.",
      };
    } catch (error) {
      if (error instanceof UserError || error instanceof CancelledError || error instanceof TooLargeError) throw error;
    }
  }
  const decoded = await decodeFile(source.bytes, info.mime);
  guardSize(decoded.image.width, decoded.image.height, settings.allowLarge);
  const turned = transformPixels(decoded.image, settings.turns, settings.flipH, settings.flipV);
  const format = resolveFormat(settings.format === "auto" ? "keep" : settings.format, info.mime, hasAlpha(turned));
  const previous = settings.quality;
  settings.quality = Math.max(settings.quality, 90);
  const encoded = await encodePrepared(turned, format, settings, hooks, false);
  settings.quality = previous;
  hooks.progress(100, "Ready");
  return fileToOutput(source, encoded, turned.width, turned.height, "rotated", {
    note: "This photo had to be saved again to turn it. Quality was kept high.",
    lossless: false,
  });
}

async function embeddable(source: SourceFile, hooks: Hooks): Promise<{ bytes: Uint8Array; mime: "image/jpeg" | "image/png"; width: number; height: number; lossless: boolean }> {
  const info = sniff(source.bytes, source.type, source.name);
  if (info.animated) throw new UserError(`${source.name} is animated. This version only adds still photos to a PDF.`);
  if (info.mime === "image/jpeg") {
    const baked = await bakeJpeg(source.bytes);
    const size = sniff(baked.bytes, "image/jpeg");
    return {
      bytes: baked.bytes,
      mime: "image/jpeg",
      width: size.width ?? info.width ?? 1,
      height: size.height ?? info.height ?? 1,
      lossless: true,
    };
  }
  if (info.mime === "image/png" && !info.animated) {
    const stripped = stripPngMetadata(source.bytes)?.bytes ?? source.bytes;
    return {
      bytes: stripped,
      mime: "image/png",
      width: info.width ?? 1,
      height: info.height ?? 1,
      lossless: true,
    };
  }
  const decoded = await decodeFile(source.bytes, info.mime);
  check(hooks);
  const format: ConcreteFormat = decoded.hasAlpha ? "png" : "jpeg";
  const bytes = await encodeFormat(decoded.image, format, 90, true, false, false);
  return {
    bytes,
    mime: format === "png" ? "image/png" : "image/jpeg",
    width: decoded.image.width,
    height: decoded.image.height,
    lossless: false,
  };
}

async function runPdf(files: SourceFile[], settings: Settings, hooks: Hooks): Promise<OutputFile> {
  if (files.length === 0) throw new UserError("Add at least one photo.");
  const pdf = await PDFDocument.create();
  let lossless = true;
  for (let index = 0; index < files.length; index++) {
    check(hooks);
    const source = files[index]!;
    hooks.progress(Math.round((index / files.length) * 90), `Adding ${source.name}`);
    const image = await embeddable(source, hooks);
    if (!image.lossless) lossless = false;
    const embedded = image.mime === "image/png" ? await pdf.embedPng(image.bytes) : await pdf.embedJpg(image.bytes);
    const margin = Math.max(0, settings.pdfMargin);
    if (settings.pdfMode === "fit") {
      const page = pdf.addPage([image.width + margin * 2, image.height + margin * 2]);
      page.drawImage(embedded, { x: margin, y: margin, width: image.width, height: image.height });
    } else {
      const base = settings.pdfMode === "letter" ? { width: 612, height: 792 } : { width: 595.28, height: 841.89 };
      const page = pdf.addPage([base.width, base.height]);
      const maxW = base.width - margin * 2;
      const maxH = base.height - margin * 2;
      const scale = Math.min(maxW / image.width, maxH / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(embedded, {
        x: (base.width - width) / 2,
        y: (base.height - height) / 2,
        width,
        height,
      });
    }
  }
  hooks.progress(96, "Building the PDF");
  const bytes = await pdf.save();
  const name = settings.pdfName.trim() || "locapix.pdf";
  hooks.progress(100, "Ready");
  return {
    name: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`,
    mime: "application/pdf",
    bytes: new Uint8Array(bytes),
    width: 0,
    height: 0,
    beforeBytes: files.reduce((sum, file) => sum + file.bytes.byteLength, 0),
    afterBytes: bytes.byteLength,
    lossless,
    resized: false,
    note: lossless
      ? "JPEG and PNG photos were embedded without compressing them again."
      : "Some photos were saved at high quality before they went into the PDF. JPEG and PNG originals were embedded as they were.",
  };
}

export async function processJob(
  kind: ToolKind,
  settings: Settings,
  files: SourceFile[],
  hooks: Hooks,
): Promise<JobResult> {
  if (files.length === 0) throw new UserError("Choose a photo first.");
  if (kind === "pdf") {
    const file = await runPdf(files, settings, hooks);
    return { files: [file], note: file.note };
  }
  const outputs: OutputFile[] = [];
  for (let index = 0; index < files.length; index++) {
    check(hooks);
    const source = files[index]!;
    const file =
      kind === "target"
        ? await runTarget(source, settings, hooks)
        : kind === "exif"
          ? await runExif(source, hooks)
          : kind === "rotate"
            ? await runRotate(source, settings, hooks)
            : await runCompress(source, settings, hooks, kind);
    outputs.push(file);
  }
  return { files: outputs, note: outputs[0]?.note ?? "" };
}

export function friendlyError(error: unknown): string {
  if (error instanceof UserError) return error.message;
  if (error instanceof TooLargeError) return "This photo is very large.";
  if (error instanceof CancelledError) return "Stopped.";
  const raw = error instanceof Error ? error.message : "";
  const text = raw.toLowerCase();
  if (text.includes("memory") || text.includes("allocation") || text.includes("out of bounds") || text.includes("abort")) {
    return "This photo is too large for the memory this browser can spare. Try a smaller copy, or close other tabs and try again.";
  }
  if (text.includes("heic") || text.includes("heif")) {
    return "This browser couldn't read that HEIC photo. Export a JPEG from your camera roll, or open this page in Safari.";
  }
  return "Something went wrong while processing this photo. Try it again, or use a different file.";
}
