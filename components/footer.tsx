import Link from "next/link";
import { tools } from "@/lib/tools";

const links = [
  ["/", "Home"],
  ["/compress", "Compress"],
  ["/compress-to-size", "Target size"],
  ["/resize", "Resize"],
  ["/convert", "Convert"],
  ["/remove-exif", "Strip EXIF"],
  ["/crop", "Crop"],
  ["/rotate", "Rotate"],
  ["/image-to-pdf", "To PDF"],
  ["/batch", "Batch"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
] as const;

const linked = new Set<string>(links.map(([href]) => href));
const more = tools.filter((tool) => !linked.has(tool.path));

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <strong>locapix</strong>
          <p className="fine">Photos are processed in your browser and are not uploaded.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
      </div>
      <div className="wrap footer-more">
        <p className="fine">Sizes and formats</p>
        <nav className="footer-links" aria-label="Sizes and formats">
          {more.map((tool) => (
            <Link key={tool.path} href={tool.path}>{tool.title}</Link>
          ))}
        </nav>
      </div>
      <div className="wrap">
        <p className="fine">© {new Date().getFullYear()} locapix. No account. No upload.</p>
      </div>
    </footer>
  );
}
