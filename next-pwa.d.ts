declare module "next-pwa" {
  import type { NextConfig } from "next";

  export type PwaRuntimeCaching = {
    urlPattern: RegExp | ((context: { url: URL; request?: Request }) => boolean);
    handler: string;
    method?: string;
    options?: Record<string, unknown>;
  };

  export type PwaPluginOptions = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    clientsClaim?: boolean;
    sw?: string;
    cacheStartUrl?: boolean;
    dynamicStartUrl?: boolean;
    fallbacks?: false | Record<string, string>;
    publicExcludes?: string[];
    buildExcludes?: Array<string | RegExp>;
    runtimeCaching?: PwaRuntimeCaching[];
    scope?: string;
  };

  export default function withPWA(
    options?: PwaPluginOptions,
  ): (nextConfig: NextConfig) => NextConfig;
}

declare module "next-pwa/cache" {
  import type { PwaRuntimeCaching } from "next-pwa";

  const cache: PwaRuntimeCaching[];
  export default cache;
}
