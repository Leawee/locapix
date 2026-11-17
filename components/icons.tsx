import {
  Aperture,
  BadgeCheck,
  Crop,
  FileText,
  Layers,
  Lock,
  Minimize2,
  RefreshCw,
  RotateCw,
  Scaling,
  ShieldOff,
  Target,
  WifiOff,
  Zap,
} from "lucide-react";
import type { ToolIcon } from "@/lib/tools";

export function Mark({ size = 22 }: { size?: number }) {
  return <Aperture size={size} color="white" strokeWidth={1.8} aria-hidden="true" />;
}

export function Glyph({ name, color = "currentColor", size = 22 }: { name: ToolIcon; color?: string; size?: number }) {
  const props = { size, color, strokeWidth: 1.8, "aria-hidden": true as const };
  if (name === "compress") return <Minimize2 {...props} />;
  if (name === "target") return <Target {...props} />;
  if (name === "resize") return <Scaling {...props} />;
  if (name === "convert") return <RefreshCw {...props} />;
  if (name === "exif") return <ShieldOff {...props} />;
  if (name === "crop") return <Crop {...props} />;
  if (name === "rotate") return <RotateCw {...props} />;
  if (name === "pdf") return <FileText {...props} />;
  return <Layers {...props} />;
}

export function TrustIcons() {
  const props = { size: 22, color: "#E0692E", strokeWidth: 1.8, "aria-hidden": true as const };
  return (
    <div className="trust">
      <span><Lock {...props} /> On this device</span>
      <span><BadgeCheck {...props} /> Professional encoders</span>
      <span><WifiOff {...props} /> Offline after this load</span>
      <span><Zap {...props} /> No account</span>
    </div>
  );
}
