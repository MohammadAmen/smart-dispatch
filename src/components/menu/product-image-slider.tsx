"use client";

import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { m } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { cn } from "@/lib/utils";

export function ProductImageSlider({
  images,
  alt,
  className,
  showArrows = false,
  activeUrl = null,
}: {
  images: string[];
  alt: string;
  className?: string;
  showArrows?: boolean;
  activeUrl?: string | null;
}): ReactNode {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);

  useEffect(() => {
    if (!activeUrl) {
      return;
    }
    const next = images.indexOf(activeUrl);
    if (next >= 0) {
      setIndex(next);
    }
  }, [activeUrl, images]);

  if (images.length === 0) {
    return (
      <div className={cn("flex size-full items-center justify-center bg-linear-to-br from-muted to-secondary text-muted-foreground", className)}>
        <ImageOff className="size-7 opacity-45" />
      </div>
    );
  }

  const goTo = (next: number): void => {
    setIndex(Math.max(0, Math.min(images.length - 1, next)));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    startX.current = event.clientX;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const delta = event.clientX - startX.current;
    if (Math.abs(delta) < 36) {
      return;
    }
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <div
      dir="ltr"
      className={cn("relative size-full overflow-hidden", className)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <m.div
        className="flex size-full"
        animate={{ x: `${-index * 100}%` }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {images.map((src) => (
          <div key={src} className="size-full shrink-0 basis-full">
            <MenuSafeImage
              src={src}
              alt={alt}
              className="size-full object-cover"
              fallback={
                <div className="flex size-full items-center justify-center bg-linear-to-br from-muted to-secondary text-muted-foreground">
                  <ImageOff className="size-7 opacity-45" />
                </div>
              }
            />
          </div>
        ))}
      </m.div>

      {showArrows && images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="absolute start-1.5 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/75 text-foreground backdrop-blur-md disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            disabled={index === images.length - 1}
            onClick={() => goTo(index + 1)}
            className="absolute end-1.5 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/75 text-foreground backdrop-blur-md disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      ) : null}

      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-1.5 z-10 flex justify-center gap-1">
          {images.map((src, dot) => (
            <button
              key={src}
              type="button"
              aria-label={`Image ${dot + 1}`}
              onClick={() => goTo(dot)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                dot === index ? "w-4 bg-white shadow-sm" : "w-1.5 bg-white/55",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
