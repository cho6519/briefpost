"use client";

import { useEffect, useState } from "react";

/**
 * 독서 진행률 표시 바 (Reading Progress Bar)
 * - 독자가 스크롤을 내릴 때마다 상단에 실시간 진행도를 부드럽게 표시
 * - 완독 심리를 자극하여 페이지 체류시간(Dwell Time)을 극대화
 */
export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setProgress(0);
        return;
      }
      const currentScroll = window.scrollY;
      const scrollPercentage = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
      setProgress(scrollPercentage);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3.5px] z-50 pointer-events-none bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 transition-[width] duration-150 ease-out shadow-[0_0_10px_rgba(56,189,248,0.6)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
