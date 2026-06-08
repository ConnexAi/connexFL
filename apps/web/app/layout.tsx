import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connex for Lawyers",
  description: "Gestión documental para despachos de abogados"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
