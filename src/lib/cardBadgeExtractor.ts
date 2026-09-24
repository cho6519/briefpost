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

  // 0. 타깃 대상(수혜자) 패턴 우선 감지 (핵심 타깃 뱃지)
  const targetPatterns = [
    { regex: /소상공인|자영업자|소진공|골목상권|전통시장/, text: "💡 핵심 지원 대상: 소상공인 및 골목상권 자영업자" },
    { regex: /만\s*19.*34|청년|대학생|취업준비생|구직단념/, text: "💡 핵심 지원 대상: 만 19~34세 청년 및 구직자" },
    { regex: /중소기업|벤처기업|스타트업/, text: "💡 핵심 지원 대상: 중소·벤처기업 및 재직 근로자" },
    { regex: /신혼부부|출산|임산부|영유아|다자녀/, text: "💡 핵심 지원 대상: 신혼부부 및 다자녀·출산 가구" },
    { regex: /무주택|청약|임차인|세입자|전세/, text: "💡 핵심 지원 대상: 무주택 세대주 및 실수요자" },
    { regex: /어르신|고령자|노인|시니어|연금/, text: "💡 핵심 지원 대상: 만 65세 이상 고령자 및 연금 수급자" },
    { regex: /취약계층|기초생활|차상위|한부모|장애인/, text: "💡 핵심 지원 대상: 취약계층 및 기초생활수급 가구" },
  ];

  for (const item of targetPatterns) {
    if (item.regex.test(combinedText)) {
      return {
        badgeText: item.text,
        subText: "신청 자격 요건 및 맞춤 혜택 가이드",
        isSubsidy: isSmallBizOrSubsidy,
      };
    }
  }

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
        badgeText: `💡 핵심 지원 대상: ${cleanMatch} 혜택 대상자`,
        subText: "소상공인·국민 맞춤 정책 가이드",
        isSubsidy: true,
      };
    }
  }

  // 2. 정책/지원금이지만 구체적 금액이 특정되지 않은 경우
  if (isSmallBizOrSubsidy) {
    if (cat.includes("소상공인") || title.includes("소상공인") || title.includes("소진공")) {
      return {
        badgeText: "💡 핵심 지원 대상: 경영 애로 소상공인·자영업자",
        subText: "저리 융자 및 경영안정 종합 지원",
        isSubsidy: true,
      };
    }
    return {
      badgeText: "💡 핵심 지원 대상: 정부 정책 지원 대상 국민 및 기업",
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
    badgeText: "📌 Brief Post 공공.경제 정책 전문 브리핑",
    subText: "3줄 핵심 요약 & 심층 배경 브리핑",
    isSubsidy: false,
  };
}
