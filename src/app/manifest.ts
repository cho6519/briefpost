import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brief Post - 공공.경제 정책 전문 브리핑",
    short_name: "Brief Post",
    description: "정책, 경제, 테크 핵심 뉴스를 빠르게 전달하는 공공.경제 정책 전문 브리핑",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
