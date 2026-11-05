"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Hoeveel een meeschalende SVG (vaste viewBox, `w-full`) nu vergroot of
 * verkleind wordt. Gebruik het om tekst in de grafiek een vaste schermmaat
 * te geven: `fontSize={11 / scale}` blijft 11px, ook als de grafiek op een
 * telefoon tot de helft krimpt.
 */
export function useSvgScale(viewBoxWidth: number) {
  const [scale, setScale] = useState(1);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: SVGSVGElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(width / viewBoxWidth);
    });
    ro.observe(el);
    observer.current = ro;
  }, [viewBoxWidth]);
  return [ref, scale] as const;
}
