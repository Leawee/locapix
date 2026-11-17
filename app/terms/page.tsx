import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description: "Plain-language terms for locapix. The tools run in your browser and come as they are.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <article className="section wrap legal">
      <p className="kicker">Terms</p>
      <h1>Simple terms for a local tool.</h1>
      <p>locapix is a website of photo tools. You keep your photos. We don&apos;t take a copy, and we don&apos;t ask you to make an account.</p>
      <h2>Use it for your own photos</h2>
      <p>You&apos;re responsible for the files you open here and for what you do with the results. Don&apos;t use the site to break the law or to harm someone.</p>
      <h2>The tools come as they are</h2>
      <p>Photo encoding can fail on a huge file, an unusual camera format, or a browser that can&apos;t read HEIC. Check the result before you rely on it. locapix is provided as it is, without a promise that every file will come out perfectly.</p>
      <h2>No account to close</h2>
      <p>There is no profile stored for you, so there is nothing to delete and no inbox attached to this page.</p>
      <h2>Changes</h2>
      <p>The tools and these terms can change as the site improves. The version you have open is the one that applies to that visit.</p>
    </article>
  );
}
