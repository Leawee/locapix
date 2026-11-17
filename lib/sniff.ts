export type Sniff = {
  mime: string;
  animated: boolean;
  width: number | null;
  height: number | null;
};

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

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    while (bytes[i] === 0xff) i += 1;
    const marker = bytes[i] ?? 0;
    i += 1;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    const length = u16(bytes, i);
    if (length < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      return { height: u16(bytes, i + 3), width: u16(bytes, i + 5) };
    }
    if (marker === 0xda) break;
    i += length;
  }
  return null;
}

function pngAnimated(bytes: Uint8Array): boolean {
  let i = 8;
  while (i + 8 <= bytes.length) {
    const length = u32(bytes, i);
    const type = ascii(bytes, i + 4, 4);
    if (type === "acTL") return true;
    if (type === "IDAT" || type === "IEND") return false;
    i += 12 + length;
  }
  return false;
}

function gifAnimated(bytes: Uint8Array): boolean {
  let frames = 0;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) {
      frames += 1;
      if (frames > 1) return true;
    }
  }
  return false;
}

function webpInfo(bytes: Uint8Array): { animated: boolean; width: number | null; height: number | null } {
  let animated = false;
  let width: number | null = null;
  let height: number | null = null;
  let i = 12;
  while (i + 8 <= bytes.length) {
    const type = ascii(bytes, i, 4);
    const size =
      (bytes[i + 4] ?? 0) |
      ((bytes[i + 5] ?? 0) << 8) |
      ((bytes[i + 6] ?? 0) << 16) |
      ((bytes[i + 7] ?? 0) << 24);
    if (type === "ANIM") animated = true;
    if (type === "VP8X" && size >= 10) {
      width = 1 + ((bytes[i + 12] ?? 0) | ((bytes[i + 13] ?? 0) << 8) | ((bytes[i + 14] ?? 0) << 16));
      height = 1 + ((bytes[i + 15] ?? 0) | ((bytes[i + 16] ?? 0) << 8) | ((bytes[i + 17] ?? 0) << 16));
    }
    if (type === "VP8 " && size >= 10 && width === null) {
      width = ((bytes[i + 14] ?? 0) | ((bytes[i + 15] ?? 0) << 8)) & 0x3fff;
      height = ((bytes[i + 16] ?? 0) | ((bytes[i + 17] ?? 0) << 8)) & 0x3fff;
    }
    const step = 8 + size + (size % 2);
    if (step <= 0) break;
    i += step;
  }
  return { animated, width, height };
}

function ftypBrand(bytes: Uint8Array): string | null {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== "ftyp") return null;
  return ascii(bytes, 8, 4);
}

export function sniff(bytes: Uint8Array, fallbackType = "", fallbackName = ""): Sniff {
  const name = fallbackName.toLowerCase();
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const size = jpegSize(bytes);
    return { mime: "image/jpeg", animated: false, width: size?.width ?? null, height: size?.height ?? null };
  }
  if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") {
    const width = bytes.length >= 24 ? u32(bytes, 16) : null;
    const height = bytes.length >= 24 ? u32(bytes, 20) : null;
    return { mime: "image/png", animated: pngAnimated(bytes), width, height };
  }
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") {
    const width = (bytes[6] ?? 0) | ((bytes[7] ?? 0) << 8);
    const height = (bytes[8] ?? 0) | ((bytes[9] ?? 0) << 8);
    return { mime: "image/gif", animated: gifAnimated(bytes), width, height };
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    const info = webpInfo(bytes);
    return { mime: "image/webp", animated: info.animated, width: info.width, height: info.height };
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    const width =
      (bytes[18] ?? 0) | ((bytes[19] ?? 0) << 8) | ((bytes[20] ?? 0) << 16) | ((bytes[21] ?? 0) << 24);
    const height = Math.abs(
      (bytes[22] ?? 0) | ((bytes[23] ?? 0) << 8) | ((bytes[24] ?? 0) << 16) | ((bytes[25] ?? 0) << 24),
    );
    return { mime: "image/bmp", animated: false, width, height };
  }
  const brand = ftypBrand(bytes);
  if (brand) {
    const heic = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"];
    const avif = ["avif", "avis"];
    if (heic.includes(brand)) {
      const animated = brand === "msf1" || brand === "hevc" || brand === "hevx";
      return { mime: "image/heic", animated, width: null, height: null };
    }
    if (avif.includes(brand)) {
      return { mime: "image/avif", animated: brand === "avis", width: null, height: null };
    }
  }
  if (name.endsWith(".heic") || name.endsWith(".heif")) {
    return { mime: "image/heic", animated: false, width: null, height: null };
  }
  if (name.endsWith(".avif")) return { mime: "image/avif", animated: false, width: null, height: null };
  if (ascii(bytes, 0, 5) === "<svg" || ascii(bytes, 0, 4) === "<?xm") {
    return { mime: "image/svg+xml", animated: false, width: null, height: null };
  }
  return { mime: "application/octet-stream", animated: false, width: null, height: null };
}

export function isTooLarge(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return width > 8192 || height > 8192 || width * height > 32_000_000;
}
