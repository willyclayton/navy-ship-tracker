import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "news.usni.org" },
      { protocol: "https", hostname: "*.usni.org" },
    ],
  },
};

export default nextConfig;
