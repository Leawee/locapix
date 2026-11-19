import Link from "next/link";
import { PresetLinks } from "@/components/preset-links";
import { WorkspaceClient } from "@/components/workspace-client";
import { SIZE_PRESETS } from "@/lib/bytes";
import { absoluteUrl } from "@/lib/seo";
import { formatLinks, tools, type Tool } from "@/lib/tools";

const sizeLinks = SIZE_PRESETS.map((preset) => ({ href: preset.path, label: preset.label }));

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
      {tool.kind === "target" ? (
        <div className="wrap preset-row">
          <PresetLinks label="Common file sizes" currentPath={tool.path} links={sizeLinks} />
        </div>
      ) : null}
      {tool.kind === "convert" ? (
        <div className="wrap preset-row">
          <PresetLinks label="Format conversions" currentPath={tool.path} links={formatLinks} />
        </div>
      ) : null}
      <div className="wrap">
        <WorkspaceClient tool={tool} />
      </div>
      <section className="section wrap story">
        {tool.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {tool.sections?.map((section) => (
          <div key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        ))}
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
        {tool.links?.length ? (
          <p>
            {tool.links.map((item, index) => (
              <span key={item.href}>
                {index > 0 ? " · " : null}
                <Link href={item.href}>{item.label}</Link>
              </span>
            ))}
          </p>
        ) : null}
      </section>
    </>
  );
}
