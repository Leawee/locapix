import Link from "next/link";
import { WorkspaceClient } from "@/components/workspace-client";
import { absoluteUrl } from "@/lib/seo";
import { tools, type Tool } from "@/lib/tools";

export function ToolScreen({ tool }: { tool: Tool }) {
  const url = absoluteUrl(tool.path);
  const related = tools.filter((item) => item.showInGrid && item.path !== tool.path).slice(0, 4);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: tool.metaTitle,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: tool.description,
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: tool.title, item: url },
        ],
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
        <h2>Other tools</h2>
        <p>
          {related.map((item, index) => (
            <span key={item.path}>
              {index > 0 ? " · " : null}
              <Link href={item.path}>{item.title}</Link>
            </span>
          ))}
        </p>
      </section>
    </>
  );
}
