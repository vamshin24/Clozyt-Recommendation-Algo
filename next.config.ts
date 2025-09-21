import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "www.na-kd.com" },
      { protocol: "https", hostname: "na-kd.com" },
    ],
  },
};

export default nextConfig;
