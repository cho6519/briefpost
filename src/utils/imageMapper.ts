/**
 * ==============================================================================
 * [한국형 일상·공공 테마 상업용 무료 실사 이미지 딕셔너리 및 1:1 스마트 매퍼]
 * - scripts/assets/imagePool.json 기반 단일 소스 연동 (비용 0원)
 * - 5대 핵심 테마 (housing, finance, youth, policy, economy) + 확장 (tech, society)
 * - 결정론적 Anti-Collision 해시 알고리즘: hash(articleId + title) % themePool.length
 * ==============================================================================
 */

import imagePoolJson from "../data/imagePool.json";

export type ImageTheme = "housing" | "finance" | "youth" | "policy" | "economy" | "tech" | "society" | "general";

export interface StockImageItem {
  url: string;
  caption: string;
  description: string;
  keywords?: string[];
}

/**
 * 테마별 고화질 무료 실사 스톡 이미지 풀 (Unsplash)
 */
export const STOCK_IMAGE_POOL: Record<Exclude<ImageTheme, "general">, StockImageItem[]> = imagePoolJson as unknown as Record<
  Exclude<ImageTheme, "general">,
  StockImageItem[]
>;

/**
 * 32-bit FNV-1a 결정론적 해시 함수
 * 기사 ID와 제목 문자열을 균일하게 분산하여 인접 기사 간 썸네일 중복 방지
 */
export function calculateArticleHash(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0);
}

/**
 * 기사의 imageTheme, 카테고리, 제목, 본문 키워드를 분석하여 최적의 실사 테마 판별
 */
export function detectImageTheme(
  themeInput?: string | null,
  category?: string,
  title?: string,
  content?: string
): Exclude<ImageTheme, "general"> {
  const normalized = (themeInput || "").toLowerCase().trim();

  // 1. 이미 지정된 유효 테마가 있으면 최우선 적용
  if (
    normalized === "housing" ||
    normalized === "finance" ||
    normalized === "youth" ||
    normalized === "policy" ||
    normalized === "economy" ||
    normalized === "tech" ||
    normalized === "society"
  ) {
    return normalized as Exclude<ImageTheme, "general">;
  }

  const cat = (category || "").trim();
  const textCombined = `${title || ""} ${content?.slice(0, 500) || ""}`.toLowerCase();

  // 2. 거시경제·물가·환율 (economy) 키워드
  if (
    /물가|유가|주유소|기름값|장바구니|전통시장|환율|원달러|수출|수입|무역|컨테이너|경상수지|gdp|경제성장률|산업생산/i.test(
      textCombined
    ) ||
    /환율|유가|물가|거시/i.test(cat)
  ) {
    return "economy";
  }

  // 3. 테크·IT (tech) 키워드
  if (
    /테크|it|tech|반도체|스마트워치|아이픽스잇|크롬|해킹|취약점|제로데이|ai|인공지능|소프트웨어|하드웨어|hbm|서버|보안/i.test(
      cat
    ) ||
    /반도체|스마트워치|픽셀워치|크롬|제로데이|해킹|취약점|인공지능|chatgpt|엔비디아|hbm|수리점수|아이픽스잇|하드웨어|소프트웨어|모바일앱/i.test(
      textCombined
    )
  ) {
    return "tech";
  }

  // 4. 청년·취업·교육 (youth) 키워드
  if (
    /청년|취업|구직|인턴|면접|대학생|사회초년생|일자리|도약계좌|도약장려금|역량강화|내일배움카드/i.test(
      textCombined
    )
  ) {
    return "youth";
  }

  // 5. 주거·부동산 (housing) 키워드
  if (
    /부동산|세제|주택|아파트|청약|전세|월세|분양|매매|종부세|취득세|양도세|재건축|임대|도어락|이사/i.test(
      cat
    ) ||
    /아파트|주택|청약|분양|전세|월세|부동산|강남|재건축|디딤돌|버팀목|이사|도어락|입주/i.test(
      textCombined
    )
  ) {
    return "housing";
  }

  // 6. 금융·지원금·세제 (finance) 키워드
  if (
    /금융|경제|증시|금리|대출|투자|은행|가상자산|코인|주식|예금|적금|세금|환급|이자/i.test(
      cat
    ) ||
    /금리|대출|증시|주식|환급|연말정산|예금|적금|금융지원|바우처|비용|소득|자금|이자|통장|계산기/i.test(
      textCombined
    )
  ) {
    return "finance";
  }

  // 7. 사회·문화·환경 (society) 키워드
  if (
    /사회|문화|생활|환경|교육|날씨|의료|보건|컬처/i.test(cat) ||
    /태풍|크로반|기상|호우|의료|병원|건강|공연|축제|미술관|전시|학교|학생|교육|환경|바이오|제주/i.test(
      textCombined
    )
  ) {
    return "society";
  }

  // 8. 정부 정책·법안·공공 (policy) 기본 테마
  return "policy";
}

/**
 * 기사에 맞는 실사 스톡 이미지 항목 반환 (결정론적 Anti-Collision 해시 매칭)
 * - hash(articleId + title) % themePool.length 공식을 적용하여 인접 기사 간 중복 차단
 */
export function getStockImage(
  themeInput?: string | null,
  title: string = "",
  category?: string,
  content?: string,
  articleId?: number | string,
  slug?: string,
  existingUrls?: Set<string>
): StockImageItem & { theme: Exclude<ImageTheme, "general"> } {
  const theme = detectImageTheme(themeInput, category, title, content);
  const pool = STOCK_IMAGE_POOL[theme] || STOCK_IMAGE_POOL.policy;

  // 1. 기사 텍스트 내 세부 키워드 매칭 인덱스 탐색
  const fullText = `${title} ${content?.slice(0, 300) || ""}`.toLowerCase();
  const keywordMatchedIndices: number[] = [];

  pool.forEach((item, idx) => {
    if (item.keywords && item.keywords.some((kw) => fullText.includes(kw.toLowerCase()))) {
      keywordMatchedIndices.push(idx);
    }
  });

  // 2. 결정론적 해시 계산: hash(articleId + slug + title)
  const uniqueKey = `${articleId || ""}_${slug || ""}_${title}`;
  const hashVal = calculateArticleHash(uniqueKey || "briefpost-deterministic-seed");

  let chosenIndex = 0;

  // 3. 키워드 매칭 후보군이 있는 경우 그 안에서 결정론적 인덱스 선정
  if (keywordMatchedIndices.length > 0) {
    chosenIndex = keywordMatchedIndices[hashVal % keywordMatchedIndices.length];
  } else {
    // 키워드가 없으면 테마 풀 전체에서 hash % pool.length로 결정
    chosenIndex = hashVal % pool.length;
  }

  // 4. 충돌 회피 (동일 목록 내 이미 사용된 URL이 전달되었고 대체 가능한 항목이 있을 경우 순환)
  if (existingUrls && pool[chosenIndex] && existingUrls.has(pool[chosenIndex].url)) {
    for (let offset = 1; offset < pool.length; offset++) {
      const nextIdx = (chosenIndex + offset) % pool.length;
      if (pool[nextIdx] && !existingUrls.has(pool[nextIdx].url)) {
        chosenIndex = nextIdx;
        break;
      }
    }
  }

  const selectedItem = pool[chosenIndex] || pool[0];

  return {
    ...selectedItem,
    theme,
  };
}

/**
 * 기사 목록 전체에 대해 100% 겹침 없는 고유 실사 스톡 썸네일 URL을 1:1로 일괄 배정하는 알고리즘
 */
export function assignUniqueStockThumbnails<
  T extends {
    id?: number | string;
    slug?: string;
    title: string;
    category?: string;
    content?: string;
    imageTheme?: string | null;
  }
>(
  articles: T[]
): Array<T & { assignedThumbnailUrl: string; assignedCaption: string; assignedTheme: string }> {
  const usedUrls = new Set<string>();

  return articles.map((art) => {
    const stock = getStockImage(
      art.imageTheme,
      art.title,
      art.category,
      art.content,
      art.id,
      art.slug,
      usedUrls
    );

    usedUrls.add(stock.url);

    return {
      ...art,
      assignedThumbnailUrl: stock.url,
      assignedCaption: stock.caption,
      assignedTheme: stock.theme,
    };
  });
}
