import type { MetadataRoute } from "next";
import { toolPaths } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...toolPaths(), "/privacy", "/terms"];
  return paths.map((path) => ({
    url: `https://locapix.app${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
