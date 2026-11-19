import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = new URL(`../${specifier.slice(2)}`, import.meta.url);
    const file = fileURLToPath(base);
    const suffixed = existsSync(`${file}.ts`)
      ? `${base.href}.ts`
      : existsSync(`${file}.tsx`)
        ? `${base.href}.tsx`
        : base.href;
    return nextResolve(suffixed, context);
  }
  return nextResolve(specifier, context);
}
