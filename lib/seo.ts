import type { Metadata } from "next";
import type { Tool } from "@/lib/tools";

export const siteUrl = "https://locapix.app";

export function absoluteUrl(path: string): string {
  if (path === "/") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "locapix — Your photos stay yours",
};

export function pageMetadata(input: { title: string; description: string; path: string }): Metadata {
  const url = absoluteUrl(input.path);
  const socialTitle = input.title.includes("locapix") ? input.title : `${input.title} · locapix`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description: input.description,
      url,
      siteName: "locapix",
      type: "website",
      locale: "en_US",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: input.description,
      images: [shareImage.url],
    },
  };
}

export function toolMetadata(tool: Tool): Metadata {
  return pageMetadata({ title: tool.metaTitle, description: tool.description, path: tool.path });
}
