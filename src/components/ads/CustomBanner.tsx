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

  const selectedId: "shindansu" | "kecel" =
    bannerId !== "random"
      ? bannerId
      : isClient
      ? (typeof window !== "undefined" && (window.location.pathname.length + window.location.search.length) % 2 === 0 ? "shindansu" : "kecel")
      : "shindansu";

  const banner = CUSTOM_BANNERS[selectedId] || CUSTOM_BANNERS.shindansu;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/90 dark:bg-[#121215] p-5 sm:p-6 transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md ${className}`}
    >
      {/* 우측 상단 파트너 배지 */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            Partner Content
          </span>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {banner.name}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Sponsored</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-lg">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {banner.tagline}
          </h3>
          <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
            {banner.description}
          </p>
        </div>

        <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0">
          <a
            href={banner.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 text-xs font-bold shadow-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <span>{banner.ctaText}</span>
            <span className="text-sm leading-none">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
