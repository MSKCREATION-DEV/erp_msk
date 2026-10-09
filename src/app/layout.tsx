import type { Metadata } from "next";
import { fontVariables } from "@/fonts";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} · ERP`,
    template: `%s · ${brand.name}`,
  },
  description: "Logiciel métier interne MSK CREATION",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-screen bg-msk-chalk font-sans text-msk-ink antialiased">
        {children}
      </body>
    </html>
  );
}
