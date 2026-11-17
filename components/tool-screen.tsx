import { WorkspaceClient } from "@/components/workspace-client";
import type { Tool } from "@/lib/tools";

export function ToolScreen({ tool }: { tool: Tool }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `locapix ${tool.title}`,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: tool.description,
        url: `https://locapix.app${tool.path}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: tool.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="page-head wrap">
        <p className="kicker">On your device</p>
        <h1>{tool.title}</h1>
        <p className="lede" style={{ marginLeft: 0 }}>{tool.lede}</p>
      </header>
      <div className="wrap">
        <WorkspaceClient tool={tool} />
      </div>
      <section className="section wrap story">
        {tool.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="faq">
          {tool.faqs.map((faq) => (
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
