import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP MSK CREATION",
  description: "Logiciel métier interne MSK CREATION — Phase -1 socle",
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
    <html lang="fr">
      <body className="min-h-screen bg-msk-chalk text-msk-ink antialiased">
        {children}
      </body>
    </html>
  );
}
