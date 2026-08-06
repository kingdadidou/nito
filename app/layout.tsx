import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
import "./logo.css";
import "leaflet/dist/leaflet.css";
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
export const metadata: Metadata = {
  metadataBase: new URL("https://www.nito-nature.fr"),
  title: {
    default: "NITO — Sorties et activités nature",
    template: "%s · NITO",
  },
  description:
    "Découvrez et réservez des sorties nature guidées par des passionnés près de chez vous avec NITO.",
  applicationName: "NITO",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "NITO",
    title: "NITO — Sorties et activités nature",
    description:
      "Découvrez et réservez des sorties nature guidées par des passionnés près de chez vous.",
  },
  twitter: {
    card: "summary",
    title: "NITO — Sorties et activités nature",
    description:
      "Découvrez et réservez des sorties nature guidées par des passionnés près de chez vous.",
  },
  icons: { icon: "/nito-logo.png", apple: "/nito-logo.png" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body className={`${dm.variable} ${playfair.variable}`}><Header /><main>{children}</main><Footer /></body></html> }
