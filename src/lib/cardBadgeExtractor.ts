/**
 * 카드뉴스 인포그래픽 하이라이트 배지 추출 유틸리티
 */

export interface CardBadgeInfo {
  badgeText: string;
  subText?: string;
  isSubsidy: boolean;
}

export function extractCardBadge(
  title: string,
  content?: string | null,
  category?: string | null,
  existingBadge?: string | null
): CardBadgeInfo {
  if (existingBadge && existingBadge.trim()) {
    return {
      badgeText: existingBadge.trim(),
      isSubsidy: true,
    };
  }

  const combinedText = `${title} ${content || ""}`;
  const cat = category || "";
  const isSmallBizOrSubsidy =
    cat.includes("소상공인") ||
    cat.includes("지원금") ||
    cat.includes("정책") ||
    /소상공인|자영업자|지원금|정책자금|보조금|바우처|대출|환급|장려금/.test(title);

  // 1. 금액 패턴 감지 (예: 최대 1억~2억 원, 최대 7,000만 원, 지원금 100만 원 등)
  const amountPatterns = [
    /최대\s*([0-9,]+(?:\s*억|\s*천만|\s*백만|\s*만)?(?:\s*~\s*[0-9,]+)?\s*원)/,
    /(?:지원금|지원|수당|보조금|정책자금)\s*([0-9,]+(?:\s*억|\s*천만|\s*백만|\s*만)?\s*원)/,
    /([0-9,]+(?:\s*억|\s*천만|\s*백만|\s*만)?(?:\s*~\s*[0-9,]+)?\s*원\s*(?:지원|지급|대출|환급|바우처))/,
    /([0-9,]+(?:\s*억|\s*천만|\s*백만|\s*만)?\s*원)/,
    /연\s*([0-9.]+%[대]?\s*(?:저리|우대|정책)?[금리]?)/,
  ];

  for (const pattern of amountPatterns) {
    const match = combinedText.match(pattern);
    if (match && match[0]) {
      const cleanMatch = match[0].trim().slice(0, 30);
      return {
        badgeText: `💰 핵심 지원: ${cleanMatch}`,
        subText: "소상공인·국민 맞춤 정책 가이드",
        isSubsidy: true,
      };
    }
  }

  // 2. 정책/지원금이지만 구체적 금액이 특정되지 않은 경우
  if (isSmallBizOrSubsidy) {
    if (cat.includes("소상공인") || title.includes("소상공인") || title.includes("소진공")) {
      return {
        badgeText: "💰 2026 소상공인 우대 정책자금",
        subText: "저리 융자 및 경영안정 종합 지원",
        isSubsidy: true,
      };
    }
    return {
      badgeText: "📋 정부 맞춤형 정책 지원 가이드",
      subText: "자격 요건 및 비대면 온라인 신청 안내",
      isSubsidy: true,
    };
  }

  // 3. 카테고리별 특화 시사/분석 배지
  if (cat.includes("정치") || cat.includes("사회")) {
    return {
      badgeText: "⚡ Brief Post 핵심 쟁점 심층 브리핑",
      subText: "주요 배경 및 각계 반응 총정리",
      isSubsidy: false,
    };
  }

  if (cat.includes("테크") || cat.includes("IT")) {
    return {
      badgeText: "💻 TECH INSIGHT • 핵심 기술 동향",
      subText: "산업 및 시장 파급 효과 분석",
      isSubsidy: false,
    };
  }

  if (cat.includes("금융") || cat.includes("경제")) {
    return {
      badgeText: "📈 MARKET BRIEF • 경제 핵심 지표",
      subText: "금리·물가·금융 정책 분석",
      isSubsidy: false,
    };
  }

  if (cat.includes("부동산") || cat.includes("세제")) {
    return {
      badgeText: "🏠 부동산·세제 정책 핵심 체크",
      subText: "청약·세제 개편 및 시장 영향 분석",
      isSubsidy: false,
    };
  }

  return {
    badgeText: "📌 Brief Post 1단 요약 뉴스레터",
    subText: "3줄 핵심 요약 & 심층 배경 브리핑",
    isSubsidy: false,
  };
}
