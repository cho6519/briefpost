"use client";

import React, { useSyncExternalStore } from "react";
import { CUSTOM_BANNERS, CustomBannerId } from "./bannerData";

interface CustomBannerProps {
  bannerId?: CustomBannerId;
  format?: "auto" | "horizontal" | "fluid" | "rectangle";
  className?: string;
}

const emptySubscribe = () => () => {};

export default function CustomBanner({
  bannerId = "random",
  className = "",
}: CustomBannerProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // random 모드일 때: 하이드레이션 일관성을 보장하며 클라이언트에서 균등하게 배너 교차 노출
  const selectedId: "shindansu" | "kecel" =
    bannerId !== "random"
      ? bannerId
      : isClient
      ? (typeof window !== "undefined" && (window.location.pathname.length + window.location.search.length) % 2 === 0 ? "shindansu" : "kecel")
      : "shindansu";

  const banner = CUSTOM_BANNERS[selectedId] || CUSTOM_BANNERS.shindansu;
  const isShindansu = banner.id === "shindansu";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-md transition-all duration-300 hover:shadow-lg bg-gradient-to-br ${banner.theme.bgGradient} dark:${banner.theme.darkBgGradient} border border-white/10 ${className}`}
    >
      {/* 배너 배경 장식 요소 */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-white/5 blur-2xl transition-all group-hover:scale-125" />
      <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-10 font-black text-6xl tracking-tighter text-white select-none">
        {isShindansu ? "SHINDANSU" : "KECEL"}
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-lg">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${banner.theme.badgeBg} ${banner.theme.badgeText}`}
            >
              SPONSORED
            </span>
            <span className="text-xs font-semibold tracking-tight text-white/90">
              {banner.name}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            {banner.tagline}
          </h3>

          <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
            {banner.description}
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
          <a
            href={banner.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-white text-zinc-900 px-4 py-2 text-xs font-bold shadow transition-all hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            {banner.ctaText}
          </a>
          <span className="text-[10px] text-white/40 mt-1">공식 웹사이트 연결</span>
        </div>
      </div>
    </div>
  );
}
