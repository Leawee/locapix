import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://locapix.app"),
  title: { default: "locapix — Your photos stay yours", template: "%s · locapix" },
  description: "Compress, resize, convert, and clean photos in your browser. Photos never leave your device.",
  applicationName: "locapix",
  openGraph: {
    title: "locapix — Your photos stay yours",
    description: "Local photo tools. Nothing is uploaded.",
    url: "https://locapix.app",
    siteName: "locapix",
    type: "website",
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
