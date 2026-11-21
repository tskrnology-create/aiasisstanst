import type { MetadataRoute } from "next";

// Telefonda "Ana ekrana ekle" ile uygulama gibi açılması için.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aı Asisst",
    short_name: "Aı Asisst",
    description: "KOBİ'ler için sosyal medya içerik, görsel ve takvim stüdyosu.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f9",
    theme_color: "#6366f1",
    lang: "tr",
  };
}
