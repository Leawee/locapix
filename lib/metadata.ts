export type StripResult = {
  bytes: Uint8Array;
  changed: boolean;
};

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(bytes[start + i] ?? 0);
  return text;
}

function u16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

/** Drop EXIF, XMP, IPTC, comments, and thumbnails. Keep ICC and the compressed scan. */
export function stripJpegMetadata(input: Uint8Array): StripResult | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let changed = false;
  let i = 2;

  while (i < input.length) {
    if (input[i] !== 0xff) return null;
    while (i < input.length && input[i] === 0xff) i += 1;
    if (i >= input.length) return null;
    const marker = input[i]!;
    i += 1;

    if (marker === 0xd9) {
      parts.push(input.subarray(i - 2, i));
      break;
    }

    if (marker === 0xda) {
      parts.push(input.subarray(i - 2));
      break;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(i - 2, i));
      continue;
    }

    if (i + 1 >= input.length) return null;
    const length = u16(input, i);
    if (length < 2 || i + length > input.length) return null;
    const segment = input.subarray(i - 2, i + length);
    let drop = false;

    if (marker === 0xe1 || marker === 0xed || marker === 0xfe) {
      drop = true;
    } else if (marker === 0xe2) {
      const label = ascii(input, i + 2, 12);
      drop = !label.startsWith("ICC_PROFILE");
    } else if (marker >= 0xe3 && marker <= 0xef) {
      drop = true;
    }

    if (drop) changed = true;
    else parts.push(segment);
    i += length;
  }

  if (!changed) return { bytes: input, changed: false };
  return { bytes: concat(parts), changed: true };
}

const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

export function stripPngMetadata(input: Uint8Array): StripResult | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (input.length < 8) return null;
  for (let i = 0; i < 8; i++) if (input[i] !== signature[i]) return null;

  const parts: Uint8Array[] = [input.subarray(0, 8)];
  let changed = false;
  let i = 8;
  while (i + 12 <= input.length) {
    const length = u32(input, i);
    const type = ascii(input, i + 4, 4);
    const total = 12 + length;
    if (length < 0 || i + total > input.length) return null;
    if (PNG_DROP.has(type)) changed = true;
    else parts.push(input.subarray(i, i + total));
    i += total;
    if (type === "IEND") break;
  }
  if (!changed) return { bytes: input, changed: false };
  return { bytes: concat(parts), changed: true };
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24)
  ) >>> 0;
}

/** Remove EXIF and XMP chunks from a still or animated WebP container. */
export function stripWebpMetadata(input: Uint8Array): StripResult | null {
  if (input.length < 12 || ascii(input, 0, 4) !== "RIFF" || ascii(input, 8, 4) !== "WEBP") {
    return null;
  }
  const chunks: Uint8Array[] = [];
  let changed = false;
  let i = 12;
  while (i + 8 <= input.length) {
    const type = ascii(input, i, 4);
    const size = u32le(input, i + 4);
    const padded = size + (size % 2);
    const total = 8 + padded;
    if (i + total > input.length) return null;
    if (type === "EXIF" || type === "XMP ") {
      changed = true;
    } else if (type === "VP8X" && size >= 1) {
      const copy = input.slice(i, i + total);
      const flags = copy[8] ?? 0;
      const cleared = flags & ~0x0c;
      if (cleared !== flags) {
        copy[8] = cleared;
        changed = true;
      }
      chunks.push(copy);
    } else {
      chunks.push(input.subarray(i, i + total));
    }
    i += total;
  }
  if (!changed) return { bytes: input, changed: false };
  const body = concat(chunks);
  const out = new Uint8Array(12 + body.length);
  out.set(input.subarray(0, 12), 0);
  out.set(body, 12);
  const payload = out.length - 8;
  out[4] = payload & 0xff;
  out[5] = (payload >> 8) & 0xff;
  out[6] = (payload >> 16) & 0xff;
  out[7] = (payload >> 24) & 0xff;
  return { bytes: out, changed: true };
}

export function jpegScanOffset(bytes: Uint8Array): number {
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1] ?? 0;
    if (marker === 0xda) return i;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const length = u16(bytes, i + 2);
    if (length < 2) return -1;
    i += 2 + length;
  }
  return -1;
}
