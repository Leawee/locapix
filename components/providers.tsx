"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { stageFiles } from "@/lib/inbox";

type DropHandler = (files: File[]) => void;

const DropContext = createContext<{
  register: (handler: DropHandler) => () => void;
} | null>(null);

export function useRegisterDrop(handler: DropHandler) {
  const context = useContext(DropContext);
  useEffect(() => {
    if (!context) return;
    return context.register(handler);
  }, [context, handler]);
}

function fileList(data: DataTransfer | null): File[] {
  if (!data) return [];
  return [...data.files].filter((file) => file.type.startsWith("image/") || /\.(heic|heif|avif|jpe?g|png|webp|gif|bmp)$/i.test(file.name));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const handler = useRef<DropHandler | null>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const register = useCallback((next: DropHandler) => {
    handler.current = next;
    return () => {
      if (handler.current === next) handler.current = null;
    };
  }, []);

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      depth.current += 1;
      setOver(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
    };
    const onDragLeave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      depth.current = 0;
      setOver(false);
      const files = fileList(event.dataTransfer);
      if (files.length === 0) return;
      if (handler.current) handler.current(files);
      else {
        stageFiles(files);
        router.push("/compress");
      }
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [router]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return (
    <DropContext.Provider value={{ register }}>
      {children}
      {over ? (
        <div className="drag-veil" role="status">
          <div>
            Drop your photos right here
            <p className="drop-sub">They stay on this device.</p>
          </div>
        </div>
      ) : null}
    </DropContext.Provider>
  );
}
