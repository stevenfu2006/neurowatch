import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroWatch — Real-Time Signal Monitor",
  description: "Clinical-grade neural signal monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
