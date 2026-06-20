import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cleared — live door-to-door arrival tracking",
  description: "Autonomous multi-agent travel co-pilot. Gemma orchestrates real-time door-to-door tracking across flights, layovers, and the ride to your destination.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=block"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
