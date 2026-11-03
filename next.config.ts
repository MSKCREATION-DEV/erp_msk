import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Défaut Next = 1 Mo → 413 sur photos téléphone. Avatar compressé côté client.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
