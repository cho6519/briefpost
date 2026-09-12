"use client";

import React, { useEffect, useRef } from "react";

export interface AdUnitProps {
  slotId: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  className?: string;
  label?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle?: any[];
  }
}

/**
 * 애드센스 전용 반응형 광고 슬롯 컴포넌트
 * - 승인 및 클라이언트 ID 설정 시: 구글 공식 adsbygoogle 스크립트로 자동 연동
 * - 심사 단계 및 미승인 상태: 심사 탈락 유발 요소(점선 테두리 빈 박스) 방지를 위해 DOM에서 완전 제거(null 반환)
 */
export default function AdUnit({
  slotId,
  format = "auto",
  className = "",
  label = "SPONSORED",
}: AdUnitProps) {
  const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === "true";
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const isLoaded = useRef(false);

  // 실서비스 애드센스 활성화 여부 판별 (광고 활성화 플래그, 클라이언트 ID 등록 및 프로덕션 환경)
  const isLiveAdSense = Boolean(isAdsEnabled && adClient && process.env.NODE_ENV === "production");

  useEffect(() => {
    if (isAdsEnabled && isLiveAdSense && typeof window !== "undefined" && !isLoaded.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      } catch (err) {
        console.error("[AdSense] 슬롯 초기화 에러:", err);
      }
    }
  }, [isAdsEnabled, isLiveAdSense, slotId]);

  // 애드센스 승인 전 또는 Feature Flag 비활성화 시 DOM에서 완전 제거
  if (!isAdsEnabled) {
    return null;
  }

  // 1. 실서비스 구글 애드센스 광고 단위 렌더링
  if (isLiveAdSense && adClient) {
    return (
      <aside
        aria-label="구글 애드센스 광고 영역"
        className={`w-full overflow-hidden text-center my-8 ${className}`}
      >
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 tracking-wider uppercase mb-1">
          {label}
        </div>
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: "250px" }}
          data-ad-client={adClient}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  // 2. 심사 단계: 점선 테두리 빈 박스 노출 금지 (심사 탈락 방지)
  return null;
}
