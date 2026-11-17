"use client";

import dynamic from "next/dynamic";
import { WorkspaceFallback } from "@/components/workspace-fallback";
import type { Tool } from "@/lib/tools";

const Workspace = dynamic(() => import("@/components/workspace").then((mod) => mod.Workspace), {
  ssr: false,
  loading: () => <WorkspaceFallback />,
});

export function WorkspaceClient({
  tool,
  chips,
  hero = false,
}: {
  tool: Tool;
  chips?: Tool["chips"];
  hero?: boolean;
}) {
  return <Workspace tool={tool} chips={chips} hero={hero} />;
}
