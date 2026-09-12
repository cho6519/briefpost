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
 * - 개발 및 승인 심사 단계: border: 1px dashed #ccc, min-height: 250px, 회색 배경의 플레이스홀더 표시
 * - 승인 및 클라이언트 ID 설정 시: 구글 공식 adsbygoogle 스크립트로 자동 연동
 */
export default function AdUnit({
  slotId,
  format = "auto",
  className = "",
  label = "광고 영역 (AdSense Slot)",
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

  // 2. 개발 및 심사 단계: 규격 플레이스홀더 박스 (border: 1px dashed #ccc, min-height: 250px)
  return (
    <aside
      aria-label="광고 영역 플레이스홀더"
      className={`w-full my-8 ${className}`}
    >
      <div
        style={{
          border: "1px dashed #ccc",
          minHeight: "250px",
          backgroundColor: "#f8f9fa",
        }}
        className="rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
      >
        {/* 광고 배지 아이콘 및 슬롯 정보 */}
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-zinc-200/80 text-zinc-500 mb-2.5 shadow-2xs">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.25 2.25L15 7.5"
            />
          </svg>
        </div>

        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wider">
          {label}
        </span>

        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-1">
          SLOT: {slotId} ({format})
        </span>

        <p className="text-[11px] text-zinc-400 mt-2 max-w-xs leading-relaxed">
          구글 애드센스 심사 승인 후 고단가 반응형 디스플레이 광고가 자동 송출되는 전용 구역입니다.
        </p>
      </div>
    </aside>
  );
}
