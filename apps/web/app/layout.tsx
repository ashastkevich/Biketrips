import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CookieNotice } from "./cookie-notice";
import { fontVariables } from "./fonts";
import { baseOpenGraph, DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "./lib/site";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — совместные велопоездки`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: baseOpenGraph,
  icons: {
    icon: "/icon.svg",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // Smooth scrolling is for in-page anchors; the attribute lets Next turn it off during route changes.
    <html lang="ru" data-scroll-behavior="smooth">
      <body className={`${fontVariables} typography-theme app-theme`}>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
