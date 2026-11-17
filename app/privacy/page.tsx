import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: "locapix processes photos in your browser. Photos are not uploaded, and there is no account.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <article className="section wrap legal">
      <p className="kicker">Privacy</p>
      <h1>Your photos stay on this device.</h1>
      <p>locapix is a set of photo tools that run in the browser. The photo you choose is not uploaded to a locapix server. There is no account, no profile, and no library of your pictures on our side.</p>
      <h2>What happens to a photo</h2>
      <p>Decoding, resizing, encoding, and building a PDF all happen on your device. The result is downloaded to your device. Closing the tab throws away the working copies in memory. We don&apos;t have them.</p>
      <h2>What the site itself loads</h2>
      <p>The page, fonts, and the encoders for the formats you use are downloaded like any other website. Those files are code, not your photos. After they have loaded once, a saved copy in the browser lets the same tools keep working offline.</p>
      <h2>What we don&apos;t collect</h2>
      <p>There is no sign-in, no photo upload API, and no analytics package in this version. Camera details inside a photo are read on your device so the page can show them to you. They are not sent anywhere.</p>
      <h2>Camera, files, and clipboard</h2>
      <p>The page can see a photo only after you drop it, pick it, paste it, or take one. The camera button asks the browser for a picture. You can say no.</p>
      <h2>Encoders</h2>
      <p>JPEG rotation uses libjpeg from the Independent JPEG Group. This software is based in part on the work of the Independent JPEG Group. The other encoders are the same family used by professional browser tools: MozJPEG, WebP, AVIF, and OxiPNG.</p>
    </article>
  );
}
