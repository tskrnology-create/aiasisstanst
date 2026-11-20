import { describe, expect, it } from "vitest";
import {
  inferPixabayPosterMime,
  inferPixabayVideoMime,
  isPixabayPageUrl,
  isPixabayPosterUrl,
  isPixabayVideoUrl,
} from "./pixabay-video-utils";

describe("Pixabay video medya doğrulayıcıları", () => {
  it("yalnız HTTPS Pixabay sayfalarını kabul eder", () => {
    expect(isPixabayPageUrl("https://pixabay.com/videos/example-123/" )).toBe(true);
    expect(isPixabayPageUrl("http://pixabay.com/videos/example/" )).toBe(false);
    expect(isPixabayPageUrl("https://pixabay.com.evil.example/video" )).toBe(false);
  });

  it("video dosyaları için Pixabay hostlarını, poster için ayrıca Vimeo CDN'i kabul eder", () => {
    expect(isPixabayVideoUrl("https://cdn.pixabay.com/video/clip.mp4")).toBe(true);
    expect(isPixabayVideoUrl("https://media.example/video.mp4")).toBe(false);
    expect(isPixabayPosterUrl("https://i.vimeocdn.com/video/preview.jpg")).toBe(true);
    expect(isPixabayPosterUrl("https://tracker.example/preview.jpg")).toBe(false);
  });

  it("video MIME türünü allowlist ve URL uzantısından çıkarır", () => {
    expect(inferPixabayVideoMime("video/mp4; charset=binary", "https://cdn.pixabay.com/video/a")).toBe("video/mp4");
    expect(inferPixabayVideoMime("application/octet-stream", "https://cdn.pixabay.com/video/a.webm")).toBe("video/webm");
    expect(inferPixabayVideoMime("video/quicktime", "https://cdn.pixabay.com/video/a.mov")).toBeNull();
    expect(inferPixabayVideoMime("", "https://cdn.pixabay.com/video/a")).toBeNull();
  });

  it("poster MIME türünü JPEG/PNG/WebP ile sınırlar", () => {
    expect(inferPixabayPosterMime("image/jpeg", "https://cdn.pixabay.com/preview")).toBe("image/jpeg");
    expect(inferPixabayPosterMime("application/octet-stream", "https://i.vimeocdn.com/preview.webp")).toBe("image/webp");
    expect(inferPixabayPosterMime("image/svg+xml", "https://cdn.pixabay.com/preview.svg")).toBeNull();
  });
});
