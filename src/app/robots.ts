import type { MetadataRoute } from "next";

// Uygulama oturum arkasındadır; yalnızca yasal sayfalar indekslenebilir.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/gizlilik", "/kosullar"], disallow: ["/api/", "/hesap"] } };
}
