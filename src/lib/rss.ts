import Parser from "rss-parser";
import {
  getAllSourceUrls,
  getCategoryCountsToday,
  getCategoryTotalCounts,
  CORE_CATEGORIES,
} from "./articles";
import { getActiveRssFeeds, RSS_FEEDS } from "@/config/rssFeeds";

export interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  thumbnailUrl: string | null;
  category: string;
  feedTitle: string;
}

export interface FetchRssResult {
  success: boolean;
  totalFetched: number;
  newItemsCount: number;
  skippedCount: number;
  expiredCount?: number;
  noticeSkippedCount?: number;
  opinionSkippedCount?: number;
  nonWhitelistedSkippedCount?: number;
  noKeywordSkippedCount?: number;
  items: (ParsedRssItem & { keywordScore?: number; matchedKeywords?: string[] })[];
  feedStatuses: {
    feedUrl: string;
    status: "success" | "error";
    itemCount: number;
    error?: string;
  }[];
}

/**
 * [카테고리별 특화 타겟 키워드 맵]
 * 4대 핵심 카테고리별 공공 보도자료 특성에 맞춘 전문 키워드
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "정책·지원금": [
    "지원금", "보조금", "환급", "감면", "바우처", "청년", "복지", "장려금", "수당",
    "소상공인", "자영업자", "소진공", "기업마당", "정책자금", "경영자금", "경영애로",
    "일시적 경영애로", "일반경영자금", "경영안정", "희망리턴", "대환대출", "이차보전",
    "스마트상점", "민생지원금", "민생회복", "지역화폐", "재난지원금", "정부24", "보조금24",
    "청년정책", "청년수당", "지원사업", "공고", "모집", "접수", "신청"
  ],
  "금융·경제": [
    "기준금리", "금리", "한국은행", "통화정책", "금융위원회", "금융감독원", "대출",
    "물가", "환율", "가계부채", "채무조정", "서민금융", "예금", "적금", "채권",
    "증시", "주식", "투자", "은행", "kdi", "경제전망", "거시경제", "경제동향",
    "수출", "금융지원", "부채", "코픽스", "특례보금자리", "디딤돌", "금융정책", "자금시장"
  ],
  "테크·IT": [
    "ai", "인공지능", "반도체", "과학기술", "과기정통부", "소프트웨어", "클라우드",
    "정보보안", "보안", "사이버", "데이터", "네트워크", "5g", "6g", "양자", "로봇",
    "모바일", "플랫폼", "ict", "it", "연구개발", "r&d", "kisa", "nipa",
    "생성형", "빅테크", "초거대", "디지털", "신기술", "미래산업", "통신"
  ],
  "사회·문화": [
    "보건", "복지", "의료", "건강보험", "국민연금", "돌봄", "저출생", "일자리",
    "고용", "노동", "최저임금", "근로", "고용노동부", "보건복지부", "문화체육관광부",
    "문화", "관광", "k컬처", "콘텐츠", "예술", "체육", "청년", "고용보험",
    "직업훈련", "사회안전망", "돌봄서비스", "문화누리", "육아", "출산", "사회복지"
  ],
};

/**
 * [전체 타겟 키워드 통합 목록]
 */
export const TARGET_KEYWORDS = [
  ...new Set([
    ...CATEGORY_KEYWORDS["정책·지원금"],
    ...CATEGORY_KEYWORDS["금융·경제"],
    ...CATEGORY_KEYWORDS["테크·IT"],
    ...CATEGORY_KEYWORDS["사회·문화"],
    "개편", "대책", "제도", "정책", "세제", "세금", "소득세", "분양", "전세", "월세", "아파트", "주택"
  ])
] as const;

/**
 * [칼럼/오피니언/사설 원천 배제 패턴]
 * 개인 블로그, 기자 칼럼, 사설, 오피니언, 주관적 주장글을 완벽히 차단
 */
export const OPINION_COLUMN_PATTERNS = [
  /(?:\[|\(|【|\<)\s*(?:칼럼|사설|오피니언|시론|기고|데스크(?:\s*칼럼)?|기자수첩|취재수첩|만평|논평|독자투고|전문가진단|기자의\s*눈|시각|사견)\s*(?:\]|\)|】|\>)/i,
  /(?:칼럼|사설|오피니언|시론|기고|논평|데스크칼럼)\s*[:：]/i,
  /(?:기자|교수|대표|변호사|회장|원장|소장|연구위원|위원장|전문위원)\s*칼럼/i,
  /\b(?:칼럼니스트|외부필진|사설·칼럼|오피니언)\b/i,
];

/**
 * [공식 공공기관/정부부처 화이트리스트 도메인 및 식별자]
 * 정책브리핑, 소진공, 기업마당, 정부24, 온통청년, 한국은행, 금융위, 금감원, KDI, 과기정통부, KISA, NIPA, 문체부, 복지부, 노동부 공식 보도자료 허용
 */
export const OFFICIAL_PUBLIC_DOMAINS = [
  "korea.kr",
  "semas.or.kr",
  "bizinfo.go.kr",
  "gov.kr",
  "plus.gov.kr",
  "youthcenter.go.kr",
  "bok.or.kr",
  "fsc.go.kr",
  "fss.or.kr",
  "kdi.re.kr",
  "msit.go.kr",
  "kisa.or.kr",
  "nipa.or.kr",
  "mcst.go.kr",
  "mohw.go.kr",
  "moel.go.kr",
  "kodit.co.kr",
  "kibo.or.kr",
  "sbiz.or.kr",
  "moef.go.kr",
  "mss.go.kr",
  "molit.go.kr",
  "nts.go.kr",
  "mois.go.kr",
  "seoul.go.kr",
  "gg.go.kr",
  "busan.go.kr",
  "incheon.go.kr",
  "daegu.go.kr",
  "gwangju.go.kr",
  "daejeon.go.kr",
  "ulsan.go.kr",
  "sejong.go.kr",
];

/**
 * 기사의 제목과 본문에서 칼럼, 사설, 오피니언, 주관적 주장글 여부 판별
 */
export function isOpinionOrColumnArticle(item: ParsedRssItem): { isOpinion: boolean; reason?: string } {
  const title = item.title || "";
  const content = `${item.content || ""} ${item.contentSnippet || ""}`;
  const feedTitle = item.feedTitle || "";

  // 1. 피드 이름 검사
  if (/칼럼|오피니언|사설|기고|시론/i.test(feedTitle)) {
    return { isOpinion: true, reason: `오피니언/칼럼 피드 출처 ('${feedTitle}')` };
  }

  // 2. 제목 패턴 정밀 검사
  for (const pattern of OPINION_COLUMN_PATTERNS) {
    if (pattern.test(title)) {
      return { isOpinion: true, reason: `제목에 칼럼/오피니언 패턴 검출` };
    }
  }

  // 3. 제목 내 직접적인 머릿말 검사
  const rawOpinionWords = ["칼럼", "사설", "오피니언", "시론", "기자수첩", "취재수첩", "만평", "사견", "기고문", "칼럼니스트"];
  for (const word of rawOpinionWords) {
    if (title.includes(`[${word}]`) || title.includes(`(${word})`) || title.includes(`【${word}】`) || title.startsWith(`${word}:`)) {
      return { isOpinion: true, reason: `제목 머릿말에 '${word}' 표기 검출` };
    }
  }

  // 4. 본문 서두 200자 내 칼럼니스트/기고 표기 검사
  const intro = content.slice(0, 200);
  if (/기고\s*=|글\s*=|정리\s*=|외부\s*필진|칼럼니스트/i.test(intro) && /칼럼|기고|사설/i.test(title)) {
    return { isOpinion: true, reason: `본문 서두에 기고/칼럼 표기 검출` };
  }

  return { isOpinion: false };
}

/**
 * 기사의 출처가 공식 공공기관/정부부처/지자체 화이트리스트에 부합하는지 검증
 */
export function isWhitelistedPublicSource(item: ParsedRssItem): { isWhitelisted: boolean; reason?: string } {
  const link = (item.link || "").toLowerCase();
  const feedTitle = (item.feedTitle || "").toLowerCase();
  const title = (item.title || "").toLowerCase();
  const content = (item.contentSnippet || item.content || "").toLowerCase();

  // 1. 개인 블로그 및 비공식 커뮤니티 원천 차단
  const BLOCKED_DOMAINS = [
    "tistory.com",
    "blog.naver.com",
    "brunch.co.kr",
    "daum.net/blog",
    "velog.io",
    "medium.com",
    "cafe.naver.com",
    "cafe.daum.net",
  ];
  for (const blocked of BLOCKED_DOMAINS) {
    if (link.includes(blocked)) {
      return { isWhitelisted: false, reason: `개인 블로그/카페 링크(${blocked}) 제외` };
    }
  }

  // 2. 링크 URL 내 공공기관 도메인 검증
  for (const domain of OFFICIAL_PUBLIC_DOMAINS) {
    if (link.includes(domain)) {
      return { isWhitelisted: true };
    }
  }

  // 3. 일반 *.go.kr / *.gov.kr 도메인 검증
  if (/\.go\.kr\b/i.test(link) || /\.gov\.kr\b/i.test(link)) {
    return { isWhitelisted: true };
  }

  // 4. Google News RSS 링크인 경우 (news.google.com):
  //    - 피드 타이틀이나 기사 본문/스니펫에 공식 공공기관 출처가 명시되었는지 확인
  const isGoogleNews = link.includes("news.google.com");
  if (isGoogleNews) {
    const publicKeywords = [
      "정책브리핑",
      "korea.kr",
      "소상공인시장진흥공단",
      "소진공",
      "semas.or.kr",
      "기업마당",
      "bizinfo.go.kr",
      "정부24",
      "보조금24",
      "온통청년",
      "youthcenter.go.kr",
      "중소벤처기업부",
      "중기부",
      "기획재정부",
      "기재부",
      "한국은행",
      "한은",
      "bok.or.kr",
      "금융위원회",
      "금융위",
      "fsc.go.kr",
      "금융감독원",
      "금감원",
      "fss.or.kr",
      "kdi",
      "한국개발연구원",
      "kdi.re.kr",
      "과학기술정보통신부",
      "과기정통부",
      "과기부",
      "msit.go.kr",
      "한국인터넷진흥원",
      "kisa",
      "kisa.or.kr",
      "정보통신산업진흥원",
      "nipa",
      "nipa.or.kr",
      "고용노동부",
      "노동부",
      "moel.go.kr",
      "보건복지부",
      "복지부",
      "mohw.go.kr",
      "문화체육관광부",
      "문체부",
      "mcst.go.kr",
      "국토교통부",
      "국토부",
      "국세청",
      "행정안전부",
      "행안부",
      "서울시",
      "경기도",
      "부산시",
      "인천시",
      "대구시",
      "광주시",
      "대전시",
      "울산시",
      "세종시",
      "강원도",
      "충북도",
      "충남도",
      "전북도",
      "전남도",
      "경북도",
      "경남도",
      "제주도",
      "시청",
      "도청",
      "구청",
      "보도자료",
      "공고",
    ];

    const sourceContext = `${feedTitle} ${title} ${content}`;
    const hasPublicSource = publicKeywords.some((kw) => sourceContext.includes(kw.toLowerCase()));

    if (hasPublicSource) {
      return { isWhitelisted: true };
    }
  }

  // 공공기관 출처가 아닌 경우 차단
  return { isWhitelisted: false, reason: `공공/공식 기관 화이트리스트 출처 미확인` };
}

/**
 * [제외(Skip) 키워드 목록]
 * 단순 기관 동정, 의전, 행사, 기념식 등 독자 실익이 낮은 보도자료를 자동 폐기하기 위한 필터
 */
export const EXCLUDE_KEYWORDS = [
  "동정",
  "행사",
  "포럼",
  "워크숍",
  "세미나",
  "취임식",
  "기념식",
  "위촉",
  "MOU",
  "협약식",
  "캠페인",
  "체육대회",
  "표창",
  "개소식",
  "출범식",
  "인사말",
  "격려사",
  "시상식",
] as const;

/**
 * 기사의 제목과 본문에서 타겟 키워드 포함 여부 및 가중치를 평가하고
 * 칼럼/사설/오피니언, 공공기관 미해당, 단순 기관 동정/행사는 자동 폐기(Skip) 대상으로 판정
 */
export function evaluateArticleKeywords(item: ParsedRssItem): {
  isExcluded: boolean;
  score: number;
  matchedKeywords: string[];
  excludeReason?: string;
  isOpinion?: boolean;
  isNonWhitelisted?: boolean;
} {
  // 1. [절대 배제 1단계] 개인 칼럼, 사설, 오피니언, 주관적 주장글 차단
  const opinionCheck = isOpinionOrColumnArticle(item);
  if (opinionCheck.isOpinion) {
    return {
      isExcluded: true,
      score: 0,
      matchedKeywords: [],
      excludeReason: opinionCheck.reason || "칼럼/사설/오피니언 배제",
      isOpinion: true,
    };
  }

  // 2. [절대 배제 2단계] 공공/공식 기관 화이트리스트 출처 강제
  const whitelistCheck = isWhitelistedPublicSource(item);
  if (!whitelistCheck.isWhitelisted) {
    return {
      isExcluded: true,
      score: 0,
      matchedKeywords: [],
      excludeReason: whitelistCheck.reason || "공공기관 공식 출처 화이트리스트 미해당",
      isNonWhitelisted: true,
    };
  }

  const title = (item.title || "").toLowerCase();
  const content = `${item.content || ""} ${item.contentSnippet || ""}`.toLowerCase();

  // 3. [절대 배제 3단계] 단순 기관 동정이나 행사 소식 배제 (제목 기준 우선 검사)
  for (const excludeWord of EXCLUDE_KEYWORDS) {
    if (title.includes(excludeWord.toLowerCase()) || title.startsWith(`[${excludeWord.toLowerCase()}]`)) {
      return {
        isExcluded: true,
        score: 0,
        matchedKeywords: [],
        excludeReason: `단순 기관 동정/행사 키워드('${excludeWord}') 포함`,
      };
    }
  }

  // 4. 카테고리별 전문 키워드 검사 및 공정한 점수 산정
  let score = 0;
  const matchedKeywords: string[] = [];

  // 1) 해당 카테고리의 전용 키워드 우선 가산 (제목 +4점, 본문 +2점)
  const categoryKws = CATEGORY_KEYWORDS[item.category] || [];
  for (const keyword of categoryKws) {
    const kw = keyword.toLowerCase();
    const inTitle = title.includes(kw);
    const inContent = content.includes(kw);

    if (inTitle || inContent) {
      if (!matchedKeywords.includes(keyword)) matchedKeywords.push(keyword);
      if (inTitle) score += 4;
      if (inContent) score += 2;
    }
  }

  // 2) 전체 공통 타겟 키워드 검사 (제목 +2점, 본문 +1점)
  for (const keyword of TARGET_KEYWORDS) {
    const kw = keyword.toLowerCase();
    const inTitle = title.includes(kw);
    const inContent = content.includes(kw);

    if (inTitle || inContent) {
      if (!matchedKeywords.includes(keyword)) matchedKeywords.push(keyword);
      if (inTitle) score += 2;
      if (inContent) score += 1;
    }
  }

  // 3) 공식 공공기관/정부부처 출처 기본 점수 보장 (공식 보도자료는 팩트성이 확실하므로 기본 3점 부여)
  if (whitelistCheck.isWhitelisted && score === 0) {
    score = 3;
    matchedKeywords.push("공식보도");
  }

  return {
    isExcluded: false,
    score,
    matchedKeywords,
  };
}

/**
 * 전 국민·소상공인이 가장 관심을 둘 만한 '민생지원금' 또는 '소상공인 경영자금/애로자금' 기사 판별
 */
export function isPriorityPolicyArticle(item: ParsedRssItem): boolean {
  const text = `${item.title || ""} ${item.content || ""} ${item.contentSnippet || ""} ${item.category || ""}`.toLowerCase();
  return (
    text.includes("민생지원금") ||
    text.includes("민생회복") ||
    text.includes("추석지원금") ||
    text.includes("경영애로") ||
    text.includes("일반경영자금") ||
    text.includes("경영안정자금") ||
    text.includes("대환대출") ||
    text.includes("소상공인 정책자금") ||
    text.includes("소진공") ||
    (text.includes("소상공인") && (text.includes("자금") || text.includes("대출") || text.includes("지원금") || text.includes("지원사업")))
  );
}

// 하위 호환성 유지
export const isSmallBizPriorityArticle = isPriorityPolicyArticle;

/**
 * 전 국민·지역 주민이 주목하는 '추석 및 지역별 민생지원금/민생회복지원금' 기사 판별
 */
export function isMinsaengArticle(item: ParsedRssItem): boolean {
  const text = `${item.title || ""} ${item.content || ""} ${item.contentSnippet || ""}`.toLowerCase();
  return (
    text.includes("민생지원금") ||
    text.includes("민생회복") ||
    text.includes("추석지원금") ||
    text.includes("민생지원금신청") ||
    text.includes("민생지원금조회") ||
    text.includes("재난지원금")
  );
}

/**
 * 후보 목록 내 유사 제목/동일 이슈 기사 중복 방지 판별 (2-gram Dice 유사도)
 */
function hasSimilarTitleInList<T extends ParsedRssItem>(item: T, list: T[]): boolean {
  const clean = (t: string) => t.replace(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase();
  const cTarget = clean(item.title);
  if (!cTarget || cTarget.length < 5) return false;

  const getBigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const bTarget = getBigrams(cTarget);

  for (const existing of list) {
    if (existing.link === item.link) return true;
    const cOther = clean(existing.title);
    if (cOther === cTarget) return true;
    const bOther = getBigrams(cOther);
    if (bOther.size === 0) continue;

    let intersection = 0;
    for (const b of bTarget) {
      if (bOther.has(b)) intersection++;
    }
    const dice = (2 * intersection) / (bTarget.size + bOther.size);
    if (dice >= 0.45) return true;
  }
  return false;
}

/**
 * [카테고리별 균등 쿼터제(Quota) 수집 및 선별 시스템]
 * 1. 4개 카테고리(정책·지원금, 금융·경제, 테크·IT, 사회·문화)에 골고루 균형 있게 발행
 * 2. 1회 실행 시 각 카테고리당 최대 1~2건씩 선별 수집
 * 3. 당일 특정 카테고리가 이미 정원(2건)을 채웠다면, 부족한 타 카테고리를 우선 탐색
 * 4. 하루 전체 1:1:1:1 비율에 가깝게 유지 보장
 */
export function selectCandidatesWithQuota<T extends ParsedRssItem & { keywordScore?: number }>(
  items: T[],
  limit: number
): T[] {
  if (items.length === 0) return [];

  // 1. 당일(최근 24시간) 발행 현황 및 DB 전체 누적 통계 확인
  const todayCounts = getCategoryCountsToday();
  const totalCounts = getCategoryTotalCounts();
  console.log("\n📊 [Quota] 당일(최근 24시간) 카테고리별 기사 발행 현황:", todayCounts);
  console.log("📊 [Quota] DB 전체 카테고리 누적 통계:", totalCounts);

  // 2. 수집된 후보군을 카테고리별로 분류
  const categoriesMap: Record<string, T[]> = {
    "정책·지원금": [],
    "금융·경제": [],
    "테크·IT": [],
    "사회·문화": [],
  };

  for (const item of items) {
    const cat = item.category || "정책·지원금";
    if (cat in categoriesMap) {
      categoriesMap[cat].push(item);
    } else {
      categoriesMap["정책·지원금"].push(item);
    }
  }

  // 각 카테고리 내에서는 keywordScore 및 최신 발행일 순으로 정렬
  for (const cat of CORE_CATEGORIES) {
    categoriesMap[cat].sort((a, b) => {
      const scoreA = a.keywordScore || 0;
      const scoreB = b.keywordScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0);
    });
    console.log(`• [수집 풀] ${cat}: 유효 후보 ${categoriesMap[cat].length}건`);
  }

  // 3. 기사가 부족한 카테고리 우선 탐색 순서 결정
  // 1순위: 당일 발행 건수 적은 카테고리, 2순위: 전체 누적 건수 적은 카테고리
  const sortedCategories = [...CORE_CATEGORIES].sort((a, b) => {
    const todayDiff = (todayCounts[a] || 0) - (todayCounts[b] || 0);
    if (todayDiff !== 0) return todayDiff;
    return (totalCounts[a] || 0) - (totalCounts[b] || 0);
  });

  console.log(
    "🎯 [Quota 우선순위(기사 부족 카테고리 우선)]:",
    sortedCategories
      .map((c) => `${c}(오늘:${todayCounts[c] || 0}건 / 누적:${totalCounts[c] || 0}건)`)
      .join(" -> ")
  );

  const result: T[] = [];
  const selectedPerCategory: Record<string, number> = {
    "정책·지원금": 0,
    "금융·경제": 0,
    "테크·IT": 0,
    "사회·문화": 0,
  };

  // 1회 실행당 카테고리 최대 할당량: limit <= 4이면 카테고리당 1건, 초과 시 최대 2건
  const maxPerCategoryPerRun = limit <= 4 ? 1 : 2;
  const DAILY_QUOTA_PER_CAT = 2; // 일일 목표 균등 정원

  // Round 1: 당일 정원 미달인 부족 카테고리 우선으로 각 1건씩 선별
  for (const cat of sortedCategories) {
    if (result.length >= limit) break;
    const catItems = categoriesMap[cat];
    const currentTodayCount = todayCounts[cat] || 0;

    // 당일 정원(2건)을 이미 채웠고, 다른 미달 카테고리에 후보가 남아있다면 해당 카테고리는 스킵
    const otherUnderrepresented = sortedCategories.some(
      (other) =>
        other !== cat &&
        (todayCounts[other] || 0) < DAILY_QUOTA_PER_CAT &&
        categoriesMap[other].length > selectedPerCategory[other]
    );

    if (currentTodayCount >= DAILY_QUOTA_PER_CAT && otherUnderrepresented) {
      console.log(
        `⏩ [Quota 건너뜀] '${cat}' 카테고리는 오늘 이미 ${currentTodayCount}건 발행되어 스킵 (부족 카테고리 우선)`
      );
      continue;
    }

    for (const item of catItems) {
      if (selectedPerCategory[cat] >= maxPerCategoryPerRun) break;
      if (!hasSimilarTitleInList(item, result)) {
        result.push(item);
        selectedPerCategory[cat] = (selectedPerCategory[cat] || 0) + 1;
        console.log(
          `🎯 [Quota 배정 1차] [${cat}] "${item.title.slice(0, 35)}..." (점수: ${item.keywordScore || 0})`
        );
        break;
      }
    }
  }

  // Round 2: 잔여 슬롯이 있다면, 부족 카테고리 순서대로 maxPerCategoryPerRun 범위 내에서 추가 선별
  if (result.length < limit) {
    for (const cat of sortedCategories) {
      if (result.length >= limit) break;
      const catItems = categoriesMap[cat];

      for (const item of catItems) {
        if (result.length >= limit) break;
        if (selectedPerCategory[cat] >= maxPerCategoryPerRun) break;
        if (!hasSimilarTitleInList(item, result) && !result.some((r) => r.link === item.link)) {
          result.push(item);
          selectedPerCategory[cat] = (selectedPerCategory[cat] || 0) + 1;
          console.log(
            `🎯 [Quota 보충 2차] [${cat}] "${item.title.slice(0, 35)}..." (점수: ${item.keywordScore || 0})`
          );
        }
      }
    }
  }

  // Round 3: 특정 카테고리 후보 부재로 여전히 limit 미달인 경우, 가용 풀 전체에서 중복 없이 보충
  if (result.length < limit) {
    for (const item of items) {
      if (result.length >= limit) break;
      if (!hasSimilarTitleInList(item, result) && !result.some((r) => r.link === item.link)) {
        result.push(item);
        const cat = item.category || "정책·지원금";
        selectedPerCategory[cat] = (selectedPerCategory[cat] || 0) + 1;
        console.log(`ℹ️ [Quota 풀백] [${cat}] "${item.title.slice(0, 35)}..."`);
      }
    }
  }

  console.log(`\n🎉 [Quota 선별 완료: 총 ${result.length}건 배정]`);
  for (const cat of CORE_CATEGORIES) {
    console.log(`   • ${cat}: ${selectedPerCategory[cat] || 0}건`);
  }

  return result;
}

export const DEFAULT_RSS_FEEDS = RSS_FEEDS;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// 공공기관 및 일반 언론사 RSS/Atom의 다양한 규격을 포용하는 커스텀 파서
const rssParser = new Parser({
  timeout: 12000,
  headers: {
    "User-Agent": USER_AGENT,
    Accept:
      "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9, */*;q=0.8",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["content:encoded", "contentEncoded"],
      ["dc:date", "dcDate"],
      ["dc:identifier", "dcIdentifier"],
      ["dc:creator", "dcCreator"],
      ["dc:title", "dcTitle"],
      ["description", "description"],
      ["summary", "summary"],
      ["id", "guidId"],
    ],
  },
});

interface RssItemLike {
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string } };
  mediaThumbnail?: { $?: { url?: string } };
  content?: string;
  contentEncoded?: string;
  description?: string;
  "content:encoded"?: string;
  [key: string]: unknown;
}

/**
 * HTML 본문 및 미디어 태그에서 썸네일 이미지 URL 추출
 */
function extractThumbnailUrl(item: RssItemLike): string | null {
  // 1) enclosure 태그 확인
  if (
    item.enclosure?.url &&
    (item.enclosure.type?.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url))
  ) {
    return item.enclosure.url;
  }

  // 2) media:content 또는 media:thumbnail 속성 확인
  if (item.mediaContent?.$?.url) {
    return item.mediaContent.$.url;
  }
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }

  // 3) 본문 HTML 내 <img> src 정규식 추출
  const contentToSearch =
    item.contentEncoded ||
    (typeof item["content:encoded"] === "string" ? item["content:encoded"] : "") ||
    item.content ||
    (typeof item.description === "string" ? item.description : "") ||
    "";

  const imgMatch = contentToSearch.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  return null;
}

/**
 * HTML 태그 제거 및 텍스트 정리 (엔티티 복원 및 마크다운/HTML 태그 완전 정제)
 */
export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&middot;/gi, "·")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Google News RSS 피드 및 일반 HTML 본문을 깨끗한 브리핑 텍스트로 정규화
 * <ol><li><a href="...">제목</a><font>매체</font></li></ol> 형태를 "매체: 제목" 리스트 텍스트로 안전 변환
 */
export function sanitizeRssRawContent(rawHtmlOrText: string): string {
  if (!rawHtmlOrText) return "";

  // 1. Google News 식 <ol><li> 구조 감지
  if (/<li[^>]*>/i.test(rawHtmlOrText)) {
    const liMatches = Array.from(rawHtmlOrText.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    if (liMatches.length > 0) {
      const extractedLines = liMatches
        .map((match) => {
          const innerHtml = match[1];
          // 언론사 이름 추출 (<font color="...">매체명</font>)
          const mediaMatch = innerHtml.match(/<font[^>]*>([\s\S]*?)<\/font>/i);
          const media = mediaMatch ? stripHtmlTags(mediaMatch[1]).trim() : "";

          // 기사 타이틀 추출 (언론사 태그 없이 순수 타이틀/내용만 보존)
          const text = stripHtmlTags(innerHtml.replace(/<font[^>]*>[\s\S]*?<\/font>/gi, "")).trim();
          if (!text) return "";
          return text;
        })
        .filter((line) => line.length > 5);

      if (extractedLines.length > 0) {
        return extractedLines.join("\n");
      }
    }
  }

  // 2. 일반 HTML 본문인 경우 태그를 100% 제거하고 정갈한 텍스트로 변환
  const cleaned = stripHtmlTags(rawHtmlOrText);
  return cleaned;
}

/**
 * 일반 언론사 및 공공기관 RSS 아이템에서 필드를 유연하게 추출
 */
function extractItemDetails(
  item: Record<string, unknown>,
  targetFeed: { url: string; name: string; category: string },
  feedTitle: string
): ParsedRssItem | null {
  // 1. Title 추출 (언론사 꼬리표 사전 제거)
  const rawTitle =
    item.title ||
    item.dcTitle ||
    item["dc:title"] ||
    item.heading ||
    item.headline ||
    "";
  const title = stripHtmlTags(String(rawTitle))
    .replace(/\s*[-–—]\s*[가-힣a-zA-Z0-9.\s]+(?:신문|일보|뉴스(?:TV)?|경제|방송|TV|미디어|com|net|co\.kr)\s*$/gi, "")
    .trim();

  // 2. Link 추출 (Atom href 객체, guid, dc:identifier 등 다형성 지원)
  let rawLink: unknown =
    item.link ||
    item.guid ||
    item.guidId ||
    item.dcIdentifier ||
    item["dc:identifier"] ||
    item.id ||
    "";

  if (typeof rawLink === "object" && rawLink !== null) {
    const obj = rawLink as Record<string, unknown>;
    if (typeof obj.$ === "object" && obj.$ !== null) {
      const nested = obj.$ as Record<string, unknown>;
      if (typeof nested.href === "string") rawLink = nested.href;
    } else if (typeof obj.href === "string") {
      rawLink = obj.href;
    } else if (typeof obj._ === "string") {
      rawLink = obj._;
    }
  }

  const link = typeof rawLink === "string" ? rawLink.trim() : "";

  if (!title || !link) {
    return null;
  }

  // 3. 본문 및 요약 텍스트 추출
  const rawContent =
    item.contentEncoded ||
    item["content:encoded"] ||
    item.content ||
    item.description ||
    item.summary ||
    item.contentSnippet ||
    "";
  const contentStr = typeof rawContent === "string" ? rawContent : "";
  const sanitizedContent = sanitizeRssRawContent(contentStr);
  const cleanSnippet = stripHtmlTags(typeof rawContent === "string" ? rawContent : "").slice(0, 300);

  // 4. 날짜 추출 (pubDate, isoDate, dc:date 등 다형성 지원)
  const rawDate =
    item.pubDate ||
    item.isoDate ||
    item.dcDate ||
    item["dc:date"] ||
    item.date ||
    item.published ||
    item.updated;

  let pubDate = new Date().toISOString();
  if (rawDate) {
    const parsedTime = Date.parse(String(rawDate));
    if (!isNaN(parsedTime)) {
      pubDate = new Date(parsedTime).toISOString();
    }
  }

  // 5. 썸네일 이미지 추출
  const thumbnailUrl = extractThumbnailUrl(item as RssItemLike);

  return {
    title,
    link,
    pubDate,
    content: sanitizedContent || cleanSnippet,
    contentSnippet: cleanSnippet || sanitizedContent.slice(0, 300),
    thumbnailUrl,
    category: targetFeed.category,
    feedTitle: feedTitle || targetFeed.name,
  };
}

/**
 * 단일 피드를 안전하게 수집 및 파싱 (에러 발생 시 상세 상태 코드 및 원인 기록)
 */
async function fetchSingleFeed(targetFeed: {
  url: string;
  name: string;
  category: string;
}): Promise<{
  items: ParsedRssItem[];
  rawCount: number;
  status: "success" | "error";
  statusCode?: number;
  error?: string;
}> {
  console.log(`[RSS] 피드 수집 시도: [${targetFeed.name}] (URL: ${targetFeed.url})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    let rawXml = "";
    let httpStatus = 200;

    try {
      const res = await fetch(targetFeed.url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9, */*;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      httpStatus = res.status;

      if (!res.ok) {
        const errorMsg = `HTTP 에러 상태 코드: ${res.status} (${res.statusText})`;
        console.error(
          `[RSS ERROR] 피드 수집 실패: [${targetFeed.name}] (${targetFeed.url}) -> ${errorMsg}`
        );
        return {
          items: [],
          rawCount: 0,
          status: "error",
          statusCode: res.status,
          error: errorMsg,
        };
      }

      rawXml = await res.text();
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const fetchErrMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);

      // fetch 실패 시 rssParser.parseURL로 재시도
      try {
        const directFeed = await rssParser.parseURL(targetFeed.url);
        const processed = processFeedResult(directFeed, targetFeed);
        console.log(
          `[RSS SUCCESS] 피드 수집 성공(parseURL 폴백): [${targetFeed.name}] (${targetFeed.url}) -> 긁어온 원문: ${processed.items.length}건`
        );
        return {
          items: processed.items,
          rawCount: processed.items.length,
          status: "success",
          statusCode: 200,
        };
      } catch (parseErr: unknown) {
        const parseErrMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        const finalError = `네트워크 연결 실패 (${fetchErrMsg}) / 파서 재시도 실패 (${parseErrMsg})`;
        console.error(
          `[RSS ERROR] 피드 수집 실패: [${targetFeed.name}] (${targetFeed.url}) -> ${finalError}`
        );
        return {
          items: [],
          rawCount: 0,
          status: "error",
          error: finalError,
        };
      }
    }

    // 공공기관 서버가 200 OK이면서 HTML 에러/안내 페이지를 반환하는 경우 방어
    if (
      (rawXml.includes("<!DOCTYPE html") ||
        rawXml.includes("<!doctype html") ||
        rawXml.includes("<html")) &&
      !rawXml.includes("<rss") &&
      !rawXml.includes("<feed") &&
      !rawXml.includes("<channel")
    ) {
      const errorMsg = "HTTP 200 응답이나 XML 피드가 아닌 웹페이지(HTML 안내/에러 페이지) 반환됨";
      console.warn(
        `[RSS ERROR] 피드 파싱 실패: [${targetFeed.name}] (${targetFeed.url}) -> ${errorMsg}`
      );
      return {
        items: [],
        rawCount: 0,
        status: "error",
        statusCode: httpStatus,
        error: errorMsg,
      };
    }

    const parsedFeed = await rssParser.parseString(rawXml);
    const processed = processFeedResult(parsedFeed, targetFeed);

    console.log(
      `[RSS SUCCESS] 피드 수집 성공: [${targetFeed.name}] (${targetFeed.url}) -> 긁어온 원문: ${processed.items.length}건 (HTTP ${httpStatus})`
    );

    return {
      items: processed.items,
      rawCount: processed.items.length,
      status: "success",
      statusCode: httpStatus,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[RSS ERROR] 피드 예외 발생: [${targetFeed.name}] (${targetFeed.url}) -> ${errMsg}`
    );
    return {
      items: [],
      rawCount: 0,
      status: "error",
      error: errMsg,
    };
  }
}

/**
 * 파싱된 피드 객체에서 최대 10개의 아이템 정제 반환
 */
function processFeedResult(
  feed: { items?: any[]; title?: string },
  targetFeed: { url: string; name: string; category: string }
): { items: ParsedRssItem[]; status: "success" } {
  const rawItems = feed.items || [];
  const targetItems = rawItems.slice(0, 10);
  const items: ParsedRssItem[] = [];

  for (const rawItem of targetItems) {
    const parsed = extractItemDetails(rawItem as Record<string, unknown>, targetFeed, feed.title || targetFeed.name);
    if (parsed) {
      items.push(parsed);
    }
  }

  return { items, status: "success" };
}

/**
 * Promise.allSettled를 통해 모든 등록된 RSS 피드를 병렬로 안전하게 수집
 */
export async function fetchRssFeeds(
  customUrls?: { url: string; category?: string }[]
): Promise<FetchRssResult> {
  const feedsToFetch =
    customUrls && customUrls.length > 0
      ? customUrls.map((c) => ({
          url: c.url,
          category: c.category || "정책·지원금",
          name: c.url,
        }))
      : getActiveRssFeeds();

  const existingSourceUrls = getAllSourceUrls();

  console.log(`\n======================================================`);
  console.log(`[RSS 수집 시작] 총 ${feedsToFetch.length}개 피드 병렬 수집 개시`);
  console.log(`- 기존 DB 등록 기사(중복 배제용 URL): 총 ${existingSourceUrls.size}건`);
  console.log(`======================================================`);

  // 병렬 호출: 하나의 피드가 지연되거나 실패해도 다른 피드 수집에 전혀 영향을 주지 않음
  const results = await Promise.allSettled(
    feedsToFetch.map((targetFeed) => fetchSingleFeed(targetFeed))
  );

  const feedStatuses: FetchRssResult["feedStatuses"] = [];
  const newItems: ParsedRssItem[] = [];
  let totalRawCount = 0;
  let skippedCount = 0;

  console.log(`\n------------------------------------------------------`);
  console.log(`[RSS 피드별 원문 수집 결과 요약]`);

  for (let i = 0; i < feedsToFetch.length; i++) {
    const targetFeed = feedsToFetch[i];
    const settled = results[i];

    if (settled.status === "fulfilled") {
      const { items, rawCount, status, error } = settled.value;
      totalRawCount += rawCount;
      let feedNewCount = 0;
      let feedSkippedCount = 0;

      for (const item of items) {
        if (existingSourceUrls.has(item.link)) {
          skippedCount++;
          feedSkippedCount++;
          continue;
        }

        newItems.push(item);
        existingSourceUrls.add(item.link);
        feedNewCount++;
      }

      feedStatuses.push({
        feedUrl: targetFeed.url,
        status,
        itemCount: feedNewCount,
        error,
      });

      console.log(
        `• [${targetFeed.name}] (URL: ${targetFeed.url}) -> 긁어온 원문: ${rawCount}건 | 신규: ${feedNewCount}건 | 중복 스킵: ${feedSkippedCount}건 | 상태: ${status}${error ? ` (${error})` : ""}`
      );
    } else {
      const errMsg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      console.error(
        `• [${targetFeed.name}] (URL: ${targetFeed.url}) -> 수집 실패: ${errMsg}`
      );
      feedStatuses.push({
        feedUrl: targetFeed.url,
        status: "error",
        itemCount: 0,
        error: errMsg,
      });
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(`[RSS 중복 체크 최종 결과]`);
  console.log(`- 전체 긁어온 원문: ${totalRawCount}건`);
  console.log(`- 신규 기사로 판정된 건수: ${newItems.length}건`);
  console.log(`- 중복으로 스킵된 건수: ${skippedCount}건`);
  console.log(`======================================================`);

  // --- 최근 7일 이내 발행된 기사만 필터링 (7 * 24 * 60 * 60 * 1000 ms) ---
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - SEVEN_DAYS_MS;

  const validRecentItems: ParsedRssItem[] = [];
  let expiredCount = 0;

  for (const item of newItems) {
    let itemTime = Date.parse(item.pubDate);
    // 다양한 공공기관 날짜 포맷 안전 파싱 예외 처리
    if (isNaN(itemTime)) {
      const fallbackDate = new Date(item.pubDate);
      itemTime = fallbackDate.getTime();
    }

    // 날짜 파싱이 불가능한 경우(isNaN) 안전하게 유효 기사로 인정하여 통과
    if (isNaN(itemTime)) {
      validRecentItems.push(item);
      continue;
    }

    // 7일 이내 기사만 채택, 7일 이전 기사는 제외
    if (itemTime >= cutoffTime) {
      validRecentItems.push(item);
    } else {
      expiredCount++;
    }
  }

  // 최신 발행일(pubDate) 1차 정렬
  validRecentItems.sort((a, b) => {
    const timeA = Date.parse(a.pubDate) || 0;
    const timeB = Date.parse(b.pubDate) || 0;
    return timeB - timeA;
  });

  console.log(
    `[RSS Filter] 전체 수집 건수: ${newItems.length}건 / 7일 이내 유효 기사: ${validRecentItems.length}건 / 제외된 지난 기사: ${expiredCount}건`
  );

  // --- 🎯 [키워드 가중치 필터] 타겟 키워드 1개 이상 포함 여부 검증 및 단순 기관 동정/행사 폐기 ---
  // --- 🎯 [키워드 가중치 필터] 타겟 키워드 1개 이상 포함 여부 검증 및 단순 기관 동정/행사/칼럼/오피니언 폐기 ---
  type ScoredRssItem = ParsedRssItem & { keywordScore: number; matchedKeywords: string[] };
  const targetQualifiedItems: ScoredRssItem[] = [];
  let noticeSkippedCount = 0;
  let opinionSkippedCount = 0;
  let nonWhitelistedSkippedCount = 0;
  let noKeywordSkippedCount = 0;

  for (const item of validRecentItems) {
    const evaluation = evaluateArticleKeywords(item);

    // 1) 칼럼, 사설, 오피니언, 주관적 주장글 자동 폐기(Skip)
    if (evaluation.isOpinion) {
      opinionSkippedCount++;
      continue;
    }

    // 2) 공공기관 공식 출처 화이트리스트 미해당 자동 폐기(Skip)
    if (evaluation.isNonWhitelisted) {
      nonWhitelistedSkippedCount++;
      continue;
    }

    // 3) 단순 기관 동정이나 행사 소식은 자동 폐기(Skip)
    if (evaluation.isExcluded) {
      noticeSkippedCount++;
      continue;
    }

    // 4) 타겟 키워드가 1개 이상 포함된 알짜 기사만 선별
    if (evaluation.score > 0) {
      targetQualifiedItems.push({
        ...item,
        keywordScore: evaluation.score,
        matchedKeywords: evaluation.matchedKeywords,
      });
    } else {
      noKeywordSkippedCount++;
    }
  }

  // 가중치 정렬: 1순위 키워드 점수(제목 3점, 본문 1점 합산), 2순위 최신 발행일
  targetQualifiedItems.sort((a, b) => {
    if (b.keywordScore !== a.keywordScore) {
      return b.keywordScore - a.keywordScore;
    }
    const timeA = Date.parse(a.pubDate) || 0;
    const timeB = Date.parse(b.pubDate) || 0;
    return timeB - timeA;
  });

  console.log(`\n------------------------------------------------------`);
  console.log(`🎯 [키워드 가중치 & 공식 공공기관 필터 선별 결과 요약]`);
  console.log(`• 7일 이내 전체 후보:               ${validRecentItems.length}건`);
  console.log(`• ✅ 타겟 키워드 통과(발행 대상):     ${targetQualifiedItems.length}건`);
  console.log(`• 🚫 칼럼/오피니언/사설 폐기(Skip):   ${opinionSkippedCount}건`);
  console.log(`• 🏛️ 비공식 출처(화이트리스트 외) 폐기: ${nonWhitelistedSkippedCount}건`);
  console.log(`• 🗑️ 단순 기관 동정/행사 폐기(Skip):  ${noticeSkippedCount}건`);
  console.log(`• ⏩ 타겟 키워드 미포함 폐기(Skip):   ${noKeywordSkippedCount}건`);
  if (targetQualifiedItems.length > 0) {
    console.log(`• 🌟 최우선 추천 알짜 공공 보도 TOP 3:`);
    targetQualifiedItems.slice(0, 3).forEach((item, idx) => {
      console.log(
        `  [#${idx + 1}] (가중치: ${item.keywordScore}점 | 매칭 키워드: [${item.matchedKeywords.join(", ")}]) "${item.title.slice(0, 45)}..."`
      );
    });
  }
  console.log(`======================================================\n`);

  return {
    success: true,
    totalFetched: totalRawCount,
    newItemsCount: targetQualifiedItems.length,
    skippedCount,
    expiredCount,
    noticeSkippedCount,
    opinionSkippedCount,
    nonWhitelistedSkippedCount,
    noKeywordSkippedCount,
    items: targetQualifiedItems,
    feedStatuses,
  };
}
