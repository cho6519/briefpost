/**
 * 카드뉴스 전용 핵심 키워드 타이틀 및 서브 캐치프레이즈 추출기
 * 상세 페이지 본문 타이틀(h1)과의 텍스트 중복을 완벽히 제거하고 프리미엄 브리핑 룩앤필 제공
 */

export interface CardHeadlineInfo {
  keywordTitle: string;    // 카드 중앙 대형 메인 키워드 타이틀 (12~28자 내외의 정제된 타이틀)
  subCatchphrase: string;  // 상단/중앙 보조 캐치프레이즈 (예: "소상공인 정책자금 긴급 브리핑", "2026년 정부 지원 사업 안내")
}

/**
 * 텍스트에서 언론사명, 불완전한 따옴표, 괄호 등 불필요한 노이즈 정제
 */
function cleanRawTitle(title: string): string {
  let cleaned = title
    .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
    .replace(/\s*(?:Martin Cid Magazine|위키트리|연합뉴스|뉴시스|머니투데이|한국경제|매일경제|조선일보|동아일보|중앙일보)\s*$/gi, "")
    .replace(/\s*\([^)]*\)\s*$/g, "") // 끝에 붙은 괄호 제거
    .replace(/\s*\[[^\]]*\]\s*$/g, "") // 끝에 붙은 대괄호 제거
    .replace(/\.{2,}[^\n]*$/g, "")
    .replace(/…[^\n]*$/g, "")
    .replace(/[:\-–—]\s*$/, "")
    .replace(/[“"']/g, "") // 따옴표 잔여물 제거
    .trim();

  return cleaned;
}

/**
 * 카테고리 및 기사 내용 기반 세련된 서브 캐치프레이즈(Eyebrow) 결정
 */
export function determineSubCatchphrase(title: string, category: string): string {
  const cat = category || "";
  const t = title || "";

  // 1. 소상공인 / 정책자금 / 정부 보조금
  if (/소상공인|자영업|소진공/.test(t)) {
    if (/긴급|경영애로|안정|위기|재기/.test(t)) {
      return "소상공인 정책자금 긴급 브리핑";
    }
    return "2026년 정부 지원 사업 안내";
  }

  if (/지원금|보조금|바우처|환급|장려금|지원 사업|지원사업/.test(t)) {
    return "2026년 정부 지원 사업 안내";
  }

  // 2. 청년 / 주거 / 복지
  if (/청년|신혼|주택드림|월세|주거|청약|전세/.test(t)) {
    return "청년·서민 주거 정책 종합 가이드";
  }

  if (/혼인|결혼|출산|육아|부모급여|아동수당/.test(t)) {
    return "생애주기별 맞춤 복지 혜택 안내";
  }

  // 3. 테크 / AI / 반도체
  if (cat.includes("테크") || cat.includes("IT") || /AI|딥마인드|구글|애플|반도체|로봇|크롬|픽셀/.test(t)) {
    if (/AI|에이전트|LLM|모델|생성형/.test(t)) {
      return "차세대 AI & 미래 테크 브리핑";
    }
    if (/반도체|공급망|웨이퍼|칩/.test(t)) {
      return "글로벌 반도체 & 산업 동향 브리핑";
    }
    return "글로벌 IT·테크 트렌드 리포트";
  }

  // 4. 금융 / 경제 / 부동산
  if (cat.includes("금융") || cat.includes("경제") || /금리|환율|물가|증시|채권|주식/.test(t)) {
    return "금융 시장 & 거시 경제 브리핑";
  }

  if (cat.includes("부동산") || /아파트|분양|부동산|세제|취득세|종부세/.test(t)) {
    return "부동산 시장 동향 & 세제 가이드";
  }

  // 5. 사회 / 문화 / 시사
  if (cat.includes("사회") || cat.includes("문화")) {
    return "사회·문화 주요 현안 심층 브리핑";
  }

  if (cat.includes("정치") || /정부|부처|국회|법무부/.test(t)) {
    return "주요 제도 & 정책 변화 브리핑";
  }

  return "Brief Post 핵심 정책 브리핑";
}

/**
 * 긴 본문 제목에서 핵심 키워드 타이틀(12~26자) 추출
 */
export function extractKeywordTitle(title: string): string {
  const cleaned = cleanRawTitle(title);

  // 1. 대표 패턴 맞춤 압축
  if (cleaned.includes("일반경영안정자금")) {
    return "소상공인 일반경영안정자금 접수";
  }
  if (cleaned.includes("청년 주택드림")) {
    return "청년 주택드림 청약통장 안내";
  }
  if (cleaned.includes("혼인지원금")) {
    return "혼인지원금 지급 기준 및 자격 안내";
  }
  if (cleaned.includes("에이전트 AI 프레임워크")) {
    return "구글 딥마인드 차세대 에이전트 AI";
  }
  if (cleaned.includes("글로벌 테크 트렌드")) {
    return "2026 글로벌 테크 트렌드 전망";
  }
  if (cleaned.includes("반도체 공급망")) {
    return "글로벌 반도체 공급망 재편 전망";
  }
  if (cleaned.includes("제로데이")) {
    return "구글 크롬 제로데이 취약점 긴급 패치";
  }
  if (cleaned.includes("픽셀워치5")) {
    return "구글 픽셀워치5 수리 편의성 분석";
  }
  if (cleaned.includes("watchOS 27")) {
    return "애플워치 watchOS 27 주요 개편 사항";
  }
  if (cleaned.includes("불법체류")) {
    return "美 법무부 복지지원금 중단 경고";
  }

  // 2. 구분 기호(: / – - 등) 기준으로 의미 있는 파트 선택
  const splitDelimiters = [":", " – ", " - ", "…", " / "];
  for (const delim of splitDelimiters) {
    if (cleaned.includes(delim)) {
      const parts = cleaned.split(delim).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (parts[0].length >= 10 && parts[0].length <= 26) {
          return parts[0];
        }
        if (parts[1].length >= 10 && parts[1].length <= 26) {
          return parts[1];
        }
        if (parts[0].length <= 30) {
          return parts[0];
        }
      }
    }
  }

  // 3. 문장이 긴 경우(28자 초과), 자연스러운 어절 단위로 자르기
  if (cleaned.length > 28) {
    const shortened = cleaned
      .replace(/^소상공인시장진흥공단\s*/, "소진공 ")
      .replace(/^중소벤처기업부\s*/, "중기부 ")
      .replace(/^과학기술정보통신부\s*/, "과기정통부 ");

    const words = shortened.split(" ");
    let result = "";
    for (const w of words) {
      if ((result + " " + w).trim().length <= 25) {
        result = (result + " " + w).trim();
      } else {
        break;
      }
    }

    if (result.length >= 10) {
      return result;
    }
  }

  return cleaned;
}

/**
 * 메인 카드뉴스 헤드라인 및 서브 캐치프레이즈 종합 생성
 */
export function generateCardCatchphrase(
  title: string,
  category?: string | null
): CardHeadlineInfo {
  const cat = category || "정책·지원금";
  const subCatchphrase = determineSubCatchphrase(title, cat);
  const keywordTitle = extractKeywordTitle(title);

  return {
    keywordTitle,
    subCatchphrase,
  };
}
