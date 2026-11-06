import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { themeInitScript } from "@/lib/theme";
import { ThemeToggle } from "./theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "MH Executive OS",
  description: "Minutas, acciones y decisiones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <header className="topbar">
          <strong>MH Executive OS</strong>
          <nav>
            <Link href="/ayuda">Ayuda</Link> <ThemeToggle />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
