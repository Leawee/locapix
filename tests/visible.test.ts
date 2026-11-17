import assert from "node:assert/strict";
import test from "node:test";
import { edgeLooksDifferent, hasMeaningfulSizeChange, rasterLooksDifferent, type Raster } from "../lib/visible.ts";

function solid(width: number, height: number, rgba: [number, number, number, number] = [120, 140, 160, 255]): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = rgba[0];
    data[index + 1] = rgba[1];
    data[index + 2] = rgba[2];
    data[index + 3] = rgba[3];
  }
  return { width, height, data };
}

function shifted(source: Raster, amount: number): Raster {
  const data = new Uint8ClampedArray(source.data.length);
  for (let index = 0; index < source.data.length; index += 4) {
    data[index] = Math.max(0, Math.min(255, (source.data[index] ?? 0) + amount));
    data[index + 1] = Math.max(0, Math.min(255, (source.data[index + 1] ?? 0) + amount));
    data[index + 2] = Math.max(0, Math.min(255, (source.data[index + 2] ?? 0) + amount));
    data[index + 3] = source.data[index + 3] ?? 255;
  }
  return { width: source.width, height: source.height, data };
}

test("identical pixels and a tiny encoder shift are not a visible change", () => {
  const photo = solid(80, 60);
  assert.equal(rasterLooksDifferent(photo, photo), false);
  assert.equal(rasterLooksDifferent(photo, shifted(photo, 2)), false);
  assert.equal(rasterLooksDifferent(photo, shifted(photo, 3)), false);
});

test("a brightness shift a person can see counts as a visible change", () => {
  const photo = solid(80, 60);
  assert.equal(rasterLooksDifferent(photo, shifted(photo, 10)), true);
});

test("an obvious patch counts, a speck does not", () => {
  const photo = solid(100, 100);
  const speck = solid(100, 100);
  for (let index = 0; index < 20 * 4; index += 4) {
    speck.data[index] = 255;
    speck.data[index + 1] = 255;
    speck.data[index + 2] = 255;
  }
  assert.equal(rasterLooksDifferent(photo, speck), false);

  const patch = solid(100, 100);
  for (let index = 0; index < 800 * 4; index += 4) {
    patch.data[index] = 20;
    patch.data[index + 1] = 20;
    patch.data[index + 2] = 20;
  }
  assert.equal(rasterLooksDifferent(photo, patch), true);
});

function stripes(width: number, height: number): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = Math.floor(x / 4) % 2 === 0 ? 16 : 230;
      const index = (y * width + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { width, height, data };
}

test("soft edges count as a visible change and a small encoder gap does not", () => {
  const photo = stripes(48, 36);
  assert.equal(edgeLooksDifferent(photo, photo), false);
  assert.equal(edgeLooksDifferent(photo, shifted(photo, 2)), false);
  assert.equal(edgeLooksDifferent(photo, solid(48, 36, [128, 128, 128, 255])), true);
});

test("crop and resize keep the compare line", () => {
  assert.equal(hasMeaningfulSizeChange({
    lossless: false,
    beforeWidth: 4000,
    beforeHeight: 3000,
    afterWidth: 2000,
    afterHeight: 1500,
  }), true);
  assert.equal(hasMeaningfulSizeChange({
    lossless: false,
    beforeWidth: 4000,
    beforeHeight: 3000,
    afterWidth: 3200,
    afterHeight: 2400,
  }), true);
  assert.equal(hasMeaningfulSizeChange({
    lossless: false,
    beforeWidth: 4000,
    beforeHeight: 3000,
    afterWidth: 3984,
    afterHeight: 3000,
  }), true);
});

test("a quarter turn changes the shape even when the file stays lossless", () => {
  assert.equal(hasMeaningfulSizeChange({
    lossless: true,
    beforeWidth: 3000,
    beforeHeight: 4000,
    afterWidth: 4000,
    afterHeight: 3000,
  }), true);
});

test("a lossless block trim is not a visible size change", () => {
  assert.equal(hasMeaningfulSizeChange({
    lossless: true,
    beforeWidth: 4032,
    beforeHeight: 3024,
    afterWidth: 4016,
    afterHeight: 3008,
  }), false);
  assert.equal(hasMeaningfulSizeChange({
    lossless: true,
    beforeWidth: 4032,
    beforeHeight: 3024,
    afterWidth: 4032,
    afterHeight: 3024,
  }), false);
});
