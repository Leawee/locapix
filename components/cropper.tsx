"use client";

import { useRef } from "react";

export type Crop = { x: number; y: number; width: number; height: number };

type Drag = {
  mode: "move" | "nw" | "ne" | "sw" | "se";
  pointerX: number;
  pointerY: number;
  crop: Crop;
};

function clampCrop(crop: Crop, width: number, height: number, aspect: number | null): Crop {
  let next = { ...crop };
  next.width = Math.max(16, Math.min(width, next.width));
  next.height = Math.max(16, Math.min(height, next.height));
  if (aspect) next.height = next.width / aspect;
  if (next.height > height) {
    next.height = height;
    next.width = aspect ? next.height * aspect : next.width;
  }
  if (next.width > width) {
    next.width = width;
    next.height = aspect ? next.width / aspect : next.height;
  }
  next.x = Math.max(0, Math.min(width - next.width, next.x));
  next.y = Math.max(0, Math.min(height - next.height, next.y));
  return next;
}

export function fitAspect(width: number, height: number, aspect: number): Crop {
  let cropWidth = width;
  let cropHeight = cropWidth / aspect;
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = cropHeight * aspect;
  }
  return {
    x: (width - cropWidth) / 2,
    y: (height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
}

export function Cropper({
  src,
  crop,
  aspect,
  natural,
  onChange,
  onNatural,
}: {
  src: string;
  crop: Crop | null;
  aspect: number | null;
  natural: { width: number; height: number } | null;
  onChange: (crop: Crop) => void;
  onNatural: (size: { width: number; height: number }) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const width = natural?.width ?? 1;
  const height = natural?.height ?? 1;
  const box = crop ?? { x: 0, y: 0, width, height };

  function point(event: React.PointerEvent) {
    const img = frame.current?.querySelector("img");
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * img.naturalWidth,
      y: ((event.clientY - rect.top) / rect.height) * img.naturalHeight,
    };
  }

  function move(event: React.PointerEvent) {
    const current = drag.current;
    if (!current || !natural) return;
    const now = point(event);
    const dx = now.x - current.pointerX;
    const dy = now.y - current.pointerY;
    let next = { ...current.crop };
    if (current.mode === "move") {
      next.x += dx;
      next.y += dy;
    } else {
      if (current.mode.includes("e")) next.width = current.crop.width + dx;
      if (current.mode.includes("s")) next.height = current.crop.height + dy;
      if (current.mode.includes("w")) {
        next.x = current.crop.x + dx;
        next.width = current.crop.width - dx;
      }
      if (current.mode.includes("n")) {
        next.y = current.crop.y + dy;
        next.height = current.crop.height - dy;
      }
    }
    onChange(clampCrop(next, natural.width, natural.height, aspect));
  }

  function nudge(event: React.KeyboardEvent) {
    if (!natural || !crop) return;
    const step = event.shiftKey ? 10 : 1;
    const next = { ...crop };
    if (event.key === "ArrowLeft") next.x -= step;
    if (event.key === "ArrowRight") next.x += step;
    if (event.key === "ArrowUp") next.y -= step;
    if (event.key === "ArrowDown") next.y += step;
    if (next !== crop) {
      event.preventDefault();
      onChange(clampCrop(next, natural.width, natural.height, aspect));
    }
  }

  return (
    <div
      className="crop-frame"
      ref={frame}
      tabIndex={0}
      onKeyDown={nudge}
      aria-label="Crop box. Use the arrow keys to nudge it."
      style={{ position: "relative", display: "inline-block", maxWidth: "100%", touchAction: "none" }}
    >
      <img
        src={src}
        alt="Photo to crop"
        onLoad={(event) => onNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        style={{ display: "block", maxWidth: "100%", maxHeight: "64vh", width: "auto", height: "auto", borderRadius: 18 }}
      />
      {natural ? (
        <div
          className="crop-rect"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const start = point(event);
            drag.current = { mode: "move", pointerX: start.x, pointerY: start.y, crop: box };
          }}
          onPointerMove={move}
          onPointerUp={() => {
            drag.current = null;
          }}
          style={{
            left: `${(box.x / width) * 100}%`,
            top: `${(box.y / height) * 100}%`,
            width: `${(box.width / width) * 100}%`,
            height: `${(box.height / height) * 100}%`,
          }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="handle"
              aria-label={`Resize crop from the ${mode} corner`}
              style={{
                left: mode.includes("w") ? 0 : "100%",
                top: mode.includes("n") ? 0 : "100%",
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                const start = point(event);
                drag.current = { mode, pointerX: start.x, pointerY: start.y, crop: box };
              }}
              onPointerMove={move}
              onPointerUp={() => {
                drag.current = null;
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
