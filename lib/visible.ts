export type Raster = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};

export type FrameSize = {
  lossless: boolean;
  beforeWidth: number;
  beforeHeight: number;
  afterWidth: number;
  afterHeight: number;
};

// Preview-sized samples (the compare frame, not the full photo). Tuned so a
// high-quality recompress stays under the line, and a real softness or
// brightness shift crosses it. A person cannot see a mean channel gap under
// about 4 levels once the photo is fit in the frame.
const MEAN_VISIBLE = 4;
const P95_VISIBLE = 11;
const STRONG_DELTA = 12;
const STRONG_FRACTION = 0.03;
const SHARP_DELTA = 24;
const SHARP_FRACTION = 0.008;

function isEdgeTrim(beforeWidth: number, beforeHeight: number, afterWidth: number, afterHeight: number): boolean {
  const dw = Math.abs(beforeWidth - afterWidth);
  const dh = Math.abs(beforeHeight - afterHeight);
  if (dw === 0 && dh === 0) return false;
  if (dw > 16 || dh > 16) return false;
  const widthBase = Math.max(beforeWidth, afterWidth, 1);
  const heightBase = Math.max(beforeHeight, afterHeight, 1);
  return dw / widthBase <= 0.02 && dh / heightBase <= 0.02;
}

/** Crop, resize, or a turn that changes the shape. A lossless MCU trim does not. */
export function hasMeaningfulSizeChange(frame: FrameSize): boolean {
  if (frame.beforeWidth !== frame.afterWidth || frame.beforeHeight !== frame.afterHeight) {
    if (frame.lossless && isEdgeTrim(frame.beforeWidth, frame.beforeHeight, frame.afterWidth, frame.afterHeight)) {
      return false;
    }
    return true;
  }
  return false;
}

type RasterDelta = {
  mean: number;
  p95: number;
  strongFraction: number;
  sharpFraction: number;
};

function rasterDelta(before: Raster, after: Raster): RasterDelta | null {
  if (before.width !== after.width || before.height !== after.height) return null;
  const count = before.width * before.height;
  if (count === 0) return { mean: 0, p95: 0, strongFraction: 0, sharpFraction: 0 };
  const hist = new Uint32Array(256);
  let sum = 0;
  let strong = 0;
  let sharp = 0;
  const left = before.data;
  const right = after.data;
  for (let pixel = 0; pixel < count; pixel++) {
    const index = pixel * 4;
    const delta = Math.max(
      Math.abs((left[index] ?? 0) - (right[index] ?? 0)),
      Math.abs((left[index + 1] ?? 0) - (right[index + 1] ?? 0)),
      Math.abs((left[index + 2] ?? 0) - (right[index + 2] ?? 0)),
      Math.abs((left[index + 3] ?? 0) - (right[index + 3] ?? 0)),
    );
    hist[delta] += 1;
    sum += delta;
    if (delta >= STRONG_DELTA) strong += 1;
    if (delta >= SHARP_DELTA) sharp += 1;
  }
  let seen = 0;
  let p95 = 0;
  const target = count * 0.95;
  for (let delta = 0; delta < 256; delta++) {
    seen += hist[delta] ?? 0;
    if (seen >= target) {
      p95 = delta;
      break;
    }
  }
  return { mean: sum / count, p95, strongFraction: strong / count, sharpFraction: sharp / count };
}

const EDGE_RANGE = 18;
const EDGE_DELTA = 8;

type EdgeDelta = { edges: number; mean: number; fraction: number };

function edgeDelta(before: Raster, after: Raster): EdgeDelta | null {
  if (before.width !== after.width || before.height !== after.height) return null;
  const width = before.width;
  const height = before.height;
  if (width < 3 || height < 3) return { edges: 0, mean: 0, fraction: 0 };
  const left = before.data;
  const right = after.data;
  let edges = 0;
  let changed = 0;
  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;
      let min = 255;
      let max = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const neighbor = ((y + ky) * width + (x + kx)) * 4;
          const luma = (left[neighbor] ?? 0) + (left[neighbor + 1] ?? 0) + (left[neighbor + 2] ?? 0);
          if (luma < min) min = luma;
          if (luma > max) max = luma;
        }
      }
      if (max - min < EDGE_RANGE * 3) continue;
      edges += 1;
      const delta = Math.max(
        Math.abs((left[index] ?? 0) - (right[index] ?? 0)),
        Math.abs((left[index + 1] ?? 0) - (right[index + 1] ?? 0)),
        Math.abs((left[index + 2] ?? 0) - (right[index + 2] ?? 0)),
      );
      sum += delta;
      if (delta >= EDGE_DELTA) changed += 1;
    }
  }
  if (edges === 0) return { edges: 0, mean: 0, fraction: 0 };
  return { edges, mean: sum / edges, fraction: changed / edges };
}

export function edgeLooksDifferent(before: Raster, after: Raster): boolean {
  const delta = edgeDelta(before, after);
  if (!delta) return true;
  if (delta.edges < 32) return false;
  return delta.mean >= 6 || delta.fraction >= 0.18;
}

/** True when two same-size preview rasters would look different in the frame. */
export function rasterLooksDifferent(before: Raster, after: Raster): boolean {
  if (before.width !== after.width || before.height !== after.height) return true;
  const delta = rasterDelta(before, after);
  if (!delta) return false;
  return delta.mean >= MEAN_VISIBLE || delta.p95 >= P95_VISIBLE || delta.strongFraction >= STRONG_FRACTION || delta.sharpFraction >= SHARP_FRACTION;
}
