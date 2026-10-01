import type { Metadata } from "next";
import { Bodoni_Moda, Cormorant_Garamond, DM_Sans } from "next/font/google";
import { SiteNavigationProvider } from "@/components/site-navigation";
import "./globals.css";
import "./public-design.css";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const editorial = Bodoni_Moda({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "GALI BLUE | Restaurant & Bar a Casablanca", template: "%s | GALI BLUE" },
  description: "Une table, un cocktail, un moment. Decouvrez GALI BLUE, restaurant et bar a Casablanca, et reservez votre table.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${sans.variable} ${display.variable} ${editorial.variable}`}>
      <body><SiteNavigationProvider>{children}</SiteNavigationProvider></body>
    </html>
  );
}
