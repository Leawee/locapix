import { absoluteUrl } from "@/lib/seo";
import { tools } from "@/lib/tools";

export function llmsText(): string {
  const lines = [
    "# locapix",
    "",
    "locapix (https://locapix.app) is a set of photo tools that run in the browser. Photos are decoded and encoded on the device. They are not uploaded to a locapix server. There is no account.",
    "",
    "Encoders: MozJPEG for JPEG, OxiPNG for PNG, libwebp for WebP, and libavif for AVIF. HEIC and HEIF are decoded with libheif. JPEG rotation and JPEG metadata removal use libjpeg and stay lossless when the file allows it.",
    "",
    "English-language site. Image processing stays in the browser.",
    "",
    "## Tools",
    "",
    ...tools.map((tool) => `- ${absoluteUrl(tool.path)}: ${tool.title}. ${tool.description}`),
    `- ${absoluteUrl("/privacy")}: Privacy. Photos are not uploaded, and there is no account.`,
    `- ${absoluteUrl("/terms")}: Terms.`,
    "",
    "There is no upload API. /heic-to-jpeg redirects to /heic-to-jpg.",
    "",
  ];
  return lines.join("\n");
}
