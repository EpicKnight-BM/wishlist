import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wishlist — Surprise preserved",
  description: "The wishlist app where owners never see claim status.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
