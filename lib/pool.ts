import type { Settings, ToolKind } from "@/lib/process/types";

export type PoolFile = {
  name: string;
  mime: string;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  beforeBytes: number;
  afterBytes: number;
  quality?: number;
  lossless: boolean;
  resized: boolean;
  note: string;
};

export type PoolResult =
  | { type: "done"; files: PoolFile[]; note: string }
  | { type: "too-large"; width: number; height: number }
  | { type: "cancelled" }
  | { type: "error"; message: string };

type Request = {
  kind: "run";
  jobId: string;
  op: ToolKind;
  settings: Settings;
  files: { name: string; type: string; buffer: ArrayBuffer }[];
};

type WorkerEvent = {
  kind: "progress" | "done" | "error" | "too-large" | "cancelled";
  jobId: string;
  value?: number;
  label?: string;
  files?: PoolFile[];
  note?: string;
  message?: string;
  width?: number;
  height?: number;
};

type Task = {
  jobId: string;
  request: Request;
  transfer: Transferable[];
  onProgress?: (value: number, label: string) => void;
  resolve: (result: PoolResult) => void;
};

function workerCount(): number {
  if (typeof navigator === "undefined") return 1;
  const cores = navigator.hardwareConcurrency || 2;
  const narrow = window.matchMedia("(max-width: 800px)").matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (narrow || (memory !== undefined && memory < 4)) return 1;
  return Math.max(1, Math.min(3, cores - 1));
}

class Pool {
  private slots: { worker: Worker; busy: boolean; jobId: string | null }[] = [];
  private queue: Task[] = [];
  private tasks = new Map<string, Task>();

  private spawn() {
    const worker = new Worker(new URL("../workers/process.worker.ts", import.meta.url));
    const slot = { worker, busy: false, jobId: null as string | null };
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const data = event.data;
      const task = this.tasks.get(data.jobId);
      if (!task) return;
      if (data.kind === "progress") {
        task.onProgress?.(data.value ?? 0, data.label ?? "");
        return;
      }
      this.tasks.delete(data.jobId);
      slot.busy = false;
      slot.jobId = null;
      if (data.kind === "done") task.resolve({ type: "done", files: data.files ?? [], note: data.note ?? "" });
      else if (data.kind === "too-large") task.resolve({ type: "too-large", width: data.width ?? 0, height: data.height ?? 0 });
      else if (data.kind === "cancelled") task.resolve({ type: "cancelled" });
      else task.resolve({ type: "error", message: data.message || "Something went wrong while processing this photo." });
      this.pump();
    };
    worker.onerror = () => {
      const jobId = slot.jobId;
      slot.busy = false;
      slot.jobId = null;
      if (jobId) {
        const task = this.tasks.get(jobId);
        this.tasks.delete(jobId);
        task?.resolve({
          type: "error",
          message: "This photo is too large for the memory this browser can spare. Try a smaller copy, or close other tabs and try again.",
        });
      }
      this.slots = this.slots.filter((item) => item !== slot);
      this.pump();
    };
    this.slots.push(slot);
    return slot;
  }

  private pump() {
    const limit = workerCount();
    while (this.slots.filter((slot) => slot.busy).length < limit && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task || !this.tasks.has(task.jobId)) continue;
      const slot = this.slots.find((item) => !item.busy) ?? (this.slots.length < limit ? this.spawn() : null);
      if (!slot) {
        this.queue.unshift(task);
        return;
      }
      slot.busy = true;
      slot.jobId = task.jobId;
      slot.worker.postMessage(task.request, task.transfer);
    }
  }

  run(
    jobId: string,
    op: ToolKind,
    settings: Settings,
    files: { name: string; type: string; buffer: ArrayBuffer }[],
    onProgress?: (value: number, label: string) => void,
  ): Promise<PoolResult> {
    return new Promise((resolve) => {
      const task: Task = {
        jobId,
        request: { kind: "run", jobId, op, settings, files },
        transfer: files.map((file) => file.buffer),
        onProgress,
        resolve,
      };
      this.tasks.set(jobId, task);
      this.queue.push(task);
      this.pump();
    });
  }

  cancelAll() {
    for (const task of this.queue) {
      this.tasks.delete(task.jobId);
      task.resolve({ type: "cancelled" });
    }
    this.queue = [];
    for (const slot of this.slots) {
      if (slot.jobId) slot.worker.postMessage({ kind: "cancel", jobId: slot.jobId });
    }
  }
}

let pool: Pool | null = null;

export function getPool(): Pool {
  pool ??= new Pool();
  return pool;
}
