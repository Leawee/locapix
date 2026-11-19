import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function NotFound() {
  return (
    <section className="section wrap">
      <p className="kicker">Missing page</p>
      <h1>That page isn&apos;t here.</h1>
      <p className="lede" style={{ marginLeft: 0 }}>The photo tools are still on the home page. Nothing was uploaded.</p>
      <Link className="btn" href="/">Back home</Link>
    </section>
  );
}
