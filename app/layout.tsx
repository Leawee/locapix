import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const description = "Compress, resize, convert, and clean photos in your browser. Photos never leave your device.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "locapix — Your photos stay yours", template: "%s · locapix" },
  description,
  applicationName: "locapix",
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: "locapix — Your photos stay yours",
    description,
    url: siteUrl,
    siteName: "locapix",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "locapix — Your photos stay yours",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF8F1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.className}>
      <body>
        <Providers>
          <Header />
          <p className="promise-bar">Photos never leave your device.</p>
          <main id="content">{children}</main>
          <Footer />
        </Providers>
        <noscript>
          <p className="wrap">locapix runs in your browser. Turn on JavaScript to process photos. Nothing is uploaded either way.</p>
        </noscript>
      </body>
    </html>
  );
}
