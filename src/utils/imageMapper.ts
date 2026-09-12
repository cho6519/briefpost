/**
 * ==============================================================================
 * [한국형 일상·공공 테마 상업용 무료 실사 이미지 딕셔너리 및 테마 매퍼]
 * - AI가 생성한 어색하고 왜곡된 이미지 배제
 * - Unsplash의 검증된 고화질 상업용 무료 실사 스톡 사진 풀 (HTTP 200 검증 완료)
 * - 카테고리/키워드별 테마 매핑 (housing, finance, youth, policy, general)
 * - 기존 발행 기사(imageTheme 누락) 대상 100% 실사 스톡 폴백 자동 매칭
 * ==============================================================================
 */

export type ImageTheme = "housing" | "finance" | "youth" | "policy" | "general";

export interface StockImageItem {
  url: string;
  caption: string;
  description: string;
}

/**
 * 테마별 검증된 고화질 실사 스톡 이미지 풀 (Unsplash)
 */
export const STOCK_IMAGE_POOL: Record<ImageTheme, StockImageItem[]> = {
  // 1. 부동산·주거 테마 (한국 아파트 단지 전경, 열쇠, 계약서 서명 등)
  housing: [
    {
      url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대식 아파트 주거 단지 전경",
    },
    {
      url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "내 집 마련 및 주택 열쇠",
    },
    {
      url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "부동산 및 주택 분양 계약서 서명",
    },
    {
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "도심 주거 환경 및 신축 단지",
    },
  ],

  // 2. 금융·경제·지원금 테마 (신용카드 결제, 계산기, 모바일 뱅킹 화면, 금융 지표 등)
  finance: [
    {
      url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "금융 지표 분석 및 경제 계획",
    },
    {
      url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "계산기 및 자금 계획 수립",
    },
    {
      url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트폰 모바일 뱅킹 및 금융 앱",
    },
    {
      url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "저축, 적금 및 자산 형성 지원",
    },
    {
      url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "경제 지표 및 시장 동향 차트",
    },
  ],

  // 3. 청년·취업 테마 (카페에서 노트북/서류를 검토하는 청년, 도서관, 협업 등)
  youth: [
    {
      url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "청년들의 스터디 및 협업 논의",
    },
    {
      url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트 워크스페이스에서 작업 중인 청년",
    },
    {
      url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "취업 준비 및 비즈니스 미팅",
    },
    {
      url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 도서관 및 학업 환경",
    },
  ],

  // 4. 정책·일반·공공 테마 (정부청사/관공서 외관, 공식 회의실 브리핑, 공공 사업 등)
  policy: [
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대식 관공서 및 공공 복합 행정 타운",
    },
    {
      url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "정부 공식 브리핑 및 정책 발표 현장",
    },
    {
      url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "제도 및 지원 정책 기획 검토",
    },
    {
      url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "공공 대국민 설명회 및 지원 사업 안내",
    },
  ],

  // 5. 일반·테크·사회 테마 (테크·IT, 디지털, 사회·문화 및 일반 공공/경제 인프라)
  general: [
    {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "첨단 테크놀로지 및 디지털 하드웨어",
    },
    {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "글로벌 IT 네트워크 및 데이터 혁신",
    },
    {
      url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "스마트 워크스페이스 및 테크 환경",
    },
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      caption: "사진: Unsplash / 공공 포털 참고",
      description: "현대식 도심 전경 및 사회 인프라",
    },
  ],
};

/**
 * 기사의 imageTheme, 카테고리, 제목, 본문 키워드를 분석하여 최적의 실사 이미지 테마를 판별 (강력한 폴백 지원)
 * - 기사 데이터에 imageTheme 값이 비어있는 기존 글 대응:
 *   - '부동산·세제' ➔ housing
 *   - '금융·경제' ➔ finance
 *   - '정책·지원금' ➔ policy (또는 청년 키워드 시 youth)
 *   - '테크·IT' ➔ general
 *   - '사회·문화' ➔ general
 *   - 카테고리도 모호할 경우 ➔ policy (기본 공공/경제 대표 테마)
 */
export function detectImageTheme(
  themeInput?: string | null,
  category?: string,
  title?: string,
  content?: string
): ImageTheme {
  // 1. 이미 유효한 테마가 지정되어 있다면 최우선 적용
  const normalized = (themeInput || "").toLowerCase().trim();
  if (
    normalized === "housing" ||
    normalized === "finance" ||
    normalized === "youth" ||
    normalized === "policy" ||
    normalized === "general"
  ) {
    return normalized as ImageTheme;
  }

  const cat = (category || "").trim();
  const textCombined = `${title || ""} ${content?.slice(0, 500) || ""}`.toLowerCase();

  // 2. 제목/본문에 청년/취업 명시적 키워드가 있는 경우 최우선 'youth' 매핑
  if (/청년|취업|구직|인턴|면접|대학생|사회초년생|일자리|도약장려금|역량강화/i.test(textCombined)) {
    return "youth";
  }

  // 3. 기사의 카테고리 기반 표준 폴백 매핑
  if (/부동산|세제|주택|아파트|청약|전세|월세|분양/i.test(cat)) {
    return "housing";
  }

  if (/금융|경제|증시|금리|대출|환율|투자|은행/i.test(cat)) {
    return "finance";
  }

  if (/정책|지원금|복지|보조금|행정/i.test(cat)) {
    return "policy";
  }

  if (/테크|it|tech|ai|기술|소프트웨어|과학|게임|모바일/i.test(cat)) {
    return "general";
  }

  if (/사회|문화|생활|환경|교육/i.test(cat)) {
    return "general";
  }

  // 4. 카테고리가 없는 경우 제목/본문 내용 키워드로 2차 판별
  if (/주택|아파트|청약|전세|월세|부동산|분양|주거|임대|디딤돌|버팀목/i.test(textCombined)) {
    return "housing";
  }

  if (/금융|금리|환율|대출|예금|적금|증시|주식|세금|환급|연말정산|바우처|비용|소득|자금|이자/i.test(textCombined)) {
    return "finance";
  }

  if (/테크|기술|소프트웨어|인공지능|ai|반도체|플랫폼|하드웨어|로봇/i.test(textCombined)) {
    return "general";
  }

  // 5. 카테고리도 모호할 경우 기본 공공/경제 테마 대표 이미지(policy)로 완벽 폴백
  return "policy";
}

/**
 * 기사에 맞는 실사 스톡 이미지 항목 반환
 * - 제목 기반 해시를 적용하여 동일 기사는 항상 동일한 고화질 실사 썸네일 유지
 */
export function getStockImage(
  themeInput?: string | null,
  title: string = "",
  category?: string,
  content?: string
): StockImageItem & { theme: ImageTheme } {
  const theme = detectImageTheme(themeInput, category, title, content);
  const pool = STOCK_IMAGE_POOL[theme] || STOCK_IMAGE_POOL.policy;

  // 결정론적 인덱스 산출 (글 제목 기반 해시)
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  const item = pool[index];

  return {
    ...item,
    theme,
  };
}
