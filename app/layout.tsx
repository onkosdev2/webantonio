import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr. Antonio Camargo | Oncologia, Casos Clinicos y Pensamiento Medico",
  description:
    "Plataforma editorial oncologica con casos clinicos, noticias, editoriales, reflexiones e integraciones MCP."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
