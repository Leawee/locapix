"use client";

import Link from "next/link";
import { stageOpenFiles } from "@/lib/inbox";
import type { ToolLink } from "@/lib/tools";

export function PresetLinks({
  label,
  currentPath,
  links,
}: {
  label: string;
  currentPath: string;
  links: ToolLink[];
}) {
  return (
    <nav className="chip-row" aria-label={label}>
      {links.map((link) => {
        const here = link.href === currentPath;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={here ? "chip is-on" : "chip"}
            aria-current={here ? "page" : undefined}
            onClick={() => stageOpenFiles()}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
