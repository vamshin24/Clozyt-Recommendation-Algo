declare module "next-pwa" {
  import type { NextConfig } from "next";

  type StrategyName =
    | "CacheFirst"
    | "CacheOnly"
    | "NetworkFirst"
    | "NetworkOnly"
    | "StaleWhileRevalidate";

  type UrlPatternFn = (context: { request: Request; url: URL }) => boolean;

  export type RuntimeCaching = {
    urlPattern: RegExp | string | UrlPatternFn;
    handler: StrategyName;
    method?: string;
    options?: {
      cacheName?: string;
      networkTimeoutSeconds?: number;
      matchOptions?: CacheQueryOptions;
      fetchOptions?: RequestInit;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
        purgeOnQuotaError?: boolean;
      };
      cacheableResponse?: {
        statuses?: number[];
        headers?: Record<string, string>;
      };
    };
  };

  export type NextPWAConfig = {
    disable?: boolean;
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCaching[];
    buildExcludes?: (RegExp | string)[];
  };

  type WithPWA = (nextConfig?: NextConfig) => NextConfig;

  export default function withPWA(config?: NextPWAConfig): WithPWA;
}
