import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Eski adresler (yer imleri, paylaşılmış bağlantılar) yeni yapıya yönlenir; sorgu parametreleri korunur.
  async redirects() {
    return [
      { source: "/uret", destination: "/studyo", permanent: true },
      { source: "/gorsel", destination: "/studyo/gorsel", permanent: true },
      // Eski tek akışlı stüdyo bağlantıları (içerik/adım taşıyanlar) birlikte yapısına gider.
      { source: "/studyo", has: [{ type: "query", key: "content" }], destination: "/studyo/birlikte", permanent: false },
      { source: "/studyo", has: [{ type: "query", key: "adim" }], destination: "/studyo/birlikte", permanent: false },
      { source: "/takvim", destination: "/icerikler?gorunum=takvim", permanent: true },
      { source: "/kutuphane", destination: "/icerikler", permanent: true },
      { source: "/profil", destination: "/marka", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
