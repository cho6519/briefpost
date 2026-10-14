import { getArticlesAsync, PRIMARY_CATEGORIES } from "../src/lib/articles";

async function testGnbNavigation() {
  console.log("🔍 GNB 5대 카테고리 네비게이션 쿼리 테스트 시작...\n");

  // 1. 전체 조회 테스트
  const allResult = await getArticlesAsync({ page: 1, limit: 6 });
  console.log(`[전체] 총 ${allResult.total}개 기사, 1페이지에 ${allResult.articles.length}개 반환`);

  // 2. 5대 카테고리 각각 조회 테스트
  for (const cat of PRIMARY_CATEGORIES) {
    const res = await getArticlesAsync({ page: 1, limit: 6, category: cat });
    console.log(`\n[카테고리: ${cat}] 총 ${res.total}개 기사`);
    if (res.articles.length === 0) {
      console.error(`🚨 경고: [${cat}] 기사 목록이 비어 있습니다!`);
    } else {
      res.articles.forEach((a, idx) => {
        console.log(`  ${idx + 1}. [${a.category}] (${a.content.length}자) ${a.title}`);
      });
    }
  }
}

testGnbNavigation().catch(console.error);
