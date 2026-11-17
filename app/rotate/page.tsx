import type { Metadata } from "next";
import { ToolScreen } from "@/components/tool-screen";
import { getTool } from "@/lib/tools";

const tool = getTool("rotate");

export const metadata: Metadata = {
  title: tool.metaTitle,
  description: tool.description,
  alternates: { canonical: tool.path },
};

export default function Page() {
  return <ToolScreen tool={tool} />;
}
