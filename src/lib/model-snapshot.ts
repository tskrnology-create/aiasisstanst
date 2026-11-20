// 3D (.glb) modelinden tek kare önizleme üretir: model-viewer ekran dışında yüklenir,
// modelin şeffaf arka planlı karesi marka renkli gradyan üzerine yerleştirilir.
// Sonuç, görsel stüdyosunda arka plan olarak kullanılabilir.

import { loadImage } from "./api-client";
import { mix } from "./brand-palette";

type ModelViewerElement = HTMLElement & {
  toBlob: (options?: { mimeType?: string; idealAspect?: boolean }) => Promise<Blob>;
  updateComplete?: Promise<unknown>;
};

export async function snapshotModel(
  file: File,
  opts: { width: number; height: number; primary: string; secondary: string }
): Promise<HTMLImageElement> {
  await import("@google/model-viewer");
  const objectUrl = URL.createObjectURL(file);
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:0;top:0;width:900px;height:900px;opacity:0;pointer-events:none;z-index:-1;";
  const viewer = document.createElement("model-viewer") as ModelViewerElement;
  viewer.setAttribute("alt", "3D model önizlemesi");
  viewer.setAttribute("camera-orbit", "32deg 72deg auto");
  viewer.setAttribute("environment-image", "neutral");
  viewer.setAttribute("exposure", "1.05");
  viewer.setAttribute("shadow-intensity", "0.9");
  viewer.setAttribute("reveal", "auto");
  viewer.setAttribute("loading", "eager"); // ekran dışında da hemen yüklensin
  viewer.style.cssText = "width:900px;height:900px;background:transparent;";
  holder.appendChild(viewer);
  document.body.appendChild(holder);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("3D model zamanında yüklenemedi.")), 25_000);
      viewer.addEventListener("load", () => { clearTimeout(timer); resolve(); }, { once: true });
      viewer.addEventListener("error", () => { clearTimeout(timer); reject(new Error("3D model okunamadı.")); }, { once: true });
      viewer.setAttribute("src", objectUrl);
    });
    // Kamera/ışık oturana kadar bir iki kare bekle.
    await new Promise((resolve) => setTimeout(resolve, 600));
    const blob = await viewer.toBlob({ mimeType: "image/png", idealAspect: true });
    if (!blob.size || !blob.type.startsWith("image/")) throw new Error("3D model önizlemesi boş döndü.");
    const snapshotUrl = URL.createObjectURL(blob);
    let modelImage: HTMLImageElement;
    try {
      modelImage = await loadImage(snapshotUrl);
    } finally {
      URL.revokeObjectURL(snapshotUrl);
    }

    const canvas = document.createElement("canvas");
    canvas.width = opts.width;
    canvas.height = opts.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tuval oluşturulamadı.");
    const g = ctx.createLinearGradient(0, 0, opts.width, opts.height);
    g.addColorStop(0, opts.primary);
    g.addColorStop(1, mix(opts.primary, opts.secondary, 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, opts.width, opts.height);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(opts.width / 2, opts.height * 0.55, Math.min(opts.width, opts.height) * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const box = Math.min(opts.width, opts.height) * 0.86;
    const scale = Math.min(box / modelImage.naturalWidth, box / modelImage.naturalHeight);
    const w = modelImage.naturalWidth * scale;
    const h = modelImage.naturalHeight * scale;
    ctx.drawImage(modelImage, (opts.width - w) / 2, (opts.height - h) / 2, w, h);
    return await loadImage(canvas.toDataURL("image/png"));
  } finally {
    holder.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
