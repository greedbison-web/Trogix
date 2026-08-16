import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./glass.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Liquid Glass — visual demo",
  description:
    "A front-end only study in frosted glass surfaces over a deep slate gradient.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} glass-demo`}>
      {/* Ambient light pools, drifting behind everything */}
      <div className="glass-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  );
}
