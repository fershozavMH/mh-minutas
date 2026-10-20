import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MH Executive OS",
  description: "Minutas, acciones y decisiones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
