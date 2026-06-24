import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { publicEnvironment } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnvironment.NEXT_PUBLIC_APP_URL),
  title: {
    default: "World Stage — Football Tournament Simulator",
    template: "%s | World Stage",
  },
  description:
    "Build a squad, shape a tactical identity, and simulate a complete 48-team international football tournament.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070b21",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1" id="main-content">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
