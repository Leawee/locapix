import type { Metadata } from "next";
import { ToolScreen } from "@/components/tool-screen";
import { toolMetadata } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("compress-to-50kb");

export const metadata: Metadata = toolMetadata(tool);

export default function Page() {
  return <ToolScreen tool={tool} />;
}
