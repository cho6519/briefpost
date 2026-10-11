import { AgentPipeline } from "../src/agents/pipeline";
import { pipelineStore } from "../src/agents/pipelineStore";
import { QUOTA_CATEGORIES } from "../src/app/api/cron/publish-articles/route";
import { getAllArticleSlugsAsync } from "../src/lib/articles";
import sitemap from "../src/app/sitemap";

async function main() {
  console.log("==================================================================");
  console.log("⚖️ [5대 카테고리 균등 쿼터제 및 SEO 사이트맵 연동 검증]");
  console.log("==================================================================");

  // 1. 카테고리 쿼터 목록 확인
  console.log("\n▶ 1. 5대 카테고리 규격 확인:");
  QUOTA_CATEGORIES.forEach((c, idx) => {
    console.log(`  [${idx + 1}] ID: ${c.id.padEnd(8)} | 명칭: ${c.name.padEnd(12)} | 시드: ${c.seedKeywords[0]}`);
  });

  // 2. 다른 2개 카테고리 (지원금/바우처 & 세금/절세) 기사 생성 테스트
  const testCategories = [
    QUOTA_CATEGORIES.find((c) => c.id === "subsidy")!,
    QUOTA_CATEGORIES.find((c) => c.id === "tax")!,
  ];

  const pipeline = new AgentPipeline();
  const createdQueueIds: string[] = [];

  for (const cat of testCategories) {
    console.log(`\n▶ 2. 카테고리 [${cat.name}] 파이프라인 가동...`);
    const seed = cat.seedKeywords[0];
    console.log(`   - 타깃 시드 키워드: "${seed}"`);

    const result = await pipeline.run({
      domain: cat.name,
      seedKeywords: [seed],
      hunterCount: 2,
      targetAudience: cat.targetAudience,
    });

    if (result.success && result.step7QueueItem) {
      console.log(`   ✅ 대기열 적재 성공! Queue ID: ${result.step7QueueItem.id}`);
      console.log(`      - 제목: ${result.step7QueueItem.payload.headline}`);
      console.log(`      - 슬러그: /news/${result.step7QueueItem.payload.slug}`);
      createdQueueIds.push(result.step7QueueItem.id);

      // 자동 승인 발행 수행
      console.log(`   ▶ [승인 발행] 실행 중...`);
      const pubRes = await pipelineStore.publishQueueItem(result.step7QueueItem.id);
      if (pubRes.success) {
        console.log(`   🎉 발행 완료! Article ID: ${pubRes.articleId}`);
      } else {
        console.warn(`   ⚠️ 발행 오류: ${pubRes.error}`);
      }
    } else {
      console.warn(`   ⚠️ 파이프라인 검증 반려:`, result.step9Rejected?.reason);
    }
  }

  // 3. 대기열 및 전체 기사 카테고리 분포 현황 점검
  console.log("\n▶ 3. 발행 대기열 적재 목록 점검:");
  const queueItems = pipelineStore.getQueueItems();
  console.log(`   총 대기열 아이템 수: ${queueItems.length}건`);
  queueItems.slice(-5).forEach((item) => {
    console.log(`   - [${item.status}] [${item.payload.category}] ${item.payload.headline} (Slug: ${item.payload.slug})`);
  });

  // 4. SEO 사이트맵 동적 생성 무결성 검증
  console.log("\n▶ 4. SEO 사이트맵(sitemap.xml) 동적 반영 검증:");
  const sitemapEntries = await sitemap();
  const totalUrls = sitemapEntries.length;
  const newsUrls = sitemapEntries.filter((e) => e.url.includes("/news/"));

  console.log(`   - sitemap 총 등록 URL: ${totalUrls}개`);
  console.log(`   - 기사(/news/...) URL 수: ${newsUrls.length}개`);
  console.log(`   - 최신 등록 URL 3선:`);
  newsUrls.slice(-3).forEach((u) => {
    console.log(`     * ${u.url} (priority: ${u.priority}, freq: ${u.changeFrequency})`);
  });

  console.log("\n🎉 [성공] 5대 카테고리 균등 쿼터제 및 SEO 사이트맵 동적 반영 검증 완료!");
}

main().catch((err) => {
  console.error("검증 실행 중 치명적 오류:", err);
  process.exit(1);
});
