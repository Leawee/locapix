"use client";

import { useEffect, useRef, useState } from "react";

export function Compare({ before, after }: { before: string; after?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(56);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [after]);

  if (!after) {
    return (
      <div>
        <div className="compare" style={{ aspectRatio: "4 / 3" }}>
          <img src={before} alt="Original photo" />
          <div className="compare-labels"><span>Original</span></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="compare" ref={box} style={{ aspectRatio: "4 / 3" }}>
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
      </div>
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn ghost" type="button" onClick={() => setZoom((value) => !value)}>
          {zoom ? "Hide full size" : "Check edges"}
        </button>
      </div>
      {zoom ? (
        <div style={{ overflow: "auto", maxHeight: 420, marginTop: 8, borderRadius: 16, background: "#fff1e6" }}>
          <img src={after} alt="Result at full size" style={{ width: "auto", maxWidth: "none", display: "block" }} />
        </div>
      ) : null}
    </div>
  );
}
