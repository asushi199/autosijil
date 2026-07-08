import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem e-Sijil & Kehadiran",
  description:
    "Rekod kehadiran melalui QR code dan jana sijil penyertaan secara automatik.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
