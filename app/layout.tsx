import type { Metadata } from "next";
import localFont from "next/font/local";
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
  title: "Dr. Antonio Camargo | Oncología, Casos Clínicos y Pensamiento Médico",
  description:
    "Plataforma editorial oncológica con casos clínicos, noticias, editoriales, investigación, reflexiones e integraciones MCP."
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
