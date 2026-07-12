import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fontVariables } from "./fonts";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "BikeTrips",
  description: "Совместные велопоездки",
  icons: {
    icon: "/icon.svg",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body className={`${fontVariables} typography-theme app-theme`}>
        {children}
      </body>
    </html>
  );
}
