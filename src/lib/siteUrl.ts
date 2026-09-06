/**
 * 사이트 기본 도메인 URL 유틸리티
 * 환경변수 NEXT_PUBLIC_SITE_URL을 정규화하여 반환합니다.
 * (끝의 슬래시 제거 및 올바른 URL 프로토콜 보장)
 */
export function getSiteUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://example.com";

  // 프로토콜이 없는 경우 https:// 기본 추가
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // URL 끝의 슬래시 제거
  return url.replace(/\/+$/, "");
}

export const siteUrl = getSiteUrl();
