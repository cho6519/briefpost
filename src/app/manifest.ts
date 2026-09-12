import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brief Post - 1단 요약 뉴스레터",
    short_name: "Brief Post",
    description: "정책, 경제, 테크 핵심 뉴스를 3줄 요약과 함께 빠르게 전달하는 1단 뉴스레터",
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
