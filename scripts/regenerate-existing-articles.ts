import fs from "fs";
import path from "path";

// 1. .env.local 안전 로드
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

import { getArticles, updateArticle, isSlugExists, Article } from "../src/lib/articles";
import { rewriteArticleWithAI } from "../src/lib/ai";
import { verifyAndSanitizeArticle } from "../src/lib/articleValidator";

async function main() {
  console.log("================================================================================");
  console.log("🚀 [BriefPost] 기존 발행 기사 롱폼(1,500~2,200자) 및 실전 콘텐츠 일괄 보강 스크립트");
  console.log("================================================================================\n");

  // 메인 화면에 노출되는 상위 기사 15편 조회
  const { articles } = getArticles({ limit: 15 });
  console.log(`• 메인 피드 최신 대상 기사: 총 ${articles.length}건 조회 완료\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const indexStr = `[${i + 1}/${articles.length}]`;
    const noSpaceLen = article.content.replace(/\s+/g, "").length;
    const hasSimul = article.content.includes("시뮬레이션");
    const hasChecklist = article.content.includes("체크리스트");
    const isBriefSlug = article.slug.startsWith("brief-");

    const needsUpdate = noSpaceLen < 1500 || !hasSimul || !hasChecklist || isBriefSlug;

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`📌 ${indexStr} ID ${article.id} | "${article.title.slice(0, 35)}"`);
    console.log(`   - 현재 글자 수: 공백 포함 ${article.content.length}자 / 공백 제외 ${noSpaceLen}자`);
    console.log(`   - 슬러그: ${article.slug} (${isBriefSlug ? "⚠️ 무의미한 해시" : "✅ 영문 키워드"})`);
    console.log(`   - 시뮬레이션: ${hasSimul ? "✅ 포함" : "❌ 누락"} | 체크리스트: ${hasChecklist ? "✅ 포함" : "❌ 누락"}`);

    if (!needsUpdate) {
      console.log(`   👉 이미 강화 기준을 완벽히 충족하므로 건너뜁니다.`);
      skippedCount++;
      continue;
    }

    console.log(`   ⏳ 강화된 롱폼 프롬프트로 재가공 진행 중...`);

    try {
      const rewritten = await rewriteArticleWithAI({
        title: article.title,
        content: article.content,
        category: article.category,
        link: article.sourceUrl || undefined,
      });

      const validation = verifyAndSanitizeArticle({
        title: rewritten.title,
        slug: rewritten.slug,
        summary: rewritten.summary,
        content: rewritten.content,
        category: rewritten.category || article.category,
        metaTitle: rewritten.metaTitle,
        metaDescription: rewritten.metaDescription,
        thumbnailUrl: article.thumbnailUrl,
        sourceUrl: article.sourceUrl,
      });

      const valid = validation.sanitized;
      const newNoSpaceLen = valid.content.replace(/\s+/g, "").length;

      // 슬러그 중복 확인 및 고유화
      let finalSlug = valid.slug;
      if (finalSlug !== article.slug && isSlugExists(finalSlug)) {
        finalSlug = `${finalSlug}-${article.id}`;
      }

      // DB 업데이트
      updateArticle(article.id, {
        title: valid.title,
        slug: finalSlug,
        content: valid.content,
        summary: valid.summary,
        category: valid.category,
        metaTitle: valid.metaTitle,
        metaDescription: valid.metaDescription,
        faq: rewritten.faq ? JSON.stringify(rewritten.faq) : null,
        ctaType: rewritten.ctaType,
        imageTheme: rewritten.imageTheme,
        highlightBadge: rewritten.highlightBadge,
        card_title: rewritten.card_title,
      });

      updatedCount++;
      console.log(`   ✅ 보강 완료!`);
      console.log(`      • 신규 글자 수: 공백 포함 ${valid.content.length}자 / 공백 제외 ${newNoSpaceLen}자`);
      console.log(`      • 신규 슬러그: ${finalSlug}`);
      console.log(`      • 타깃 뱃지: ${rewritten.highlightBadge || "N/A"}`);
      console.log(`      • 시뮬레이션: ${valid.content.includes("시뮬레이션") ? "✅ 추가됨" : "확인 필요"}`);
      console.log(`      • 체크리스트: ${valid.content.includes("체크리스트") ? "✅ 추가됨" : "확인 필요"}`);

      // API 호출 안정화를 위한 짧은 딜레이
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ [오류] 재가공 실패: ${msg}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`🎉 [보강 작업 완료] 총 대상: ${articles.length}건 | 갱신 성공: ${updatedCount}건 | 기존 유지: ${skippedCount}건`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
