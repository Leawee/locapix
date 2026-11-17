"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zipSync } from "fflate";
import exifr from "exifr";
import { Camera, Upload } from "lucide-react";
import { Compare } from "@/components/compare";
import { Cropper, fitAspect, type Crop } from "@/components/cropper";
import { useRegisterDrop } from "@/components/providers";
import { SIZE_PRESETS, formatBytes, savedPercent } from "@/lib/bytes";
import { clearStaged, peekStaged, stageFiles } from "@/lib/inbox";
import { getPool } from "@/lib/pool";
import { defaultSettings, type Settings, type ToolKind } from "@/lib/process/types";
import type { Tool } from "@/lib/tools";

type ExifView = { camera?: string; when?: string; where?: string; empty: boolean };

type Item = {
  id: string;
  file: File;
  url: string;
  status: "idle" | "working" | "done" | "error" | "cancelled" | "confirm";
  progress: number;
  label: string;
  error?: string;
  resultUrl?: string;
  resultBlob?: Blob;
  resultName?: string;
  width?: number;
  height?: number;
  before?: number;
  after?: number;
  note?: string;
  quality?: number;
  lossless?: boolean;
  exif?: ExifView;
  large?: { width: number; height: number };
};

const aspects = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
] as const;

function settingsFrom(tool: Tool): Settings {
  return {
    ...defaultSettings(),
    format: tool.format,
    quality: tool.quality,
    targetBytes: tool.targetBytes,
  };
}

async function readExif(file: File): Promise<ExifView> {
  try {
    const data = await exifr.parse(file, { gps: true, reviveValues: true });
    if (!data) return { empty: true };
    const camera = [data.Make, data.Model].filter(Boolean).join(" ");
    const when = data.DateTimeOriginal instanceof Date
      ? data.DateTimeOriginal.toLocaleString()
      : data.DateTimeOriginal
        ? String(data.DateTimeOriginal)
        : undefined;
    const where = typeof data.latitude === "number" && typeof data.longitude === "number"
      ? `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`
      : undefined;
    return { camera: camera || undefined, when, where, empty: !camera && !when && !where };
  } catch {
    return { empty: true };
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function Workspace({ tool, chips, hero = false }: { tool: Tool; chips?: Tool["chips"]; hero?: boolean }) {
  const chipMode = chips ?? tool.chips;
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => settingsFrom(tool));
  const [mode, setMode] = useState<ToolKind>(tool.batch ? "compress" : tool.kind);
  const [batchOp, setBatchOp] = useState<ToolKind>("compress");
  const [aspect, setAspect] = useState<number | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [over, setOver] = useState(false);
  const [banner, setBanner] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfNote, setPdfNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  const settingsRef = useRef(settings);
  const modeRef = useRef(mode);
  const batchRef = useRef(batchOp);
  const gen = useRef(0);
  itemsRef.current = items;
  settingsRef.current = settings;
  modeRef.current = mode;
  batchRef.current = batchOp;

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const working = items.some((item) => item.status === "working");

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/") || /\.(heic|heif|avif|bmp|webp|jpe?g|png|gif)$/i.test(file.name));
    if (images.length === 0) {
      setBanner("Those files aren't photos. Try a JPEG, PNG, WebP, HEIC, or a still GIF.");
      return;
    }
    setBanner("");
    const next = images.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
      status: "idle" as const,
      progress: 0,
      label: "Waiting",
    }));
    setItems((current) => [...current, ...next]);
    setSelectedId((current) => current ?? next[0]?.id ?? null);
    void Promise.all(next.map(async (item) => ({ id: item.id, exif: await readExif(item.file) }))).then((rows) => {
      setItems((current) => current.map((item) => {
        const row = rows.find((entry) => entry.id === item.id);
        return row ? { ...item, exif: row.exif } : item;
      }));
    });
  }, []);

  useRegisterDrop(addFiles);

  useEffect(() => {
    const staged = peekStaged();
    if (!staged?.length) return;
    addFiles(staged);
    const timer = window.setTimeout(() => clearStaged(), 1200);
    return () => window.clearTimeout(timer);
  }, [addFiles]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.url);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!working) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [working]);

  const clearAll = useCallback(() => {
    gen.current += 1;
    getPool().cancelAll();
    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.url);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    }
    setItems([]);
    setSelectedId(null);
    setPdfBlob(null);
    setPdfNote("");
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const run = useCallback(async (onlyId?: string, allowLarge = false) => {
    const generation = ++gen.current;
    getPool().cancelAll();
    const snapshot = itemsRef.current.filter((item) => !onlyId || item.id === onlyId);
    if (snapshot.length === 0) return;
    const op = tool.batch ? batchRef.current : modeRef.current;
    const base = { ...settingsRef.current, allowLarge: allowLarge || settingsRef.current.allowLarge };
    setItems((current) => current.map((item) => (
      snapshot.some((entry) => entry.id === item.id)
        ? { ...item, status: "working", progress: 6, label: "Getting ready", error: undefined }
        : item
    )));

    if (op === "pdf") {
      const files = await Promise.all(snapshot.map(async (item) => ({
        name: item.file.name,
        type: item.file.type,
        buffer: await item.file.arrayBuffer(),
      })));
      if (generation !== gen.current) return;
      const result = await getPool().run(`pdf:${generation}`, "pdf", base, files, (value, label) => {
        if (generation !== gen.current) return;
        setItems((current) => current.map((item) => snapshot.some((entry) => entry.id === item.id) ? { ...item, progress: value, label } : item));
      });
      if (generation !== gen.current) return;
      if (result.type === "done" && result.files[0]) {
        const file = result.files[0];
        const blob = new Blob([file.buffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfNote(file.note);
        setPdfUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return url;
        });
        setItems((current) => current.map((item) => snapshot.some((entry) => entry.id === item.id) ? { ...item, status: "done", progress: 100, label: "Ready", note: file.note } : item));
      } else if (result.type === "too-large") {
        setItems((current) => current.map((item) => item.id === snapshot[0]?.id ? { ...item, status: "confirm", large: { width: result.width, height: result.height }, label: "Very large photo" } : item));
      } else if (result.type === "error") {
        setItems((current) => current.map((item) => snapshot.some((entry) => entry.id === item.id) ? { ...item, status: "error", error: result.message, label: "Needs a look" } : item));
      } else {
        setItems((current) => current.map((item) => snapshot.some((entry) => entry.id === item.id) ? { ...item, status: "cancelled", label: "Stopped" } : item));
      }
      return;
    }

    await Promise.all(snapshot.map(async (item) => {
      const buffer = await item.file.arrayBuffer();
      if (generation !== gen.current) return;
      const result = await getPool().run(`${item.id}:${generation}`, op, base, [{
        name: item.file.name,
        type: item.file.type,
        buffer,
      }], (value, label) => {
        if (generation !== gen.current) return;
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress: value, label, status: "working" } : entry));
      });
      if (generation !== gen.current) return;
      setItems((current) => current.map((entry) => {
        if (entry.id !== item.id) return entry;
        if (result.type === "done" && result.files[0]) {
          const file = result.files[0];
          const blob = new Blob([file.buffer], { type: file.mime });
          if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
          return {
            ...entry,
            status: "done",
            progress: 100,
            label: "Ready",
            resultBlob: blob,
            resultName: file.name,
            resultUrl: file.mime === "application/pdf" ? undefined : URL.createObjectURL(blob),
            width: file.width,
            height: file.height,
            before: file.beforeBytes,
            after: file.afterBytes,
            note: file.note,
            quality: file.quality,
            lossless: file.lossless,
            error: undefined,
          };
        }
        if (result.type === "too-large") {
          return { ...entry, status: "confirm", large: { width: result.width, height: result.height }, label: "Very large photo" };
        }
        if (result.type === "error") return { ...entry, status: "error", error: result.message, label: "Needs a look" };
        return { ...entry, status: "cancelled", label: "Stopped" };
      }));
    }));
  }, [tool.batch]);

  const runRef = useRef(run);
  runRef.current = run;
  const itemKey = items.map((item) => item.id).join("|");
  const signature = JSON.stringify({
    mode,
    batchOp,
    format: settings.format,
    quality: settings.quality,
    effort: settings.effort,
    stripExif: settings.stripExif,
    targetBytes: settings.targetBytes,
    resizeMode: settings.resizeMode,
    width: settings.width,
    height: settings.height,
    longEdge: settings.longEdge,
    percent: settings.percent,
    lockRatio: settings.lockRatio,
    allowUpscale: settings.allowUpscale,
    background: settings.background,
    avifSharp: settings.avifSharp,
  });
  const auto = !tool.batch && (mode === "compress" || mode === "target" || mode === "resize" || mode === "convert" || mode === "exif");

  useEffect(() => {
    if (!auto || itemsRef.current.length === 0) return;
    const timer = window.setTimeout(() => void runRef.current(), 360);
    return () => window.clearTimeout(timer);
  }, [auto, signature, itemKey]);

  useEffect(() => {
    if (mode !== "rotate") return;
    if (settings.turns === 0 && !settings.flipH && !settings.flipV) return;
    if (itemsRef.current.length === 0) return;
    const timer = window.setTimeout(() => void runRef.current(), 220);
    return () => window.clearTimeout(timer);
  }, [mode, settings.turns, settings.flipH, settings.flipV, itemKey]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      addFiles(files);
    };
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "Escape" && !typing) {
        clearAll();
      }
      if (event.key === "Enter" && !typing) {
        const current = itemsRef.current.find((item) => item.id === selectedId) ?? itemsRef.current[0];
        if (current?.resultBlob && current.resultName) {
          event.preventDefault();
          downloadBlob(current.resultBlob, current.resultName);
        } else if (pdfBlob) {
          event.preventDefault();
          downloadBlob(pdfBlob, settingsRef.current.pdfName || "locapix.pdf");
        }
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [addFiles, clearAll, pdfBlob, selectedId]);

  const doneCount = items.filter((item) => item.resultBlob).length;
  const showDock = Boolean(selected?.resultBlob || pdfBlob || working || (tool.batch && items.length > 0));

  const presetActive = useMemo(() => settings.targetBytes, [settings.targetBytes]);

  function chooseChip(bytes: number) {
    setSettings((current) => ({ ...current, targetBytes: bytes }));
    if (tool.kind === "compress") setMode("target");
    if (tool.kind === "target") setMode("target");
  }

  async function downloadZip() {
    const entries: Record<string, Uint8Array> = {};
    for (const item of items) {
      if (!item.resultBlob || !item.resultName) continue;
      let name = item.resultName;
      if (entries[name]) name = name.replace(/(\.[^.]+)?$/, `-2$1`);
      entries[name] = new Uint8Array(await item.resultBlob.arrayBuffer());
    }
    if (Object.keys(entries).length === 0) return;
    const zipped = zipSync(entries, { level: 0 });
    downloadBlob(new Blob([zipped]), "locapix.zip");
  }

  const primary = () => {
    if (working) {
      gen.current += 1;
      getPool().cancelAll();
      setItems((current) => current.map((item) => item.status === "working" ? { ...item, status: "cancelled", label: "Stopped" } : item));
      return;
    }
    if (pdfBlob) {
      downloadBlob(pdfBlob, settings.pdfName || "locapix.pdf");
      return;
    }
    if (selected?.resultBlob && selected.resultName) downloadBlob(selected.resultBlob, selected.resultName);
    else if (tool.batch || mode === "crop" || mode === "pdf" || mode === "rotate") void run();
  };

  return (
    <div className={showDock ? "workspace has-dock" : "workspace"}>
      <div className="glass">
        {banner ? <p className="alert" role="alert">{banner}</p> : null}
        {items.length === 0 ? (
          <div
            className={over ? "dropzone is-over" : "dropzone"}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              addFiles([...event.dataTransfer.files]);
            }}
          >
            <div className="drop-icon"><Upload aria-hidden="true" /></div>
            <p className="drop-title">Drop your photos right here</p>
            <p className="drop-sub">Or choose them from your camera roll. Processing happens on this device.</p>
            <div className="drop-actions">
              <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Choose photos</button>
              {narrow ? <button className="btn secondary" type="button" onClick={() => cameraRef.current?.click()}><Camera size={16} /> Take a photo</button> : null}
            </div>
            <p className="hint">JPEG, PNG, WebP, AVIF, HEIC, BMP, and still GIF. Photos over about 8192px on a side may be slow. Paste with Ctrl or Cmd + V.</p>
          </div>
        ) : (
          <div className="work-grid">
            <div className="panel">
              {items.length > 1 ? (
                <div className="film" aria-label="Photos in this set">
                  {items.map((item) => (
                    <button key={item.id} type="button" aria-pressed={item.id === selected?.id} onClick={() => setSelectedId(item.id)}>
                      <img src={item.url} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
              {mode === "crop" && selected ? (
                <Cropper
                  src={selected.url}
                  crop={settings.crop}
                  aspect={aspect}
                  natural={natural}
                  onNatural={(size) => {
                    setNatural(size);
                    setSettings((current) => current.crop ? current : { ...current, crop: { x: 0, y: 0, width: size.width, height: size.height } });
                  }}
                  onChange={(crop) => setSettings((current) => ({ ...current, crop }))}
                />
              ) : selected ? (
                <Compare before={selected.url} after={selected.resultUrl} />
              ) : null}
              {selected?.status === "working" ? (
                <div>
                  <div className="bar" aria-hidden="true"><span style={{ width: `${selected.progress}%` }} /></div>
                  <p className="hint" role="status">{selected.label}</p>
                </div>
              ) : null}
              {selected?.status === "error" ? <p className="alert" role="alert">{selected.error}</p> : null}
              {selected?.status === "confirm" && selected.large ? (
                <div className="alert" role="alert">
                  <p>This photo is {selected.large.width}×{selected.large.height}. It may be slow, or the tab may run out of memory.</p>
                  <div className="actions">
                    <button className="btn" type="button" onClick={() => void run(selected.id, true)}>Continue anyway</button>
                    <button className="btn secondary" type="button" onClick={() => setItems((current) => current.filter((item) => item.id !== selected.id))}>Remove it</button>
                  </div>
                </div>
              ) : null}
              {selected?.note ? <p className="note">{selected.note}</p> : null}
              {pdfNote ? <p className="note">{pdfNote}</p> : null}
              {selected && (selected.before || selected.after) ? (
                <div className="stats">
                  <span className="stat">{formatBytes(selected.before ?? selected.file.size)} → {formatBytes(selected.after ?? 0)}</span>
                  {selected.before && selected.after ? (
                    <span className="stat">
                      {selected.after <= selected.before
                        ? `${savedPercent(selected.before, selected.after)}% smaller`
                        : `${Math.round((selected.after / selected.before - 1) * 100)}% larger`}
                    </span>
                  ) : null}
                  {selected.width ? <span className="stat">{selected.width}×{selected.height}</span> : null}
                  {selected.quality ? <span className="stat">Quality {selected.quality}</span> : null}
                  {selected.lossless ? <span className="stat">Pixels kept</span> : null}
                </div>
              ) : null}
            </div>
            <div className="panel">
              <Controls
                tool={tool}
                mode={mode}
                batchOp={batchOp}
                settings={settings}
                setSettings={setSettings}
                setMode={setMode}
                setBatchOp={setBatchOp}
                aspect={aspect}
                setAspect={(value) => {
                  setAspect(value);
                  if (value && natural) setSettings((current) => ({ ...current, crop: fitAspect(natural.width, natural.height, value) }));
                }}
                selected={selected}
              />
              <div className="actions">
                {mode === "crop" ? <button className="btn" type="button" onClick={() => void run(selected?.id)}>Preview crop</button> : null}
                {mode === "pdf" ? <button className="btn" type="button" onClick={() => void run()}>Create PDF</button> : null}
                {tool.batch ? <button className="btn" type="button" onClick={() => void run()}>Process photos</button> : null}
                {selected?.resultBlob && selected.resultName ? (
                  <button className="btn" type="button" onClick={() => downloadBlob(selected.resultBlob!, selected.resultName!)}>Download</button>
                ) : null}
                {pdfBlob ? <button className="btn" type="button" onClick={() => downloadBlob(pdfBlob, settings.pdfName || "locapix.pdf")}>Download PDF</button> : null}
                {doneCount > 1 ? <button className="btn secondary" type="button" onClick={() => void downloadZip()}>Download ZIP</button> : null}
                {working ? <button className="btn secondary" type="button" onClick={primary}>Cancel</button> : null}
                <button className="btn ghost" type="button" onClick={() => fileRef.current?.click()}>Add more</button>
                <button className="btn ghost" type="button" onClick={clearAll}>Clear</button>
              </div>
              {selected ? (
                <button className="btn ghost" type="button" onClick={() => downloadBlob(selected.file, selected.file.name)}>Download original</button>
              ) : null}
              {mode === "exif" && selected?.exif ? <ExifBlock exif={selected.exif} /> : null}
              {mode === "pdf" ? (
                <ol className="pdf-list">
                  {items.map((item, index) => (
                    <li key={item.id}>
                      <img src={item.url} alt="" />
                      <span>{item.file.name}</span>
                      <span>
                        <button className="mini" type="button" aria-label="Move up" onClick={() => setItems((current) => move(current, index, -1))}>↑</button>
                        <button className="mini" type="button" aria-label="Move down" onClick={() => setItems((current) => move(current, index, 1))}>↓</button>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {tool.batch ? (
                <ul className="batch-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <img src={item.url} alt="" />
                      <span>
                        <strong>{item.file.name}</strong>
                        <br />
                        <span className="hint">{item.label}{item.after ? ` · ${formatBytes(item.after)}` : ""}{item.error ? ` · ${item.error}` : ""}</span>
                      </span>
                      {item.status === "error" ? <button className="mini" type="button" onClick={() => void run(item.id)}>Retry</button> : <span />}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}
        {chipMode !== "off" ? (
          <div className="chip-row" aria-label="Common file sizes">
            {SIZE_PRESETS.map((preset) => chipMode === "route" ? (
              <Link
                key={preset.path}
                className={preset.bytes === tool.targetBytes ? "chip is-on" : "chip"}
                href={preset.path}
                aria-current={preset.bytes === tool.targetBytes ? "page" : undefined}
                onClick={() => stageFiles(itemsRef.current.map((item) => item.file))}
              >
                {preset.label}
              </Link>
            ) : (
              <button
                key={preset.label}
                className="chip"
                type="button"
                aria-pressed={mode === "target" && presetActive === preset.bytes}
                onClick={() => chooseChip(preset.bytes)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
        {hero && mode === "target" ? <p className="hint">Fitting under {formatBytes(settings.targetBytes)}. Pick another size, or clear the choice to compress by quality instead.</p> : null}
        {hero && mode === "target" ? (
          <button className="btn ghost" type="button" onClick={() => setMode("compress")}>Use a quality slider instead</button>
        ) : null}
        {!hero && tool.kind === "compress" ? <p className="hint">Need a hard limit? <Link href="/compress-to-size">Compress to a size you pick</Link>.</p> : null}
      </div>
      {showDock ? (
        <div className="dock">
          <p>{selected?.after ? formatBytes(selected.after) : working ? "Working" : "Ready"}</p>
          <button className="btn" type="button" onClick={primary}>
            {working ? "Cancel" : pdfBlob ? "Download PDF" : selected?.resultBlob ? "Download" : "Start"}
          </button>
        </div>
      ) : null}
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*,.heic,.heif,.avif,.bmp"
        multiple
        onChange={(event) => {
          addFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          addFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function move(items: Item[], index: number, direction: number) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(index, 1);
  if (!item) return items;
  copy.splice(next, 0, item);
  return copy;
}

function ExifBlock({ exif }: { exif: ExifView }) {
  if (exif.empty) return <p className="note">No camera, time, or location details were found in this file.</p>;
  return (
    <ul className="exif-list">
      {exif.camera ? <li><span>Camera</span><strong>{exif.camera}</strong></li> : null}
      {exif.when ? <li><span>Taken</span><strong>{exif.when}</strong></li> : null}
      {exif.where ? <li><span>Location</span><strong>{exif.where}</strong></li> : null}
    </ul>
  );
}

function Controls({
  tool,
  mode,
  batchOp,
  settings,
  setSettings,
  setMode,
  setBatchOp,
  aspect,
  setAspect,
  selected,
}: {
  tool: Tool;
  mode: ToolKind;
  batchOp: ToolKind;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  setMode: (mode: ToolKind) => void;
  setBatchOp: (mode: ToolKind) => void;
  aspect: number | null;
  setAspect: (aspect: number | null) => void;
  selected: Item | null;
}) {
  const active = tool.batch ? batchOp : mode;
  const patch = (partial: Partial<Settings>) => setSettings((current) => ({ ...current, ...partial }));
  return (
    <div className="panel">
      {selected ? <p className="hint" style={{ margin: 0 }}>{selected.file.name}</p> : null}
      {tool.batch ? (
        <label className="field">
          Job
          <select value={batchOp} onChange={(event) => setBatchOp(event.target.value as ToolKind)}>
            <option value="compress">Compress</option>
            <option value="target">Fit a file size</option>
            <option value="resize">Resize</option>
            <option value="convert">Convert</option>
            <option value="exif">Strip EXIF</option>
          </select>
        </label>
      ) : null}
      {active === "rotate" ? (
        <div className="actions">
          <button className="btn secondary" type="button" onClick={() => patch({ turns: ((settings.turns + 270) % 360) as 0 | 90 | 180 | 270 })}>Turn left</button>
          <button className="btn secondary" type="button" onClick={() => patch({ turns: ((settings.turns + 90) % 360) as 0 | 90 | 180 | 270 })}>Turn right</button>
          <button className="btn ghost" type="button" onClick={() => patch({ flipH: !settings.flipH })}>Flip sideways</button>
          <button className="btn ghost" type="button" onClick={() => patch({ flipV: !settings.flipV })}>Flip upside down</button>
        </div>
      ) : null}
      {active === "crop" ? (
        <div className="chip-row">
          {aspects.map((item) => (
            <button key={item.label} className="chip" type="button" aria-pressed={aspect === item.value} onClick={() => setAspect(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {(active === "compress" || active === "convert" || active === "resize" || active === "crop") ? (
        <label className="field">
          Format
          <select value={settings.format} onChange={(event) => patch({ format: event.target.value as Settings["format"] })}>
            {active !== "convert" ? <option value="keep">Keep the original format</option> : null}
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
            <option value="png">PNG</option>
          </select>
        </label>
      ) : null}
      {active === "target" ? (
        <>
          <label className="field">
            Target size (KB)
            <input
              type="number"
              min={8}
              value={Math.round(settings.targetBytes / 1024)}
              onChange={(event) => patch({ targetBytes: Math.max(8, Number(event.target.value) || 8) * 1024 })}
            />
          </label>
          <label className="field">
            Format
            <select value={settings.format === "keep" ? "auto" : settings.format} onChange={(event) => patch({ format: event.target.value as Settings["format"] })}>
              <option value="auto">Auto</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
              <option value="png">PNG</option>
            </select>
          </label>
        </>
      ) : null}
      {active === "resize" ? (
        <>
          <label className="field">
            How to size it
            <select value={settings.resizeMode} onChange={(event) => patch({ resizeMode: event.target.value as Settings["resizeMode"] })}>
              <option value="long">Long side</option>
              <option value="width">Width</option>
              <option value="height">Height</option>
              <option value="percent">Percent</option>
            </select>
          </label>
          {settings.resizeMode === "long" ? (
            <label className="field">Long side (px)
              <input type="number" min={1} value={settings.longEdge} onChange={(event) => patch({ longEdge: Number(event.target.value) })} />
            </label>
          ) : null}
          {settings.resizeMode === "width" || settings.resizeMode === "height" ? (
            <div className="row-2">
              <label className="field">Width
                <input type="number" min={1} value={settings.width} onChange={(event) => patch({ width: Number(event.target.value) })} />
              </label>
              <label className="field">Height
                <input type="number" min={1} value={settings.height} onChange={(event) => patch({ height: Number(event.target.value) })} />
              </label>
            </div>
          ) : null}
          {settings.resizeMode === "percent" ? (
            <label className="field">Percent
              <input type="number" min={1} max={400} value={settings.percent} onChange={(event) => patch({ percent: Number(event.target.value) })} />
            </label>
          ) : null}
          <div className="chip-row">
            {[1920, 1280, 800].map((edge) => (
              <button key={edge} className="chip" type="button" onClick={() => patch({ resizeMode: "long", longEdge: edge })}>{edge}px</button>
            ))}
            <button className="chip" type="button" onClick={() => patch({ resizeMode: "percent", percent: 50 })}>50%</button>
          </div>
          <label className="check"><input type="checkbox" checked={settings.lockRatio} onChange={(event) => patch({ lockRatio: event.target.checked })} /> Keep the shape</label>
          <label className="check"><input type="checkbox" checked={settings.allowUpscale} onChange={(event) => patch({ allowUpscale: event.target.checked })} /> Allow enlarging (it will look softer)</label>
        </>
      ) : null}
      {(active === "compress" || active === "convert" || active === "resize" || active === "crop" || active === "rotate") && settings.format !== "png" ? (
        <label className="field">
          Quality, {settings.quality}
          <input type="range" min={40} max={95} value={settings.quality} aria-valuemin={40} aria-valuemax={95} aria-valuenow={settings.quality} onChange={(event) => patch({ quality: Number(event.target.value) })} />
        </label>
      ) : null}
      {active === "pdf" ? (
        <>
          <label className="field">
            Pages
            <select value={settings.pdfMode} onChange={(event) => patch({ pdfMode: event.target.value as Settings["pdfMode"] })}>
              <option value="fit">One photo, its own size</option>
              <option value="a4">Fit on A4</option>
              <option value="letter">Fit on Letter</option>
            </select>
          </label>
          <label className="field">Margin
            <input type="number" min={0} max={120} value={settings.pdfMargin} onChange={(event) => patch({ pdfMargin: Number(event.target.value) })} />
          </label>
          <label className="field">File name
            <input type="text" value={settings.pdfName} onChange={(event) => patch({ pdfName: event.target.value })} />
          </label>
        </>
      ) : null}
      <details>
        <summary>More options</summary>
        <div className="panel" style={{ marginTop: 10 }}>
          {active !== "exif" && active !== "pdf" ? (
            <label className="check"><input type="checkbox" checked={settings.stripExif} onChange={(event) => patch({ stripExif: event.target.checked })} /> Remove location and camera details</label>
          ) : null}
          <label className="check"><input type="checkbox" checked={settings.effort} onChange={(event) => patch({ effort: event.target.checked })} /> Take a bit longer for a cleaner file</label>
          <label className="check"><input type="checkbox" checked={settings.avifSharp} onChange={(event) => patch({ avifSharp: event.target.checked })} /> Sharper text for AVIF (4:4:4)</label>
          <label className="field">Background, if a JPEG needs one
            <input type="color" value={settings.background} aria-label="Background color" onChange={(event) => patch({ background: event.target.value })} />
          </label>
          {tool.batch ? null : <button className="btn ghost" type="button" onClick={() => setMode(tool.kind)}>Reset this tool</button>}
        </div>
      </details>
    </div>
  );
}
