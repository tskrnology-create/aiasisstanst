"use client";

import { useEffect, useRef } from "react";

export default function ModelViewer({ src, alt }: { src: string; alt: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContainer = container.current;
    if (!currentContainer) return;
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => {
        if (cancelled) return;
        const viewer = document.createElement("model-viewer");
        viewer.setAttribute("src", src);
        viewer.setAttribute("alt", alt);
        viewer.setAttribute("camera-controls", "");
        viewer.setAttribute("auto-rotate", "");
        viewer.setAttribute("touch-action", "pan-y");
        viewer.setAttribute("loading", "lazy");
        viewer.style.width = "100%";
        viewer.style.height = "20rem";
        viewer.style.background = "transparent";
        currentContainer.replaceChildren(viewer);
      })
      .catch(() => {
        currentContainer.textContent = "3D model görüntüleyicisi yüklenemedi.";
      });
    return () => {
      cancelled = true;
      currentContainer.replaceChildren();
    };
  }, [src, alt]);

  return <div ref={container} className="min-h-20 overflow-hidden rounded-lg" aria-label={alt} />;
}
