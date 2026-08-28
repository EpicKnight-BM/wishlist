import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Wishlist — Surprise preserved",
  description: "The wishlist app where owners never see claim status.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn( geist.variable, "font-mono", geistMono.variable)}>
      <body>{children}</body>
    </html>
  );
}
