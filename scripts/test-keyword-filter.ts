import { fetchRssFeeds, TARGET_KEYWORDS, EXCLUDE_KEYWORDS } from "../src/lib/rss";

async function testFilter() {
  console.log("==================================================");
  console.log("🔍 키워드 가중치 필터 및 단순 기관 동정/행사 폐기 테스트");
  console.log("• 타겟 키워드 목록:", TARGET_KEYWORDS.join(", "));
  console.log("• 배제 키워드 목록:", EXCLUDE_KEYWORDS.join(", "));
  console.log("==================================================");

  const res = await fetchRssFeeds();

  console.log("\n================ [최종 필터링 요약] ================");
  console.log(`• 전체 수집된 원문:        ${res.totalFetched}건`);
  console.log(`• 7일 지난 기사 제외:      ${res.expiredCount ?? 0}건`);
  console.log(`• 단순 기관 동정/행사 폐기: ${res.noticeSkippedCount ?? 0}건`);
  console.log(`• 타겟 키워드 미포함 폐기:  ${res.noKeywordSkippedCount ?? 0}건`);
  console.log(`• 🎯 통과된 알짜 기사 건수: ${res.newItemsCount}건`);
  console.log("====================================================\n");

  console.log("📋 [키워드 가중치 상위 5건 기사 상세]");
  res.items.slice(0, 5).forEach((item, idx) => {
    console.log(
      `[${idx + 1}] 가중치: ${item.keywordScore}점 | 매칭: [${item.matchedKeywords?.join(", ")}]`
    );
    console.log(`    제목: "${item.title}"`);
    console.log(`    출처: ${item.feedTitle}\n`);
  });
}

testFilter();
