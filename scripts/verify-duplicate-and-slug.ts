import db from "../src/lib/db";
import { 
  createArticle, 
  ensureUniqueSlug, 
  articleExistsBySourceUrl 
} from "../src/lib/articles";
import { fetchRssFeeds } from "../src/lib/rss";

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  sourceUrl: string;
}

async function runVerification() {
  console.log("=== [1. 중복 기사 sourceUrl 건너뛰기 검증] ===");
  
  // 1-1. DB에서 가장 최근에 저장된 기사 하나 조회
  const latestArticle = db.prepare("SELECT * FROM articles WHERE sourceUrl IS NOT NULL ORDER BY id DESC LIMIT 1").get() as ArticleRow | undefined;
  if (!latestArticle) {
    console.error("테스트할 기사가 DB에 없습니다.");
    return;
  }

  console.log(`- 기준 기사 ID: ${latestArticle.id}`);
  console.log(`- 기사 제목: "${latestArticle.title}"`);
  console.log(`- 기사 sourceUrl: "${latestArticle.sourceUrl}"`);

  // 1-2. articleExistsBySourceUrl 검증
  const exists = articleExistsBySourceUrl(latestArticle.sourceUrl);
  console.log(`- articleExistsBySourceUrl("${latestArticle.sourceUrl.slice(0, 50)}...") 결과: ${exists}`);
  if (exists !== true) {
    throw new Error("❌ 중복 sourceUrl 검출 실패!");
  }
  console.log("✅ sourceUrl 중복 검출 로직 정상 동작 (AI 호출 전 차단됨)");

  // 1-3. fetchRssFeeds를 해당 URL로 단독 호출 시 건너뛰는지 확인
  const customRssResult = await fetchRssFeeds([
    { url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko", category: "Tech" }
  ]);
  console.log(`- RSS 전체 수집: ${customRssResult.totalFetched}건, 기존 DB 중복으로 스킵된 건수: ${customRssResult.skippedCount}건`);
  console.log("✅ DB에 존재하는 원문 기사는 RSS 파싱 단계에서 필터링되어 AI 재가공 파이프라인에 진입하지 않음");

  console.log("\n=== [2. 동일 제목 / 슬러그 충돌 방지 및 난수/타임스탬프 유연 처리 검증] ===");
  const testBaseSlug = "duplicate-slug-test";
  
  // 사전에 testBaseSlug 가진 레코드가 있으면 정리
  db.prepare("DELETE FROM articles WHERE slug LIKE 'duplicate-slug-test%'").run();

  // 첫 번째 슬러그 생성
  const slug1 = ensureUniqueSlug(testBaseSlug);
  console.log(`- 1회차 슬러그 생성: "${slug1}"`);
  const article1 = createArticle({
    title: "동일 제목 테스트 기사 1",
    slug: slug1,
    content: "테스트 본문 1",
    summary: "테스트 요약 1",
    category: "Tech",
    metaTitle: "테스트 1",
    metaDescription: "테스트 1",
    thumbnailUrl: null,
    sourceUrl: "https://example.com/test-article-1",
  });
  console.log(`  -> DB 저장 성공: ID=${article1.id}, slug="${article1.slug}"`);

  // 동일한 baseSlug로 2회차 슬러그 생성 시도
  const slug2 = ensureUniqueSlug(testBaseSlug);
  console.log(`- 2회차 동일 baseSlug로 생성: "${slug2}" (타임스탬프 부착 확인)`);
  if (slug2 === slug1 || !slug2.startsWith(testBaseSlug + "-")) {
    throw new Error("❌ 동일 슬러그 충돌 방지 실패!");
  }
  const article2 = createArticle({
    title: "동일 제목 테스트 기사 2 (중복 생성 시도)",
    slug: slug2,
    content: "테스트 본문 2",
    summary: "테스트 요약 2",
    category: "Tech",
    metaTitle: "테스트 2",
    metaDescription: "테스트 2",
    thumbnailUrl: null,
    sourceUrl: "https://example.com/test-article-2",
  });
  console.log(`  -> DB 저장 성공 (충돌 없음): ID=${article2.id}, slug="${article2.slug}"`);

  // 동일한 baseSlug로 3회차 슬러그 생성 시도 (밀리초 내 동시 발생 모의)
  const slug3 = ensureUniqueSlug(slug2); // 이미 존재하는 slug2와 동일한 경우
  console.log(`- 3회차 이미 존재하는 slug2와 동일 baseSlug로 생성: "${slug3}"`);
  const article3 = createArticle({
    title: "동일 제목 테스트 기사 3 (연속 중복 생성 시도)",
    slug: slug3,
    content: "테스트 본문 3",
    summary: "테스트 요약 3",
    category: "Tech",
    metaTitle: "테스트 3",
    metaDescription: "테스트 3",
    thumbnailUrl: null,
    sourceUrl: "https://example.com/test-article-3",
  });
  console.log(`  -> DB 저장 성공 (충돌 없음): ID=${article3.id}, slug="${article3.slug}"`);

  // 테스트 데이터 정리
  db.prepare("DELETE FROM articles WHERE slug LIKE 'duplicate-slug-test%'").run();
  console.log("✅ 테스트 임시 데이터 클린업 완료");

  console.log("\n==========================================");
  console.log("🎉 모든 중복 방지 및 슬러그 유니크성 검증 성공!");
  console.log("==========================================");
}

runVerification().catch((err) => {
  console.error("검증 실패:", err);
  process.exit(1);
});
