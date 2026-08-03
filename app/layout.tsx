import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-instrument-serif",
});

const title = "Trogix — One system runs your entire restaurant";
const description =
  "Menu, ordering, kitchen, payments and guest messaging — in one place, on your brand. The operating system for modern restaurants.";

export const metadata: Metadata = {
  metadataBase: new URL("https://trogix.co.in"),
  title: {
    default: title,
    template: "%s — Trogix",
  },
  description,
  applicationName: "Trogix",
  keywords: [
    "restaurant operating system",
    "digital menu",
    "restaurant ordering",
    "kitchen display system",
    "restaurant analytics",
  ],
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "Trogix",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F4F1EA",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${instrumentSerif.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
