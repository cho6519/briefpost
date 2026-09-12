import React from "react";
import { getSourceDisplayName } from "@/lib/sourceHelper";

interface OfficialCtaCardProps {
  sourceUrl?: string | null;
  title: string;
  category: string;
  ctaType?: "subsidy" | "general" | string | null;
}

/**
 * 기사 성격별 스마트 조건부 CTA 콜아웃 컴포넌트 (Smart Conditional CTA)
 * - ctaType === 'subsidy' (지원금, 청약, 환급, 복지 등):
 *   👉 [정부24 및 공식 접수처에서 신청하기] (아이콘과 함께 눈에 띄는 고CTR 강조 스타일)
 * - ctaType === 'general' (일반 경제, 금리, 환율, 사회, 테크 등):
 *   👉 [공식 보도자료 원문 및 상세 출처 확인] (차분하고 신뢰감 있는 저널리즘 링크 스타일)
 * - 안전 장치: URL이 불분명할 경우 깨진 버튼 대신 기관명 공식 브리핑 안내로 우아하게 대체
 */
export default function OfficialCtaCard({
  sourceUrl,
  title,
  category,
  ctaType = "general",
}: OfficialCtaCardProps) {
  const sourceName = getSourceDisplayName(sourceUrl, title, category);
  const isValidUrl = Boolean(sourceUrl && /^https?:\/\//i.test(sourceUrl.trim()));

  const isSubsidy = ctaType === "subsidy";

  // 1. URL이 유효하지 않고 일반 기사(general)인 경우의 안전 장치:
  //    어색한 외부 신청 버튼을 숨기고 신뢰할 수 있는 공공 출처 안내 카드로 단정하게 렌더링
  if (!isValidUrl && !isSubsidy) {
    return (
      <aside
        aria-label="공식 출처 안내"
        className="my-8 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5 text-zinc-700 shadow-2xs"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <span className="inline-block w-2 h-2 rounded-full bg-zinc-400" />
          <span>공식 브리핑 출처</span>
        </div>
        <p className="mt-1.5 text-sm sm:text-base font-bold text-zinc-900">
          출처: {sourceName} 공식 발표 자료
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          본 기사는 정부 부처 및 공공기관의 공식 브리핑 자료를 바탕으로 전문 에디터가 심층 검증 후 재구성하였습니다.
        </p>
      </aside>
    );
  }

  // 2. subsidy 타입 대상 URL (출처 URL이 없으면 대한민국 정부24 공식 포털을 안전 대체 링크로 제공)
  const subsidyTargetUrl = isValidUrl ? sourceUrl!.trim() : "https://www.gov.kr";

  // 3-A. [subsidy] 지원금, 보조금, 청약, 환급, 복지 등 실제 신청/접수가 있는 정책
  if (isSubsidy) {
    return (
      <aside
        aria-label="공식 신청 및 접수 안내 바로가기"
        className="my-8 overflow-hidden rounded-2xl border-2 border-blue-400/80 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white p-5 sm:p-6 shadow-md shadow-blue-500/10 transition-all hover:border-blue-500 hover:shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 좌측 안내 카피 */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-2xs">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              <span>신청 및 접수 안내</span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-zinc-950 tracking-tight">
              {sourceName} 공식 접수 및 지원 신청
            </h3>

            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed max-w-lg font-medium">
              자격 요건 충족 여부 모의 조회 및 정식 온라인 접수는 정부24 또는 주관 공식 접수처에서 안전하게 진행하실 수 있습니다.
            </p>
          </div>

          {/* 우측 High-CTR 강조 CTA 액션 버튼 */}
          <div className="shrink-0 pt-1 sm:pt-0">
            <a
              href={subsidyTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <span className="text-base">👉</span>
              <span>정부24 및 공식 접수처에서 신청하기</span>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
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
        <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center gap-2 text-[11px] text-zinc-600 font-medium">
          <svg
            className="w-4 h-4 text-blue-600 shrink-0"
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
            공식 인가된 정부 포털 및 안전 접수처 웹사이트로 새 창에서 직접 연결됩니다.
          </span>
        </div>
      </aside>
    );
  }

  // 3-B. [general] 일반 경제, 금리, 환율, 증시, 테크, IT, 사회 등 단순 보도 기사
  return (
    <aside
      aria-label="공식 보도자료 원문 확인"
      className="my-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 좌측 원문 안내 카피 */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-700">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span>원문 출처 검증</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
            {sourceName} 공식 보도자료 및 상세 원문
          </h3>

          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-lg">
            발표 기관의 공식 보도자료 및 세부 데이터, 원문 브리핑 내용을 확인하실 수 있습니다.
          </p>
        </div>

        {/* 우측 차분한 저널리즘 링크 CTA 버튼 */}
        <div className="shrink-0 pt-1 sm:pt-0">
          <a
            href={sourceUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            <span>👉 공식 보도자료 원문 및 상세 출처 확인</span>
            <svg
              className="w-3.5 h-3.5 text-zinc-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        </div>
      </div>
    </aside>
  );
}
