import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
import "./logo.css";
import "leaflet/dist/leaflet.css";
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
export const metadata: Metadata = { title: { default: "NITO", template: "%s · NITO" }, description: "Des sorties nature guidées par des passionnés, près de chez vous.", icons:{icon:"/nito-logo.png",apple:"/nito-logo.png"} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body className={`${dm.variable} ${playfair.variable}`}><Header /><main>{children}</main><Footer /></body></html> }
