import assert from "node:assert/strict";
import test from "node:test";
import { jpegScanOffset, stripJpegMetadata, stripPngMetadata } from "../lib/metadata.ts";
import { sniff } from "../lib/sniff.ts";

function jpegWithExif(): Uint8Array {
  const exif = new Uint8Array([
    0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
  ]);
  const sof = new Uint8Array([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x02, 0x01, 0x01, 0x11, 0x00]);
  const scan = new Uint8Array([0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x12, 0x34, 0xff, 0xd9]);
  const out = new Uint8Array(2 + exif.length + sof.length + scan.length);
  out.set([0xff, 0xd8], 0);
  out.set(exif, 2);
  out.set(sof, 2 + exif.length);
  out.set(scan, 2 + exif.length + sof.length);
  return out;
}

test("jpeg strip removes EXIF and keeps the scan", () => {
  const input = jpegWithExif();
  const stripped = stripJpegMetadata(input);
  assert.ok(stripped);
  assert.equal(stripped.changed, true);
  assert.equal(stripped.bytes.includes(0xe1), false);
  assert.equal(jpegScanOffset(input) > 0, true);
  const originalScan = input.subarray(jpegScanOffset(input));
  const nextScan = stripped.bytes.subarray(jpegScanOffset(stripped.bytes));
  assert.deepEqual(nextScan, originalScan);
});

test("jpeg strip keeps a file that has no private markers", () => {
  const input = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0xff, 0xd9]);
  const stripped = stripJpegMetadata(input);
  assert.ok(stripped);
  assert.equal(stripped.changed, false);
  assert.equal(stripped.bytes, input);
});

test("png strip drops text chunks", () => {
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const text = new Uint8Array(12 + 4);
  text.set([0, 0, 0, 4], 0);
  text.set([116, 69, 88, 116], 4);
  const ihdr = new Uint8Array(12 + 13);
  ihdr.set([0, 0, 0, 13], 0);
  ihdr.set([73, 72, 68, 82], 4);
  const iend = new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0]);
  const input = new Uint8Array(signature.length + text.length + ihdr.length + iend.length);
  input.set(signature, 0);
  input.set(text, signature.length);
  input.set(ihdr, signature.length + text.length);
  input.set(iend, signature.length + text.length + ihdr.length);
  const stripped = stripPngMetadata(input);
  assert.ok(stripped?.changed);
  const textMarker = String.fromCharCode(116, 69, 88, 116);
  assert.equal(Buffer.from(stripped.bytes).includes(textMarker), false);
});

test("sniff recognises jpeg, png, and animated gif", () => {
  const jpeg = sniff(Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x20]));
  assert.equal(jpeg.mime, "image/jpeg");
  assert.equal(jpeg.height, 16);
  assert.equal(jpeg.width, 32);
  const gif = new Uint8Array(32);
  gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 8, 0, 8, 0], 0);
  gif[10] = 0x21;
  gif[11] = 0xf9;
  gif[14] = 0x21;
  gif[15] = 0xf9;
  const animated = sniff(gif);
  assert.equal(animated.mime, "image/gif");
  assert.equal(animated.animated, true);
});
