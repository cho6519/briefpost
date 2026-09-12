import React from "react";
import { getSourceDisplayName } from "@/lib/sourceHelper";

interface OfficialCtaCardProps {
  sourceUrl?: string | null;
  title: string;
  category: string;
}

/**
 * 공식 신청 및 세부 안내 바로가기 콜아웃 액션 카드 (High-CTR CTA 컴포넌트)
 * - 원문 보도자료의 출처 기관 또는 공식 신청 웹사이트(정부24, 복지로, 지자체 포털 등) 연결
 * - 신뢰 마크 및 외부 링크 안전 배지 제공
 */
export default function OfficialCtaCard({
  sourceUrl,
  title,
  category,
}: OfficialCtaCardProps) {
  const sourceName = getSourceDisplayName(sourceUrl, title, category);

  // 대상 URL 결정 (출처 URL이 없는 경우 기본 대표 공공포털 지정)
  const targetUrl = sourceUrl || "https://www.gov.kr";
  const isDefaultGov = !sourceUrl;

  return (
    <aside
      aria-label="공식 신청 및 안내 바로가기"
      className="my-8 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/60 p-5 sm:p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 좌측: 기관 안내 및 신청 가이드 텍스트 */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>공식 검증 안내처</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
            {sourceName} 공식 신청 및 세부 공고 안내
          </h3>

          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-lg">
            {isDefaultGov
              ? "본 제도의 세부 지원 자격 조회 및 정식 온라인 신청은 대한민국 정부24 공식 포털에서 바로 진행하실 수 있습니다."
              : `발표 기관(${sourceName})의 공식 홈페이지에서 상세 요강 확인 및 정식 접수를 안전하게 진행하실 수 있습니다.`}
          </p>
        </div>

        {/* 우측: 클릭 액션 CTA 버튼 */}
        <div className="shrink-0 pt-2 sm:pt-0">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
          >
            <span>공식 신청 및 안내 바로가기</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* 하단 신뢰 및 보안 안내 라인 */}
      <div className="mt-4 pt-3 border-t border-blue-100/80 flex items-center gap-2 text-[11px] text-zinc-500">
        <svg
          className="w-3.5 h-3.5 text-blue-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
        <span>
          정부부처 및 공식 공공기관의 인가된 웹사이트로 새 창에서 안전하게 연결됩니다.
        </span>
      </div>
    </aside>
  );
}
