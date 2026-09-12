import { fetchRssFeeds } from "../src/lib/rss";
import { RSS_FEEDS } from "../src/config/rssFeeds";

async function main() {
  console.log("=== 신규 소상공인 피드 수집 테스트 ===");
  const targetFeeds = RSS_FEEDS.filter((f) =>
    ["portal-semas", "portal-bizinfo", "portal-korea-kr-smallbiz"].includes(f.id)
  );

  console.log(`대상 피드 (${targetFeeds.length}개):`);
  targetFeeds.forEach((f) => console.log(` - [${f.id}] ${f.name} (${f.url})`));

  const result = await fetchRssFeeds(targetFeeds);
  console.log("\n전체 수집 결과:");
  console.log(`- 전체 수집된 아이템 수: ${result.totalFetched}`);
  console.log(`- 신규 선별 아이템 수: ${result.newItemsCount}`);
  console.log(`- 키워드 필터링 통과 아이템 (${result.items.length}개):`);

  const smallBizItems = result.items.filter((item) =>
    item.title.includes("소상공인") ||
    item.title.includes("자영업자") ||
    item.title.includes("소진공") ||
    item.title.includes("기업마당") ||
    item.title.includes("정책자금")
  );

  console.log(`\n소상공인 관련 아이템 (${smallBizItems.length}개 발견):`);
  smallBizItems.slice(0, 5).forEach((item, idx) => {
    console.log(`[${idx + 1}] ${item.title}`);
    console.log(`    카테고리: ${item.category} | 피드: ${item.feedTitle}`);
    console.log(`    링크: ${item.link}`);
    console.log(`    발행일: ${item.pubDate}`);
    console.log(`    매칭 키워드: ${item.matchedKeywords?.join(", ")}`);
  });
}

main().catch(console.error);
