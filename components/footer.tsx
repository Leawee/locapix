import Link from "next/link";

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
      <div className="wrap">
        <p className="fine">© {new Date().getFullYear()} locapix. No account. No upload.</p>
      </div>
    </footer>
  );
}
