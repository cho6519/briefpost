import { fetchRssFeeds } from "../src/lib/rss";
import { rewriteArticleWithAI } from "../src/lib/ai";

async function runPromptTest() {
  console.log("================================================================================");
  console.log("🧪 [프롬프트 & 후처리 품질 개선 검증] 최신 알짜 기사 2건 재가공 테스트");
  console.log("================================================================================\n");

  const rssResult = await fetchRssFeeds();
  const candidates = rssResult.items.slice(0, 2);

  if (candidates.length === 0) {
    console.log("후보 기사가 없습니다.");
    return;
  }

  for (let i = 0; i < candidates.length; i++) {
    const raw = candidates[i];
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[기사 #${i + 1} 테스트]`);
    console.log(`• [원문 제목]: "${raw.title}"`);
    console.log(`• [원문 출처]: ${raw.feedTitle}`);
    console.log(`• [원문 카테고리]: ${raw.category}`);
    console.log(`--------------------------------------------------------------------------------`);

    const rewritten = await rewriteArticleWithAI({
      title: raw.title,
      content: raw.content || raw.contentSnippet,
      category: raw.category,
      link: raw.link,
    });

    console.log(`\n✨ [개선된 재가공 결과]`);
    console.log(`🏷️ 생성된 헤드라인 (Title):`);
    console.log(`👉 "${rewritten.title}"`);
    console.log(`   (글자수: ${rewritten.title.length}자 | 태그 포함 여부: ${rewritten.title.includes("[") ? "❌ 있음" : "✅ 없음"})`);

    console.log(`\n📝 생성된 3줄 요약문 (Summary):`);
    console.log(rewritten.summary);

    console.log(`\n🔗 생성된 슬러그 (Slug): ${rewritten.slug}`);
    console.log(`🏷️ 지정 카테고리 (Category): ${rewritten.category}`);
  }

  console.log("\n================================================================================");
  console.log("🎉 프롬프트 품질 개선 테스트 완료!");
  console.log("================================================================================\n");
}

runPromptTest();
