import type { Metadata } from "next";
import localFont from "next/font/local";
import { absoluteUrl, defaultOgImage, siteName, siteUrl } from "@/lib/seo";
import "./globals.css";

// Playfair Display auto-hospedada (sin dependencia de red en build).
const brandFont = localFont({
  src: [
    { path: "./fonts/playfair-normal.woff2", weight: "600 700", style: "normal" },
    { path: "./fonts/playfair-italic.woff2", weight: "600 700", style: "italic" }
  ],
  variable: "--font-brand",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Dr. Antonio Camargo | Oncólogo Clínico en Lima",
    template: "%s | Dr. Antonio Camargo"
  },
  description:
    "Oncología clínica en Lima, con orientación médica presencial y remota para pacientes de provincias y del extranjero.",
  applicationName: siteName,
  authors: [{ name: "Dr. Antonio Camargo", url: absoluteUrl("/sobre-mi") }],
  creator: "Dr. Antonio Camargo",
  publisher: "Dr. Antonio Camargo",
  category: "Salud",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    title: "Dr. Antonio Camargo | Oncólogo Clínico en Lima",
    description:
      "Casos clínicos, educación oncológica, investigación y orientación médica desde Lima para pacientes de Perú y del extranjero.",
    url: "/",
    siteName,
    locale: "es_PE",
    type: "website",
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Dr. Antonio Camargo, oncólogo clínico en Lima"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Dr. Antonio Camargo | Oncólogo Clínico en Lima",
    description:
      "Oncología clínica en Lima y orientación remota para pacientes de provincias y del extranjero.",
    images: [defaultOgImage]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={brandFont.variable}>
      <body>{children}</body>
    </html>
  );
}
