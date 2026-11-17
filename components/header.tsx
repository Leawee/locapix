"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Mark } from "@/components/icons";

const primary = [
  { href: "/compress", label: "Compress" },
  { href: "/compress-to-size", label: "Target size" },
  { href: "/resize", label: "Resize" },
  { href: "/convert", label: "Convert" },
];

const more = [
  { href: "/remove-exif", label: "Strip EXIF" },
  { href: "/crop", label: "Crop" },
  { href: "/rotate", label: "Rotate" },
  { href: "/image-to-pdf", label: "To PDF" },
  { href: "/batch", label: "Batch" },
  { href: "/privacy", label: "Privacy" },
];

function current(pathname: string, href: string) {
  return pathname === href ? "page" : undefined;
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setLangOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <a className="skip" href="#content">Skip to the tool</a>
      <div className="wrap header-inner">
        <Link className="brand" href="/">
          <span className="logo-mark"><Mark /></span>
          locapix
        </Link>
        <nav className="nav-links" aria-label="Tools">
          {primary.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current(pathname, item.href)}>{item.label}</Link>
          ))}
          <div className="lang">
            <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>More</button>
            {moreOpen ? (
              <div className="lang-menu">
                {more.map((item) => (
                  <Link key={item.href} href={item.href} aria-current={current(pathname, item.href)}>{item.label}</Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <div className="header-actions">
          <div className="lang">
            <button type="button" aria-expanded={langOpen} aria-label="Language" onClick={() => setLangOpen((value) => !value)}>EN</button>
            {langOpen ? (
              <div className="lang-menu" role="menu">
                <button type="button" className="chip is-on" aria-pressed="true">English</button>
                <p>locapix is in English for now.</p>
              </div>
            ) : null}
          </div>
          <button className="icon-btn nav-toggle" type="button" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link className="btn header-cta" href="/compress">Get started</Link>
        </div>
      </div>
      <div className="menu-panel" hidden={!open}>
        {[...primary, ...more].map((item) => (
          <Link key={item.href} href={item.href} aria-current={current(pathname, item.href)}>{item.label}</Link>
        ))}
        <Link className="btn" href="/compress">Get started</Link>
      </div>
    </header>
  );
}
