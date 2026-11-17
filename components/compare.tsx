"use client";

import { useEffect, useRef, useState } from "react";
import { edgeLooksDifferent, hasMeaningfulSizeChange, rasterLooksDifferent, type Raster } from "@/lib/visible";

async function loadBitmap(src: string, signal: AbortSignal): Promise<ImageBitmap> {
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error("Could not read that photo");
  const blob = await response.blob();
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}

function sampleBitmap(bitmap: ImageBitmap, edge: number): Raster {
  const longest = Math.max(bitmap.width, bitmap.height, 1);
  const scale = Math.min(1, edge / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not sample the photo");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  return { width, height, data: pixels.data };
}

async function imagesNeedSplit(before: string, after: string, lossless: boolean, edge: number, signal: AbortSignal): Promise<boolean> {
  const [left, right] = await Promise.all([loadBitmap(before, signal), loadBitmap(after, signal)]);
  try {
    if (signal.aborted) return false;
    const frame = {
      lossless,
      beforeWidth: left.width,
      beforeHeight: left.height,
      afterWidth: right.width,
      afterHeight: right.height,
    };
    if (hasMeaningfulSizeChange(frame)) return true;
    if (left.width !== right.width || left.height !== right.height) return false;
    const sampledLeft = sampleBitmap(left, edge);
    const sampledRight = sampleBitmap(right, edge);
    return rasterLooksDifferent(sampledLeft, sampledRight) || edgeLooksDifferent(sampledLeft, sampledRight);
  } finally {
    left.close();
    right.close();
  }
}

export function Compare({ before, after, lossless = false }: { before: string; after?: string; lossless?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(56);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(false);
  const token = `${before}\0${after ?? ""}\0${lossless ? "1" : "0"}`;
  const [tokenSeen, setTokenSeen] = useState(token);
  const [split, setSplit] = useState(false);
  if (tokenSeen !== token) {
    setTokenSeen(token);
    setSplit(false);
  }

  useEffect(() => {
    const node = box.current;
    if (!node || !after || !split) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [after, split]);

  useEffect(() => {
    if (!after) return;
    const controller = new AbortController();
    // Sample at a normal compare-frame size so a phone and a desktop agree,
    // and so a tiny encoder gap that disappears at this size stays hidden.
    const edge = 640;
    void imagesNeedSplit(before, after, lossless, edge, controller.signal).then((show) => {
      if (!controller.signal.aborted) setSplit(show);
    }).catch(() => {
      if (!controller.signal.aborted) setSplit(!lossless);
    });
    return () => controller.abort();
  }, [before, after, lossless]);

  const showSplit = Boolean(after) && split;

  return (
    <div>
      <div className="compare" ref={box} data-compare={showSplit ? "split" : "single"} style={{ aspectRatio: "4 / 3" }}>
        {showSplit ? (
          <>
            <img src={after} alt="Edited photo" />
            <div className="compare-clip" style={{ width: `${pos}%` }}>
              <img src={before} alt="" style={{ width: width || "100%", maxWidth: "none", height: "100%" }} />
            </div>
            <div className="compare-handle" style={{ left: `${pos}%` }}>
              <div className="compare-knob" aria-hidden="true">↔</div>
            </div>
            <div className="compare-labels">
              <span>Original</span>
              <span>Result</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              aria-label="Compare the original and the result"
              onChange={(event) => setPos(Number(event.target.value))}
            />
          </>
        ) : (
          <>
            <img src={after ?? before} alt={after ? "Edited photo" : "Original photo"} draggable={false} />
            {after ? null : (
              <div className="compare-labels"><span>Original</span></div>
            )}
          </>
        )}
      </div>
      {after ? (
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn ghost" type="button" onClick={() => setZoom((value) => !value)}>
            {zoom ? "Hide full size" : "Check edges"}
          </button>
        </div>
      ) : null}
      {zoom && after ? (
        <div style={{ overflow: "auto", maxHeight: 420, marginTop: 8, borderRadius: 16, background: "#fff1e6" }}>
          <img src={after} alt="Result at full size" style={{ width: "auto", maxWidth: "none", display: "block" }} />
        </div>
      ) : null}
    </div>
  );
}
