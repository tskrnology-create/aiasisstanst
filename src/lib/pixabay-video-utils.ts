const VIDEO_MIMES = ["video/mp4", "video/webm"] as const;
const POSTER_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

function isHttpsHost(value: string, hostnameAllowed: (hostname: string) => boolean): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hostnameAllowed(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isPixabayHost(hostname: string): boolean {
  return hostname === "pixabay.com" || hostname.endsWith(".pixabay.com");
}

export function isPixabayPageUrl(value: string): boolean {
  return isHttpsHost(value, isPixabayHost);
}

export function isPixabayVideoUrl(value: string): boolean {
  return isHttpsHost(value, isPixabayHost);
}

export function isPixabayPosterUrl(value: string): boolean {
  return isHttpsHost(value, (hostname) => isPixabayHost(hostname) || hostname === "i.vimeocdn.com");
}

function normalizedHeader(contentType: string | null | undefined): string {
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

function pathExtension(sourceUrl: string): string | null {
  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase();
    return pathname.slice(pathname.lastIndexOf("."));
  } catch {
    return null;
  }
}

export function inferPixabayVideoMime(contentType: string | null | undefined, sourceUrl: string): string | null {
  const header = normalizedHeader(contentType);
  if ((VIDEO_MIMES as readonly string[]).includes(header)) return header;
  if (header && header !== "application/octet-stream" && header !== "binary/octet-stream") return null;
  const extension = pathExtension(sourceUrl);
  return extension === ".mp4" ? "video/mp4" : extension === ".webm" ? "video/webm" : null;
}

export function inferPixabayPosterMime(contentType: string | null | undefined, sourceUrl: string): string | null {
  const header = normalizedHeader(contentType);
  if ((POSTER_MIMES as readonly string[]).includes(header)) return header;
  if (header && header !== "application/octet-stream" && header !== "binary/octet-stream") return null;
  const extension = pathExtension(sourceUrl);
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return null;
}
