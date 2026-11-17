import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { tools } from "@/lib/tools";

const extras = ["/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = [
    { path: "/", priority: 1 },
    ...tools.map((tool) => ({ path: tool.path, priority: tool.showInGrid ? 0.8 : 0.6 })),
    ...extras.map((path) => ({ path, priority: 0.3 })),
  ];
  return pages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: "monthly",
    priority: page.priority,
  }));
}
