import React from "react";

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
 * 기사 본문(content) 내용을 최우선 분석하여, 본문에 실제로 언급된 공식 접수처 및 신청 누리집 URL 매핑
 * - 본문에 온라인 접수처/신청 사이트가 없거나 현장 방문/입법 단계인 경우 null 반환
 * - 오직 정책·지원금 카테고리에서만 동작
 */
export function resolveOfficialDestination(
  title: string,
  category: string,
  sourceUrl?: string | null,
  content?: string | null
): OfficialDestination | null {
  const isPolicyCategory =
    category === "정책·지원금" || category?.includes("정책") || category?.includes("지원금");

  // 정책·지원금 카테고리가 아니면 무조건 null (공식신청 카드 노출 차단)
  if (!isPolicyCategory) {
    return null;
  }

  const rawContent = content || "";
  const cleanTitle = (title || "").toLowerCase();
  const lowerContent = rawContent.toLowerCase();

  // 1. 본문에 온라인 신청이 아닌 '현장 방문/상담'만 있거나, 대형 산업 재편/입법 제안 등 개인 신청 접수가 없는 경우 검출
  const isOnlyOfflineOrInquiry =
    /현장\s*(방문|상담|부스)|당일\s*현장|별도의\s*사전\s*예약\s*없이/i.test(rawContent) &&
    !/온라인\s*(신청|접수)|누리집.*접수|포털.*신청/i.test(rawContent);

  const hasNoApplicationContext =
    /사업재편\s*1호|대미투자|입법\s*완료\s*후|정책\s*방향을\s*제안한\s*초기\s*단계/i.test(rawContent) &&
    !/공식\s*신청|온라인\s*접수처|접수처:/i.test(rawContent);

  if (isOnlyOfflineOrInquiry || hasNoApplicationContext) {
    return null;
  }

  // 2. 본문 마크다운 내 직접 기재된 공공/정부 공식 링크 [접수처](URL) 추출
  const mdLinkRegex =
    /\[([^\]]*(?:신청|접수|누리집|홈페이지|포털|바로가기|공식|정부24|복지로|소진공|기업마당|온통청년)[^\]]*)\]\((https?:\/\/[^\s\)]+)\)/gi;
  const mdMatch = mdLinkRegex.exec(rawContent);
  if (mdMatch) {
    const linkText = mdMatch[1].trim();
    const linkUrl = mdMatch[2].trim();
    if (/\.(go\.kr|or\.kr|kr)/i.test(linkUrl)) {
      return {
        url: linkUrl,
        buttonText: `[공식 접수처] ${linkText} 바로가기 ↗`,
        agencyName: linkText,
        description: `본문 안내에 명시된 공식 온라인 접수 누리집(${linkUrl})으로 안전하게 바로 연결됩니다.`,
      };
    }
  }

  // 3. 본문 내용 기반 정밀 기관/시스템 매핑 (우선순위: 본문에 명시된 구체적인 전용 접수처)

  // (1) 스마트공장 사업관리시스템 (smart-factory.kr)
  if (/smart-factory\.kr|스마트공장/i.test(lowerContent)) {
    return {
      url: "https://www.smart-factory.kr",
      buttonText: "[공식 접수처] 스마트공장 사업관리시스템 바로가기 ↗",
      agencyName: "스마트공장 사업관리시스템",
      description:
        "중소기업 스마트공장 구축 및 고효율 설비 지원사업 온라인 신청·접수는 스마트공장 사업관리시스템 공식 포털에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (2) 서울시 청년몽땅정보통 (youth.seoul.go.kr)
  if (/청년몽땅정보통|youth\.seoul\.go\.kr/i.test(lowerContent)) {
    return {
      url: "https://youth.seoul.go.kr",
      buttonText: "[공식 접수처] 서울시 청년몽땅정보통 바로가기 ↗",
      agencyName: "서울시 청년몽땅정보통",
      description:
        "서울시 청년 복지·문화 혜택 자격 조회 및 정식 온라인 신청·접수는 서울시 청년 종합 플랫폼 청년몽땅정보통에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (3) 서민금융진흥원 (청년도약계좌 등)
  if (
    /서민금융진흥원|청년도약계좌|kinfa\.or\.kr/i.test(lowerContent) ||
    /도약계좌/i.test(cleanTitle)
  ) {
    return {
      url: "https://www.kinfa.or.kr",
      buttonText: "[공식 접수처] 서민금융진흥원 누리집 바로가기 ↗",
      agencyName: "서민금융진흥원 (청년도약계좌)",
      description:
        "자격 요건 충족 여부 모의 조회 및 정부 기여금 온라인 신청은 서민금융진흥원 및 협약 시중은행 비대면 포털에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (4) 온통청년 (고용노동부 청년포털)
  if (/온통청년|youthcenter\.go\.kr/i.test(lowerContent)) {
    return {
      url: "https://www.youthcenter.go.kr",
      buttonText: "[공식 접수처] 온통청년 포털 바로가기 ↗",
      agencyName: "온통청년 (청년포털)",
      description:
        "청년 맞춤형 종합 정책 혜택 조회 및 세부 사업 온라인 신청은 대한민국 청년포털 온통청년에서 바로 진행하실 수 있습니다.",
    };
  }

  // (5) 소상공인정책자금 (소진공 누리집 ols.semas.or.kr)
  if (
    /ols\.semas\.or\.kr|소상공인정책자금\s*누리집|소상공인시장진흥공단|소진공/i.test(lowerContent) ||
    /소상공인|소진공/i.test(cleanTitle)
  ) {
    return {
      url: "https://ols.semas.or.kr",
      buttonText: "[공식 접수처] 소상공인정책자금 누리집 바로가기 ↗",
      agencyName: "소상공인정책자금 (소진공)",
      description:
        "자격 요건 충족 여부 모의 조회 및 정식 온라인 신청·접수는 중소벤처기업부 산하 소상공인정책자금 공식 누리집에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (6) 중소벤처기업부 기업마당 (bizinfo.go.kr)
  if (/bizinfo\.go\.kr|기업마당/i.test(lowerContent)) {
    return {
      url: "https://www.bizinfo.go.kr",
      buttonText: "[공식 접수처] 중소벤처기업부 기업마당 바로가기 ↗",
      agencyName: "중소벤처기업부 기업마당",
      description:
        "중소기업·벤처기업 지원사업 및 정책 보조금 상세 공고 조회와 정식 온라인 접수는 기업마당 공식 포털에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (7) 보건복지부 복지로 (bokjiro.go.kr)
  if (/복지로|bokjiro\.go\.kr/i.test(lowerContent)) {
    return {
      url: "https://www.bokjiro.go.kr",
      buttonText: "[공식 접수처] 보건복지부 복지로 바로가기 ↗",
      agencyName: "보건복지부 복지로",
      description:
        "사회복지 혜택 및 보조금 온라인 신청·접수는 대한민국 복지 포털 복지로에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (8) LH 청약플러스 / 주택도시기금 (청약, 주택드림 등)
  if (
    /청약통장|주택드림|주택도시기금|청약플러스|apply\.lh\.or\.kr/i.test(lowerContent) ||
    /청약|주택드림/i.test(cleanTitle)
  ) {
    return {
      url: "https://apply.lh.or.kr",
      buttonText: "[공식 접수처] LH 청약플러스 누리집 바로가기 ↗",
      agencyName: "LH 청약플러스 / 주택도시기금",
      description:
        "청약 자격 확인 및 청년 주택드림 통장·공공분양 세부 접수는 LH 청약플러스 및 주택도시기금 공식 포털에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (9) 고용24 (work24.go.kr)
  if (/고용24|work24\.go\.kr|내일배움카드|국민취업지원제도/i.test(lowerContent)) {
    return {
      url: "https://www.work24.go.kr",
      buttonText: "[공식 접수처] 고용노동부 고용24 바로가기 ↗",
      agencyName: "고용노동부 고용24",
      description:
        "취업지원금 및 직무역량 바우처 온라인 신청은 고용노동부 공식 포털 고용24에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // (10) 대한민국 정부24 (gov.kr)
  if (/정부24|gov\.kr|보조금24/i.test(lowerContent)) {
    return {
      url: "https://www.gov.kr",
      buttonText: "[공식 접수처] 정부24 바로가기 ↗",
      agencyName: "대한민국 정부24",
      description:
        "지원 자격 확인 및 온라인 민원 신청·접수는 대한민국 정부 공식 포털 정부24에서 안전하게 진행하실 수 있습니다.",
    };
  }

  // 본문에서 위 공공 접수처 중 아무것도 확인되지 않는 정책 기사는 억지로 띄우지 않고 미노출
  return null;
}

/**
 * 기사 본문 기반 공식 접수처 안내 스마트 CTA 콜아웃 컴포넌트
 */
export default function OfficialCtaCard({
  sourceUrl,
  title,
  category,
  content,
}: OfficialCtaCardProps) {
  // 1. 정책·지원금 카테고리 여부 검사
  const isPolicyCategory =
    category === "정책·지원금" || category?.includes("정책") || category?.includes("지원금");

  if (!isPolicyCategory) {
    return null;
  }

  // 2. 기사 본문(content) 내용을 최우선 분석하여 본문에 실제 언급된 공식 접수처 추출
  const officialTarget = resolveOfficialDestination(title, category, sourceUrl, content);

  // 본문에 실제 온라인 접수처가 명시되지 않은 경우(현장 방문 전용, 입법 단계 등) 카드 미노출
  if (!officialTarget) {
    return null;
  }

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
          기사 본문에 안내된 공식 정부 포털 및 안전 접수처 웹사이트({officialTarget.agencyName})로 새 창에서 직접 연결됩니다.
        </span>
      </div>
    </aside>
  );
}
