import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fontVariables } from "./fonts";
import "./styles.css";

export const metadata: Metadata = {
  title: "BikeTrips",
  description: "Совместные велопоездки",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body className={`${fontVariables} typography-theme storybook-outdoor-theme`}>
        {children}
      </body>
    </html>
  );
}
