import type { NextConfig } from "next";
import withPWAInit, { type PwaRuntimeCaching } from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache";

const runtimeCaching: PwaRuntimeCaching[] = defaultRuntimeCaching.map((rule) => {
  if (rule.handler !== "NetworkFirst") {
    return rule;
  }

  return {
    urlPattern: rule.urlPattern,
    handler: "NetworkOnly",
    ...(rule.method ? { method: rule.method } : {}),
  };
});

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  skipWaiting: false,
  clientsClaim: false,
  sw: "pwa-sw.js",
  cacheStartUrl: false,
  dynamicStartUrl: false,
  fallbacks: false,
  publicExcludes: [
    "!noprecache/**/*",
    "!sw.js",
    "!sw.js.map",
    "!uploads/**/*",
    "!audio/**/*",
    "!ringtone.mp3",
    "!ringtone.wav",
  ],
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  runtimeCaching,
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Next.js 16 builds with Turbopack by default. next-pwa adds a webpack
  // plugin, and an empty turbopack key keeps that default build from exiting.
  turbopack: {},
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "qrcode-terminal",
    "pino",
    "@hapi/boom",
    "whatsapp-rust-bridge",
    "ws",
    "libsignal",
    "qrcode",
    "firebase-admin",
  ],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/menu.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/vendor.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
