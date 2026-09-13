import db from "./db";

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  category: string;
  metaTitle: string | null;
  metaDescription: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string | null;
  faq?: string | null;
  ctaType?: "subsidy" | "general" | string | null;
  imageTheme?: "housing" | "finance" | "youth" | "policy" | string | null;
  highlightBadge?: string | null;
  card_title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateArticleInput = Omit<Article, "id" | "createdAt" | "updatedAt"> & {
  createdAt?: string;
};

export interface GetArticlesOptions {
  page?: number;
  limit?: number;
  category?: string;
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 기사 목록 페이지네이션 및 카테고리 필터링 조회
 */
export function getArticles(options: GetArticlesOptions = {}): PaginatedArticles {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, options.limit || 10);
  const offset = (page - 1) * limit;
  const category = options.category;

  let total = 0;
  let articles: Article[] = [];

  if (category && category !== "all") {
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM articles WHERE category = ?");
    const countResult = countStmt.get(category) as { count: number };
    total = countResult.count;

    const selectStmt = db.prepare(`
      SELECT * FROM articles 
      WHERE category = ? 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `);
    articles = selectStmt.all(category, limit, offset) as Article[];
  } else {
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM articles");
    const countResult = countStmt.get() as { count: number };
    total = countResult.count;

    const selectStmt = db.prepare(`
      SELECT * FROM articles 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `);
    articles = selectStmt.all(limit, offset) as Article[];
  }

  return {
    articles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Slug 기반 단일 기사 상세 조회 (SEO용 메타데이터 생성 및 상세 렌더링에 사용)
 */
export function getArticleBySlug(slug: string): Article | null {
  const stmt = db.prepare("SELECT * FROM articles WHERE slug = ? LIMIT 1");
  const article = stmt.get(slug) as Article | undefined;
  return article || null;
}

/**
 * ID 기반 단일 기사 상세 조회 (article/[id] 라우트 대응)
 */
export function getArticleById(id: number | string): Article | null {
  const numId = Number(id);
  if (isNaN(numId)) return null;
  const stmt = db.prepare("SELECT * FROM articles WHERE id = ? LIMIT 1");
  const article = stmt.get(numId) as Article | undefined;
  return article || null;
}

/**
 * 동일 카테고리 내 관련 기사 3선 조회 (독자 체류 시간 극대화 및 이탈 방지)
 */
export function getRelatedArticles(currentSlug: string, category: string, limit: number = 3): Article[] {
  // 1. 같은 카테고리 내 현재 기사를 제외한 최신 기사 조회
  const stmt = db.prepare(`
    SELECT * FROM articles 
    WHERE category = ? AND slug != ? 
    ORDER BY id DESC 
    LIMIT ?
  `);
  let related = stmt.all(category, currentSlug, limit) as Article[];

  // 2. 만약 해당 카테고리 기사가 부족한 경우, 다른 최신 기사로 보충
  if (related.length < limit) {
    const needed = limit - related.length;
    const existingSlugs = [currentSlug, ...related.map((a) => a.slug)];
    const placeholders = existingSlugs.map(() => "?").join(",");
    const fallbackStmt = db.prepare(`
      SELECT * FROM articles 
      WHERE slug NOT IN (${placeholders})
      ORDER BY id DESC 
      LIMIT ?
    `);
    const fallbacks = fallbackStmt.all(...existingSlugs, needed) as Article[];
    related = [...related, ...fallbacks];
  }

  return related;
}

/**
 * 신규 기사 저장 (송출 파이프라인 연동용)
 */
export function createArticle(input: CreateArticleInput): Article {
  const stmt = db.prepare(`
    INSERT INTO articles (
      title, slug, content, summary, category, 
      metaTitle, metaDescription, thumbnailUrl, sourceUrl, faq, ctaType, imageTheme, highlightBadge, card_title, createdAt
    ) VALUES (
      @title, @slug, @content, @summary, @category, 
      @metaTitle, @metaDescription, @thumbnailUrl, @sourceUrl, @faq,
      COALESCE(@ctaType, 'general'),
      @imageTheme,
      @highlightBadge,
      @card_title,
      COALESCE(@createdAt, CURRENT_TIMESTAMP)
    )
  `);

  const info = stmt.run({
    title: input.title,
    slug: input.slug,
    content: input.content,
    summary: input.summary || null,
    category: input.category,
    metaTitle: input.metaTitle || input.title,
    metaDescription: input.metaDescription || input.summary || null,
    thumbnailUrl: input.thumbnailUrl || null,
    sourceUrl: input.sourceUrl || null,
    faq: typeof input.faq === "object" && input.faq !== null ? JSON.stringify(input.faq) : (input.faq || null),
    ctaType: input.ctaType || "general",
    imageTheme: input.imageTheme || null,
    highlightBadge: input.highlightBadge || null,
    card_title: input.card_title || null,
    createdAt: input.createdAt || null,
  });

  const getStmt = db.prepare("SELECT * FROM articles WHERE id = ?");
  return getStmt.get(info.lastInsertRowid) as Article;
}

import { ALLOWED_CATEGORIES } from "./ai";

/**
 * 등록된 카테고리 중 기사 수가 minCount(기본 3건) 이상인 알짜 카테고리만 조회
 * - 콘텐츠 부족(3건 미만) 카테고리의 노출을 원천 차단하여 애드센스 심사 감점 방지
 */
export function getAllCategories(minCount: number = 3): string[] {
  const stmt = db.prepare(`
    SELECT category, COUNT(*) as cnt 
    FROM articles 
    GROUP BY category 
    HAVING COUNT(*) >= ? 
    ORDER BY cnt DESC, category ASC
  `);
  const rows = stmt.all(minCount) as { category: string; cnt: number }[];

  // 표준 카테고리 우선순위 순서대로 정렬
  const priorityOrder = ["정책·지원금", "금융·경제", "부동산·세제", "테크·IT", "사회·문화"];
  const validCategories = rows.map((r) => r.category);

  const ordered = priorityOrder.filter((cat) => validCategories.includes(cat));
  validCategories.forEach((cat) => {
    if (!ordered.includes(cat)) {
      ordered.push(cat);
    }
  });

  return ordered;
}

/**
 * DB에 저장된 모든 sourceUrl 목록 조회 (중복 필터링을 위한 Set 반환)
 */
export function getAllSourceUrls(): Set<string> {
  const stmt = db.prepare("SELECT sourceUrl FROM articles WHERE sourceUrl IS NOT NULL");
  const rows = stmt.all() as { sourceUrl: string }[];
  return new Set(rows.map((r) => r.sourceUrl.trim()));
}

/**
 * 특정 sourceUrl이 이미 DB에 존재하는지 확인
 */
export function articleExistsBySourceUrl(sourceUrl: string): boolean {
  if (!sourceUrl) return false;
  const stmt = db.prepare("SELECT 1 FROM articles WHERE sourceUrl = ? LIMIT 1");
  return Boolean(stmt.get(sourceUrl.trim()));
}

/**
 * 특정 slug가 이미 DB에 존재하는지 확인
 */
export function isSlugExists(slug: string): boolean {
  if (!slug) return false;
  const stmt = db.prepare("SELECT 1 FROM articles WHERE slug = ? LIMIT 1");
  return Boolean(stmt.get(slug.trim()));
}

/**
 * 중복 없는 고유한 영문 슬러그 생성 (중복 시 타임스탬프 또는 난수 추가)
 */
export function ensureUniqueSlug(baseSlug: string): string {
  let cleanSlug = baseSlug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);

  if (!cleanSlug) {
    cleanSlug = "article";
  }

  // 중복이 없으면 그대로 사용
  if (!isSlugExists(cleanSlug)) {
    return cleanSlug;
  }

  // 중복 시 타임스탬프 부착
  const timestamp = Date.now().toString(36);
  const candidate = `${cleanSlug}-${timestamp}`;
  if (!isSlugExists(candidate)) {
    return candidate;
  }

  // 극단적 중복 시 추가 난수 부착
  const random = Math.floor(Math.random() * 10000);
  return `${cleanSlug}-${timestamp}-${random}`;
}

/**
 * sitemap 생성 및 사전 렌더링용 전체 slug 목록 조회
 */
export function getAllArticleSlugs(): { slug: string; updatedAt: string }[] {
  const stmt = db.prepare("SELECT slug, updatedAt FROM articles ORDER BY createdAt DESC");
  return stmt.all() as { slug: string; updatedAt: string }[];
}

/**
 * 최근 발행된 기사들의 썸네일 URL Set을 조회하여 신규 기사와의 썸네일 중복(Collision)을 원천 방지
 */
export function getRecentThumbnailUrls(limit: number = 60): Set<string> {
  const stmt = db.prepare(
    "SELECT thumbnailUrl FROM articles WHERE thumbnailUrl IS NOT NULL ORDER BY id DESC LIMIT ?"
  );
  const rows = stmt.all(limit) as { thumbnailUrl: string }[];
  return new Set(rows.map((r) => r.thumbnailUrl).filter(Boolean));
}

/**
 * 초기 테스트 및 데모용 시드 데이터 적재
 */
export function seedArticlesIfNeeded(): void {
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM articles");
  const { count } = countStmt.get() as { count: number };

  if (count > 0) return;

  const sampleArticles: CreateArticleInput[] = [
    {
      title: "2026 청년 주택드림 청약통장 자격 요건 및 신청 방법 총정리",
      slug: "youth-housing-dream-account-2026-guide",
      category: "정책·지원금",
      summary: "1. 만 19~34세 무주택 청년을 대상으로 연 소득 5,000만원 이하 시 최대 연 4.5% 금리 혜택을 제공합니다.\n2. 청약 당첨 시 분양가의 최대 80%까지 최저 연 2.2% 고정 저리 대출(주택드림대출)이 연계 지원됩니다.\n3. 전국 주요 시중은행 모바일 뱅킹 앱 또는 영업점에서 소득확인증명서 제출을 통해 즉시 가입 가능합니다.",
      content: `
청년 계층의 주거 안정과 내 집 마련 자산 형성을 원스톱으로 지원하는 '2026 청년 주택드림 청약통장'의 핵심 개편 내용과 신청 절차를 친절하게 정리해 드립니다.

## 누가 받을 수 있나? (지원 대상 및 자격 요건)

기존 청년 우대형 청약통장 대비 소득 기준이 대폭 완화되어 보다 폭넓은 청년층이 혜택을 누릴 수 있습니다.

- **연령 기준:** 만 19세 이상 ~ 만 34세 이하 청년 (병역 복무 기간 최대 6년 인정 시 최고 만 40세까지)
- **소득 요건:** 직전 연도 신고 소득 5,000만 원 이하 (근로소득, 사업소득, 프리랜서 포함)
- **주택 소유 여부:** 가입 시점 기준 무주택자 (세대주 여부 무관)

## 무엇이 얼마나 달라지나? (핵심 변경 혜택 및 지원 내용)

단순 이자율 혜택을 넘어, 실제 아파트 청약 당첨 시 초저리 장기 분양 대출로 직결되는 파격적인 혜택이 주어집니다.

1. **우대 금리 제공:** 납입 기간 2년 이상 시 최대 연 4.5%의 높은 우대 금리 적용
2. **소득공제 및 비과세:** 연간 납입액(최대 300만 원)의 40% 소득공제 및 이자소득 500만 원까지 비과세
3. **주택드림 연계 대출:** 본 통장으로 청약 당첨 시, 분양가 6억 원 이하·전용면적 85㎡ 이하 주택에 대해 최저 연 2.2% 금리로 최장 40년 만기 주택담보대출 지원

## 어떻게 신청하나? (신청 방법, 일정, 주의사항)

- **신청 장소:** KB국민, 신한, 하나, 우리, NH농협, IBK기업 등 전국 주택청약 수탁은행 영업점 또는 공식 모바일 뱅킹 앱
- **준비 서류:** 주민등록등본, 직전년도 소득확인증명서(청년우대형 청약통장용), 신분증
- **기존 가입자 전환:** 기존 '청년우대형 청약통장' 가입자는 별도 신청 없이 자동 전환되며, 일반 '주택청약종합저축' 가입자는 자격 충족 시 전환 신청을 통해 기존 납입 횟수와 납입액을 100% 승계받을 수 있습니다.
      `.trim(),
      metaTitle: "2026 청년 주택드림 청약통장 자격 요건 및 신청 방법 총정리 | 정책 가이드",
      metaDescription: "최대 4.5% 금리와 최저 2.2% 연계 대출을 지원하는 2026 청년 주택드림 청약통장 신청 자격과 소득 기준, 전환 방법을 상세히 안내합니다.",
      thumbnailUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
      sourceUrl: "https://www.molit.go.kr",
      createdAt: new Date().toISOString(),
    },
    {
      title: "구글 딥마인드, 차세대 에이전트 AI 프레임워크 공개 및 엔터프라이즈 도입 가속화",
      slug: "google-deepmind-next-gen-agent-framework",
      category: "테크·IT",
      summary: "1. 구글 딥마인드가 자율 판단과 도구 호출 능력을 대폭 강화한 차세대 에이전트 프레임워크를 공개했습니다.\n2. 복잡한 워크플로우를 서브에이전트 협업으로 분할 처리하여 태스크 완료율을 40% 이상 개선했습니다.\n3. 기업용 클라우드 환경과의 통합 가이드를 함께 배포하여 산업 전반의 AI 적용 속도가 빨라질 전망입니다.",
      content: `
구글 딥마인드가 인공지능 에이전트의 실시간 문제 해결 및 도구 조작 능력을 혁신적으로 향상시킨 새로운 아키텍처를 공식 발표했습니다.

## 핵심 기술 변화: 다중 에이전트 협업 시스템

기존 단일 LLM 중심의 명령 수행 방식에서 벗어나, 이번 프레임워크는 작업을 계획하는 플래너 에이전트와 도구를 직접 실행하는 워커 에이전트로 역할을 명확히 분리했습니다.

- **자율 계획 수립(Autonomous Planning):** 복잡한 목표를 수신하면 3단계 이상의 하위 계획을 수립하고 조건 분기를 처리합니다.
- **실시간 도구 피드백 루프:** 코드 실행, 브라우저 탐색, DB 쿼리 등의 결과를 실시간 피드백 받아 오류 발생 시 즉시 우회 전략을 마련합니다.
- **저지연 최적화:** 토큰 소모를 줄이면서도 추론 속도를 2배 이상 끌어올렸습니다.

## 엔터프라이즈 환경에서의 시사점

이번 기술 공개는 단순 챗봇을 넘어 소프트웨어 엔지니어링, 데이터 분석, 금융 모델링 등 고도의 전문 분야에서 에이전트가 실질적인 협업자로 안착할 수 있는 토대를 마련했다는 평가를 받고 있습니다.
      `.trim(),
      metaTitle: "구글 딥마인드 차세대 에이전트 AI 프레임워크 공개 | AI 뉴스",
      metaDescription: "구글 딥마인드가 발표한 자율 판단과 멀티 에이전트 협업 중심의 차세대 AI 프레임워크 핵심 요약 및 엔터프라이즈 분석.",
      thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      sourceUrl: "https://deepmind.google/discover/blog/",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      title: "글로벌 기준금리 동향과 2026 하반기 금융 시장 투자 전망",
      slug: "global-interest-rate-financial-market-outlook-2026",
      category: "금융·경제",
      summary: "1. 주요국 중앙은행들의 통화정책 완화 기조 속에 금리 인하 사이클이 본격화되고 있습니다.\n2. 예금 및 채권 수익률 변화에 대응하여 고정 수익형 자산과 배당주 중심의 포트폴리오 재편이 주목받고 있습니다.\n3. 부동산 PF 시장 및 가계대출 건전성 지표가 향후 금융권 건전성의 핵심 변수로 지목됩니다.",
      content: `
글로벌 주요 중앙은행들의 금리 인하 기조와 함께 하반기 가계 및 기업 금융 환경에 큰 변화가 예상되고 있습니다.

## 누가 영향받나? (적용 대상 및 시장 참여자)

- **대출 이용자:** 변동금리 주택담보대출 및 신용대출을 보유한 차주의 이자 상환 부담 경감
- **예금 생활자:** 고금리 예적금 만기 도래에 따른 대체 투자처 발굴 필요성 대두
- **기업 자금조달:** 회사채 발행 금리 하락으로 설비 투자 및 차환 발행 여건 개선

## 무엇이 얼마나 달라지나? (핵심 금융 환경 변화)

기존의 고금리 긴축 국면에서 점진적인 유동성 공급 국면으로 전환되면서 자산 배분 전략의 획기적인 수정이 요구됩니다.

- **대출 금리 인하 체감:** 기준금리 인하에 발맞추어 코픽스(COFIX) 연동 대출금리 점진적 안정세
- **포트폴리오 다변화:** 단기 파킹통장에서 장기 우량 국채 및 배당 성장 ETF로의 자금 이동 가속화

## 어떻게 대응하나? (금융 소비자를 위한 행동 요령)

1. **대출 갈아타기(대환) 점검:** 온라인 원스톱 대환대출 인프라를 활용하여 더 낮은 금리의 상품으로 적극적인 교체 검토
2. **중도상환수수료 감면 조건 확인:** 만기 전 상환 시 수수료 면제 시점을 확인하여 대출 다이어트 실행
3. **분산 투자 원칙 준수:** 특정 자산 몰빵을 지양하고 금리 변동성에 대비한 리스크 관리 병행
      `.trim(),
      metaTitle: "글로벌 기준금리 동향과 2026 하반기 금융 시장 투자 전망 | 금융 브리핑",
      metaDescription: "금리 인하 사이클 도래에 따른 대출 이자 경감 효과와 하반기 자산 관리 및 갈아타기 전략을 심층 점검합니다.",
      thumbnailUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      sourceUrl: "https://example.com/financial-outlook-2026",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  for (const article of sampleArticles) {
    createArticle(article);
  }
}
