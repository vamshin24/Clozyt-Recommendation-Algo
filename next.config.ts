import withPWA, { type RuntimeCaching } from "next-pwa";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

const runtimeCaching: RuntimeCaching[] = [
  {
    urlPattern: ({ request }) => request.destination === "image",
    handler: "CacheFirst",
    options: {
      cacheName: "images",
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: THIRTY_DAYS,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ url }) =>
      url.pathname.startsWith("/api/recs/next") ||
      url.pathname.startsWith("/api/feedback"),
    handler: "NetworkFirst",
    options: {
      cacheName: "api",
      networkTimeoutSeconds: 3,
      cacheableResponse: {
        statuses: [0, 200],
      },
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: ({ request }) => request.mode === "navigate",
    handler: "NetworkFirst",
    options: {
      cacheName: "documents",
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

const baseConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "www.na-kd.com" },
      { protocol: "https", hostname: "na-kd.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

const withPWAWrapped = withPWA({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true,
  runtimeCaching,
});

export default withPWAWrapped(baseConfig);
