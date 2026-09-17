"use client";

import { useEffect, useState, type ReactNode } from "react";

export function MenuSafeImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
}): ReactNode {
  const [failed, setFailed] = useState(false);
  const url = src?.trim();

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    return fallback;
  }

  return (
    // Uploads and remote product photos are not always in the Next image pipeline.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
