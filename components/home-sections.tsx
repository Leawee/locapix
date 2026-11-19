import Link from "next/link";
import { Glyph } from "@/components/icons";
import { gridTools } from "@/lib/tools";

export const homeFaqs = [
  {
    q: "Do you upload my photo?",
    a: "No. The photo is decoded and encoded in your browser. It is not sent to a locapix server.",
  },
  {
    q: "Do I need an account?",
    a: "No. Open the page and use it. There is nothing to sign up for.",
  },
  {
    q: "Will it work offline?",
    a: "After the page and the encoder for that format have loaded once, you can keep working without a connection.",
  },
];

const palette = [
  { card: "#FFF6EC", bubble: "#FFE0C7", stroke: "#E0692E" },
  { card: "#F0F5FF", bubble: "#D8E6FF", stroke: "#5B7BD5" },
  { card: "#F2FBF3", bubble: "#D9F0DC", stroke: "#4C9A5B" },
  { card: "#FBF2FB", bubble: "#F0DAF1", stroke: "#A45FA8" },
];

const steps = [
  { n: "1", title: "Drop a photo", body: "From your files, your camera, or a paste.", color: "#FF8C42" },
  { n: "2", title: "Adjust it", body: "Pick a size, a format, or a limit like 200 KB.", color: "#5B7BD5" },
  { n: "3", title: "Download", body: "You get the file. We never did.", color: "#4C9A5B" },
];

export function HomeSections() {
  return (
    <>
      <section className="section wrap" id="tools">
        <p className="kicker">The tools</p>
        <h2>Pick what you need</h2>
        <p className="sub">Eight tools, all local. Open one and the photo stays here.</p>
        <div className="tool-grid">
          {gridTools.map((tool, index) => {
            const color = palette[index % palette.length]!;
            return (
              <Link key={tool.id} href={tool.path} className="tool-card" style={{ background: color.card }}>
                <span className="icon-bubble" style={{ background: color.bubble }}>
                  <Glyph name={tool.icon} color={color.stroke} />
                </span>
                <h3>{tool.title.replace(" a photo", "").replace(" a size you pick", " size")}</h3>
                <p>{tool.card}</p>
              </Link>
            );
          })}
        </div>
        <p className="more-link">
          <Link href="/compress-to-200kb">Compress to 200KB</Link>
          {" · "}
          <Link href="/heic-to-jpg">HEIC to JPG</Link>
          {" · "}
          <Link href="/png-to-jpg">PNG to JPG</Link>
          {" · "}
          <Link href="/jpg-to-webp">JPG to WebP</Link>
          {" · "}
          <Link href="/compress-to-1mb">Compress to 1MB</Link>
        </p>
        <p className="more-link"><Link href="/batch">Have a pile of photos? Process them as a batch.</Link></p>
      </section>
      <section className="section wrap" id="how">
        <p className="kicker">How it works</p>
        <h2>Three little steps.</h2>
        <p className="sub">Nothing to install, and nothing to upload.</p>
        <div className="steps">
          {steps.map((step) => (
            <article key={step.n} className="step">
              <span className="step-badge" style={{ background: step.color }}>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
        <div className="faq">
          {homeFaqs.map((faq) => (
            <details key={faq.q}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
