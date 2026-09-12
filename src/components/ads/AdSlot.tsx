"use client";

import React, { useEffect, useRef } from "react";
import CustomBanner from "./CustomBanner";
import { CustomBannerId } from "./bannerData";

export interface AdSlotProps {
  mode?: "auto" | "adsense" | "custom";
  bannerId?: CustomBannerId;
  slotId?: string;
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
 * 광고 슬롯 컴포넌트
 * 구글 애드센스 코드 또는 자체 이미지 배너(신단수, KECEL)를 조건부로 렌더링합니다.
 * CLS(Cumulative Layout Shift) 방지를 고려하여 부드러운 전환과 최적의 높이를 유지합니다.
 */
export default function AdSlot({
  mode = "auto",
  bannerId = "random",
  slotId = process.env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID,
  format = "auto",
  className = "",
  label = "SPONSORED",
}: AdSlotProps) {
  const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === "true";
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const forceCustom = process.env.NEXT_PUBLIC_FORCE_CUSTOM_BANNER === "true";
  const isLoaded = useRef(false);

  const shouldRenderCustom =
    isAdsEnabled && (mode === "custom" || forceCustom || (mode === "auto" && (!adClient || !slotId)));

  useEffect(() => {
    if (
      isAdsEnabled &&
      !shouldRenderCustom &&
      adClient &&
      slotId &&
      typeof window !== "undefined" &&
      !isLoaded.current
    ) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      } catch (err) {
        console.error("AdSense push error:", err);
      }
    }
  }, [isAdsEnabled, shouldRenderCustom, adClient, slotId]);

  // 애드센스 승인 전 또는 Feature Flag 비활성화 시 DOM에서 완전 제거
  if (!isAdsEnabled) {
    return null;
  }

  // 1. 자체 이미지 배너(신단수, KECEL) 렌더링 케이스
  if (shouldRenderCustom) {
    return (
      <aside aria-label="스폰서 배너 영역" className={`my-8 w-full ${className}`}>
        <CustomBanner bannerId={bannerId} format={format} />
      </aside>
    );
  }

  // 2. 구글 애드센스 광고 코드 렌더링 케이스
  return (
    <aside
      aria-label="구글 애드센스 광고 영역"
      className={`my-8 w-full overflow-hidden text-center min-h-[120px] ${className}`}
    >
      <div className="text-[10px] text-zinc-600 dark:text-zinc-500 tracking-wider uppercase mb-1">
        {label}
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: "100px" }}
        data-ad-client={adClient}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
