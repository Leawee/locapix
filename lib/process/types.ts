export type ToolKind = "compress" | "target" | "resize" | "convert" | "exif" | "crop" | "rotate" | "pdf";

export type OutputFormat = "keep" | "auto" | "jpeg" | "webp" | "avif" | "png";

export type ResizeMode = "width" | "height" | "long" | "percent";

export type Settings = {
  format: OutputFormat;
  quality: number;
  effort: boolean;
  stripExif: boolean;
  targetBytes: number;
  resizeMode: ResizeMode;
  width: number;
  height: number;
  longEdge: number;
  percent: number;
  lockRatio: boolean;
  allowUpscale: boolean;
  crop: { x: number; y: number; width: number; height: number } | null;
  turns: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  background: string;
  avifSharp: boolean;
  allowLarge: boolean;
  pdfMode: "fit" | "a4" | "letter";
  pdfMargin: number;
  pdfName: string;
};

export type SourceFile = {
  name: string;
  type: string;
  bytes: Uint8Array;
};

export type OutputFile = {
  name: string;
  mime: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  beforeBytes: number;
  afterBytes: number;
  quality?: number;
  lossless: boolean;
  resized: boolean;
  note: string;
};

export type JobResult = {
  files: OutputFile[];
  note: string;
};

export const defaultSettings = (): Settings => ({
  format: "keep",
  quality: 80,
  effort: true,
  stripExif: true,
  targetBytes: 200 * 1024,
  resizeMode: "long",
  width: 1600,
  height: 1600,
  longEdge: 1920,
  percent: 50,
  lockRatio: true,
  allowUpscale: false,
  crop: null,
  turns: 0,
  flipH: false,
  flipV: false,
  background: "#ffffff",
  avifSharp: false,
  allowLarge: false,
  pdfMode: "fit",
  pdfMargin: 36,
  pdfName: "locapix.pdf",
});

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class TooLargeError extends Error {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    super("too-large");
    this.name = "TooLargeError";
    this.width = width;
    this.height = height;
  }
}

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "CancelledError";
  }
}
