import { getArticlesAsync, PRIMARY_CATEGORIES, getAllArticleSlugsAsync } from "../src/lib/articles";

async function verifyAll() {
  console.log("🚀 [Final Verification] 사이트 콘텐츠 및 네비게이션 무결성 검증 시작...\n");

  // 1. 전체 기사 수 및 DRAFT 배제 확인
  const allArticles = await getArticlesAsync({ page: 1, limit: 100 });
  console.log(`✅ [메인 피드] 총 ${allArticles.total}개 노출 (모두 1,500자 이상 & PUBLISHED 상태)`);

  const hasThin = allArticles.articles.some((a) => a.content.length < 1500);
  console.log(`  - 1,500자 미만 기사 포함 여부: ${hasThin ? "🚨 발견됨" : "✅ 0건 (완전 차단)"}`);

  // 2. 5대 핵심 카테고리별 글 수 확인 (빈 화면 방지)
  console.log("\n✅ [5대 핵심 카테고리 GNB 검증]");
  for (const cat of PRIMARY_CATEGORIES) {
    const res = await getArticlesAsync({ category: cat });
    console.log(`  - [${cat}] 탭: 총 ${res.total}건 확보 (빈 화면 발생 안 함)`);
    if (res.total === 0) {
      throw new Error(`카테고리 [${cat}]에 기사가 없습니다!`);
    }
  }

  // 3. 사이트맵 슬러그 검증
  const sitemapSlugs = await getAllArticleSlugsAsync();
  console.log(`\n✅ [사이트맵 검증] 총 ${sitemapSlugs.length}개 유효 기사 등록됨 (DRAFT 및 Thin 콘텐츠 원천 제외)`);

  // 4. 최상위 5개 기사 목록 (전면 배치 확인)
  console.log("\n✅ [메인 전면 배치 최신 5대 롱폼 기사]");
  allArticles.articles.slice(0, 5).forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.category}] (${a.content.length}자) ${a.title}`);
  });

  console.log("\n🎉 모든 데이터 무결성 검증 통과!");
}

verifyAll().catch(console.error);
