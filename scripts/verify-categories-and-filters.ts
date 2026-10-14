import { getArticles, getArticlesAsync, getAllCategories, getAllArticleSlugs } from "../src/lib/articles";

async function verify() {
  console.log("================================================================================");
  console.log("🔍 [검증] 애드센스 대비 카테고리별 노출 및 Thin/Draft 필터링 검증");
  console.log("================================================================================");

  // 1. 전체 카테고리 목록
  const categories = getAllCategories();
  console.log("1. 노출되는 5대 카테고리 (GNB):", categories);

  // 2. 전체 기사 (all)
  const allArticles = await getArticlesAsync({ page: 1, limit: 100 });
  console.log(`\n2. 전체 공개 기사 수: ${allArticles.total}건`);

  // Thin content(1,500자 미만) 잔여 여부 검증
  const thinRemaining = allArticles.articles.filter((a) => a.content.length < 1500);
  console.log(`- 1,500자 미만 Thin Content 잔여: ${thinRemaining.length}건 (목표: 0건)`);
  if (thinRemaining.length > 0) {
    console.error("❌ Thin content가 노출되고 있습니다:", thinRemaining.map((t) => t.title));
  } else {
    console.log("✅ 1,500자 미만 글 전면 차단 성공!");
  }

  // 3. 5대 카테고리별 기사 조회 및 빈 화면 여부 검증
  console.log("\n3. 5대 카테고리별 기사 목록 및 빈 화면 여부 검증:");
  for (const cat of categories) {
    const res = await getArticlesAsync({ category: cat, page: 1, limit: 10 });
    console.log(`\n👉 [카테고리: ${cat}] 총 ${res.total}건 (조회된 기사 ${res.articles.length}건)`);
    if (res.total === 0) {
      console.error(`❌ [경고] '${cat}' 카테고리에 기사가 0건입니다! (빈 화면 발생 위험)`);
    } else {
      console.log(`✅ [정상] 빈 화면 없음. 최신 대표 기사:`);
      for (const art of res.articles.slice(0, 3)) {
        console.log(`   - [ID ${art.id}] (${art.content.length}자) ${art.title}`);
      }
    }
  }

  // 4. 사이트맵용 슬러그 검증
  const slugs = getAllArticleSlugs();
  console.log(`\n4. 사이트맵(sitemap.xml) 등록 대상 고품질 기사 수: ${slugs.length}건`);
}

verify().catch(console.error);
