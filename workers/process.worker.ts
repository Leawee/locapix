import { friendlyError, processJob } from "@/lib/process/engine";
import { CancelledError, TooLargeError, UserError, type Settings, type ToolKind } from "@/lib/process/types";

type RunRequest = {
  kind: "run";
  jobId: string;
  op: ToolKind;
  settings: Settings;
  files: { name: string; type: string; buffer: ArrayBuffer }[];
};

type CancelRequest = { kind: "cancel"; jobId: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<RunRequest | CancelRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

const cancelled = new Set<string>();

scope.onmessage = (event) => {
  const message = event.data;
  if (message.kind === "cancel") {
    cancelled.add(message.jobId);
    return;
  }
  void run(message);
};

async function run(message: RunRequest) {
  const { jobId } = message;
  try {
    const result = await processJob(
      message.op,
      message.settings,
      message.files.map((file) => ({
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(file.buffer),
      })),
      {
        progress: (value, label) => {
          scope.postMessage({ kind: "progress", jobId, value, label });
        },
        cancelled: () => cancelled.has(jobId),
      },
    );
    if (cancelled.has(jobId)) {
      cancelled.delete(jobId);
      scope.postMessage({ kind: "cancelled", jobId });
      return;
    }
    const files = result.files.map((file) => ({
      name: file.name,
      mime: file.mime,
      buffer: file.bytes.buffer,
      width: file.width,
      height: file.height,
      beforeBytes: file.beforeBytes,
      afterBytes: file.afterBytes,
      quality: file.quality,
      lossless: file.lossless,
      resized: file.resized,
      note: file.note,
    }));
    scope.postMessage(
      { kind: "done", jobId, files, note: result.note },
      files.map((file) => file.buffer),
    );
  } catch (error) {
    cancelled.delete(jobId);
    if (error instanceof CancelledError) {
      scope.postMessage({ kind: "cancelled", jobId });
      return;
    }
    if (error instanceof TooLargeError) {
      scope.postMessage({ kind: "too-large", jobId, width: error.width, height: error.height });
      return;
    }
    if (!(error instanceof UserError)) console.error(error);
    scope.postMessage({ kind: "error", jobId, message: friendlyError(error) });
  }
}
