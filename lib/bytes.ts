export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

export function savedPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}

export function stem(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return base || "photo";
}

export function safeFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\- ()[\]]+/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 140) || "photo";
}

export function sizeSlug(bytes: number): string {
  if (bytes % (1024 * 1024) === 0 && bytes >= 1024 * 1024) {
    return `${bytes / (1024 * 1024)}mb`;
  }
  if (bytes % 1024 === 0) return `${Math.round(bytes / 1024)}kb`;
  return `${Math.round(bytes)}b`;
}

export const SIZE_PRESETS: { label: string; bytes: number; path: string }[] = [
  { label: "50KB", bytes: 50 * 1024, path: "/compress-to-50kb" },
  { label: "100KB", bytes: 100 * 1024, path: "/compress-to-100kb" },
  { label: "200KB", bytes: 200 * 1024, path: "/compress-to-200kb" },
  { label: "500KB", bytes: 500 * 1024, path: "/compress-to-500kb" },
  { label: "1MB", bytes: 1024 * 1024, path: "/compress-to-1mb" },
  { label: "2MB", bytes: 2 * 1024 * 1024, path: "/compress-to-2mb" },
  { label: "8MB", bytes: 8 * 1024 * 1024, path: "/compress-to-8mb" },
];
