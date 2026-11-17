import { HomeSections } from "@/components/home-sections";
import { TrustIcons } from "@/components/icons";
import { WorkspaceClient } from "@/components/workspace-client";
import { getTool } from "@/lib/tools";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "locapix",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: "Compress, resize, convert, and clean photos in your browser. Photos never leave your device.",
  url: "https://locapix.app",
};

export default function HomePage() {
  const tool = getTool("compress");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <section className="hero">
        <div className="blobs" aria-hidden="true">
          <div className="blob blob-pink" />
          <div className="blob blob-blue" />
          <div className="blob blob-yellow" />
        </div>
        <div className="wrap hero-copy">
          <p className="kicker">On your device</p>
          <h1>Your photos stay yours.</h1>
          <p className="lede">Shrink them, resize them, or change the format right here. Nothing is uploaded, and you don&apos;t need an account.</p>
        </div>
        <div className="wrap">
          <WorkspaceClient tool={tool} chips="local" hero />
        </div>
        <div className="wrap">
          <TrustIcons />
        </div>
      </section>
      <HomeSections />
    </>
  );
}
