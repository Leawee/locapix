import type { Metadata } from "next";
import { ToolScreen } from "@/components/tool-screen";
import { toolMetadata } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("png-to-webp");

export const metadata: Metadata = toolMetadata(tool);

export default function Page() {
  return <ToolScreen tool={tool} />;
}
