import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "whether weather",
  description: "Makati, Baguio and UPLB at a glance, with a sky that follows the hour and the weather.",
};

export const viewport: Viewport = {
  themeColor: "#0d1536",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="day">
      <body>{children}</body>
    </html>
  );
}
