import type { Metadata } from "next";
import "./globals.css";
import "./design.css";
import "./studio.css";
import "./atlas.css";

export const metadata: Metadata = {
  title: {
    default: "OAuth Atlas · Your next connection, clarified",
    template: "%s · OAuth Atlas",
  },
  description:
    "Source-backed OAuth setup guides. Separate your first test from the approvals needed for launch.",
  referrer: "no-referrer",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
