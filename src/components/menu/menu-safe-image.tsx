"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  isMenuImageReady,
  markMenuImageReady,
  prefetchMenuImage,
} from "@/lib/menu/image-cache";
import { cn } from "@/lib/utils";

export function MenuSafeImage({
  src,
  alt,
  className,
  fallback,
  priority = false,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
  /** Eager load for hero / above-the-fold media. */
  priority?: boolean;
  sizes?: string;
}): ReactNode {
  const url = src?.trim() || "";
  const alreadyReady = isMenuImageReady(url);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(alreadyReady);

  useEffect(() => {
    setFailed(false);
    setLoaded(isMenuImageReady(url));
    if (url && priority) {
      void prefetchMenuImage(url);
    }
  }, [priority, url]);

  if (!url || failed) {
    return fallback;
  }

  return (
    <>
      {!loaded ? (
        <span
          aria-hidden
          className="absolute inset-0 z-[1] animate-pulse bg-[linear-gradient(110deg,#e7e5e4_8%,#f5f5f4_18%,#e7e5e4_33%)] bg-size-[200%_100%] dark:bg-[linear-gradient(110deg,#1e293b_8%,#334155_18%,#1e293b_33%)]"
        />
      ) : null}
      {/* Uploads / remote CDN photos stay on <img> for Capacitor + offline shells. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cn(
          className,
          "relative z-[2] transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => {
          markMenuImageReady(url);
          setLoaded(true);
        }}
        onError={() => setFailed(true)}
      />
    </>
  );
}
