import React from "react";
import { getSourceDisplayName } from "@/lib/sourceHelper";

interface OfficialCtaCardProps {
  sourceUrl?: string | null;
  title: string;
  category: string;
  content?: string | null;
  ctaType?: "subsidy" | "general" | string | null;
}

export interface OfficialDestination {
  url: string;
  buttonText: string;
  agencyName: string;
  description: string;
}

/**
 * 기사 제목, 카테고리, 본문 키워드를 분석하여 신뢰할 수 있는 공식 정부/공공기관 접수처 외부 URL 매핑
 * 
 * 1. 소상공인 정책자금 / 소진공 관련 기사: https://ols.semas.or.kr (소상공인정책자금 누리집)
 * 2. 기업 지원 / 보조금 / R&D 관련 기사: https://www.bizinfo.go.kr (중소벤처기업부 기업마당)
 * 3. 청년 / 복지 / 일반 행정 정책 기사: https://www.gov.kr (정부24 포털)
 * 4. 그 외 일반 정책: 원문 출처(sourceUrl)가 공공기관 도메인(.go.kr, .or.kr)이면 해당 링크, 아닐 경우 https://www.gov.kr
 */
export function resolveOfficialDestination(
  title: string,
  category: string,
  sourceUrl?: string | null,
  content?: string | null
): OfficialDestination {
  const cleanTitle = (title || "").toLowerCase();
  const combined = `${title} ${category} ${sourceUrl || ""} ${content || ""}`.toLowerCase();

  // 1단계: 제목(title) 우선 판별 (기사의 핵심 의제와 타깃이 가장 명확한 곳)
  if (
    /소상공인|소진공|소상공인시장진흥공단|자영업|골목상권|희망리턴|새출발기금|일반경영안정자금|노란우산|semas\.or\.kr/i.test(
      cleanTitle
    )
  ) {
    return {
      url: "https://ols.semas.or.kr",
      buttonText: "[공식 접수처] 소상공인정책자금 누리집 바로가기 ↗",
      agencyName: "소상공인정책자금",
      description:
        "자격 요건 충족 여부 모의 조회 및 정식 온라인 신청·접수는 중소벤처기업부 산하 소상공인정책자금 공식 누리집에서 안전하게 진행하실 수 있습니다.",
    };
  }

  if (
    /중소기업|스타트업|벤처기업|기업\s*지원|r&d|연구개발|기술개발|스마트공장|수출바우처|기업마당|고효율\s*설비|산업단지|bizinfo\.go\.kr/i.test(
      cleanTitle
    )
  ) {
    return {
      url: "https://www.bizinfo.go.kr",
      buttonText: "[공식 접수처] 중소벤처기업부 기업마당 바로가기 ↗",
      agencyName: "중소벤처기업부 기업마당",
      description:
        "중소기업·벤처기업 지원사업 및 정책 보조금 상세 공고 조회와 정식 온라인 접수는 기업마당 공식 포털에서 안전하게 진행하실 수 있습니다.",
    };
  }

  if (
    /청년|도약계좌|주택드림|청약통장|청약|복지|기초연금|부모급여|아동수당|국민취업지원|내일배움|일반\s*행정|행정\s*정책/i.test(
      cleanTitle
    )
  ) {
    return {
      url: "https://www.gov.kr",
      buttonText: "[공식 접수처] 정부24 바로가기 ↗",
      agencyName: "대한민국 정부24",
      description:
        "자격 요건 확인 및 정식 온라인 민원 신청·접수는 대한민국 정부 공식 포털 정부24에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // 2단계: 본문 및 메타데이터 종합 판별
  if (
    /소상공인|소진공|소상공인시장진흥공단|자영업|골목상권|희망리턴|새출발기금|semas\.or\.kr/i.test(
      combined
    )
  ) {
    return {
      url: "https://ols.semas.or.kr",
      buttonText: "[공식 접수처] 소상공인정책자금 누리집 바로가기 ↗",
      agencyName: "소상공인정책자금",
      description:
        "자격 요건 충족 여부 모의 조회 및 정식 온라인 신청·접수는 중소벤처기업부 산하 소상공인정책자금 공식 누리집에서 안전하게 진행하실 수 있습니다.",
    };
  }

  if (
    /중소기업|스타트업|벤처기업|기업\s*지원|r&d|연구개발|기술개발|스마트공장|수출바우처|기업마당|bizinfo\.go\.kr/i.test(
      combined
    )
  ) {
    return {
      url: "https://www.bizinfo.go.kr",
      buttonText: "[공식 접수처] 중소벤처기업부 기업마당 바로가기 ↗",
      agencyName: "중소벤처기업부 기업마당",
      description:
        "중소기업·벤처기업 지원사업 및 정책 보조금 상세 공고 조회와 정식 온라인 접수는 기업마당 공식 포털에서 안전하게 진행하실 수 있습니다.",
    };
  }

  if (
    /청년|도약계좌|주택드림|복지|보조금|장려금|기초연금|부모급여|아동수당|취업지원|내일배움/i.test(
      combined
    )
  ) {
    return {
      url: "https://www.gov.kr",
      buttonText: "[공식 접수처] 정부24 바로가기 ↗",
      agencyName: "대한민국 정부24",
      description:
        "자격 요건 확인 및 정식 온라인 민원 신청·접수는 대한민국 정부 공식 포털 정부24에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // 3단계: 원문 출처 링크(source_url)가 공공기관 도메인(.go.kr, .or.kr)인 경우 해당 원문 링크로 연결
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl.trim())) {
    try {
      const parsed = new URL(sourceUrl.trim());
      const host = parsed.hostname.toLowerCase();
      if (host.endsWith(".go.kr") || host.endsWith(".or.kr")) {
        const sourceName = getSourceDisplayName(sourceUrl, title, category);
        return {
          url: sourceUrl.trim(),
          buttonText: `[공식 접수처] ${sourceName} 바로가기 ↗`,
          agencyName: sourceName,
          description:
            "세부 자격 요건 확인 및 공식 온라인 신청·접수는 주관 공공기관 공식 누리집에서 안전하게 진행하실 수 있습니다.",
        };
      }
    } catch {
      // URL 파싱 오류 시 기본값으로 진행
    }
  }

  // 기본값: https://www.gov.kr
  return {
    url: "https://www.gov.kr",
    buttonText: "[공식 접수처] 정부24 바로가기 ↗",
    agencyName: "대한민국 정부24",
    description:
      "지원 자격 확인 및 온라인 민원 신청·접수는 대한민국 정부 공식 포털 정부24에서 안전하게 진행하실 수 있습니다.",
  };
}

/**
 * 기사 성격별 스마트 조건부 CTA 콜아웃 컴포넌트 (Smart Conditional CTA)
 */
export default function OfficialCtaCard({
  sourceUrl,
  title,
  category,
  content,
  ctaType = "general",
}: OfficialCtaCardProps) {
  const sourceName = getSourceDisplayName(sourceUrl, title, category);
  const isValidUrl = Boolean(sourceUrl && /^https?:\/\//i.test(sourceUrl.trim()));

  // 정부/공공기관 공식 접수처 외부 URL 및 버튼 문구 판별
  const officialTarget = resolveOfficialDestination(title, category, sourceUrl, content);

  const isSubsidy = ctaType === "subsidy";

  // 1. URL이 유효하지 않고 일반 기사(general)인 경우의 안전 장치
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

  // 2. [subsidy] 지원금, 보조금, 청약, 소상공인 정책자금 등 실제 신청/접수가 수반되는 기사 (파란색 하이라이트 CTA)
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
              <span>공식 접수처 안내</span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {officialTarget.agencyName} 공식 접수 및 지원 신청
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-lg font-medium">
              {officialTarget.description}
            </p>
          </div>

          {/* 우측 High-CTR 강조 CTA 액션 버튼: 외부 정규 URL 새 창 열기 */}
          <div className="shrink-0 pt-1 sm:pt-0">
            <a
              href={officialTarget.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <span className="text-base">👉</span>
              <span>{officialTarget.buttonText}</span>
            </a>
          </div>
        </div>

        {/* 하단 신뢰 및 보안 안내 라인 */}
        <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center gap-2 text-[11px] text-slate-600 font-medium">
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

  // 3. [general] 일반 경제, 금리, 환율, 증시, 테크 등 단순 보도 기사
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

        {/* 우측 저널리즘 링크 CTA 버튼 */}
        <div className="shrink-0 pt-1 sm:pt-0">
          <a
            href={officialTarget.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            <span>👉 공식 보도자료 원문 및 상세 출처 확인 ↗</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
