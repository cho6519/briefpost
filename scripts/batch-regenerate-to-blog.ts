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

import Database from "better-sqlite3";
import { rewriteArticleWithAI } from "../src/lib/ai";
import { verifyAndSanitizeArticle } from "../src/lib/articleValidator";

const dbPath = path.join(process.cwd(), "data", "news.db");
const backupPath = path.join(process.cwd(), "data", "news.db.backup.blog");

// 안전 백업
fs.copyFileSync(dbPath, backupPath);
console.log(`[안전 백업 완료] ${backupPath}`);

const db = new Database(dbPath);

async function main() {
  console.log("================================================================================");
  console.log("🚀 [BriefPost] 전체 기사 대상 '친절한 완독 블로그 가이드' 일괄 재생성 시작");
  console.log("================================================================================\n");

  const rows = db.prepare("SELECT id, title, slug, content, summary, category, sourceUrl, thumbnailUrl FROM articles ORDER BY id DESC").all() as any[];
  console.log(`• 총 대상 기사 수: ${rows.length}편\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const article = rows[i];
    const indexStr = `[${i + 1}/${rows.length}]`;
    const noSpaceLen = (article.content || "").replace(/\s+/g, "").length;
    const hasSelfCheck = (article.content || "").includes("자가진단") || (article.content || "").includes("30초 컷");
    const isFriendlyTone = (article.content || "").includes("해요") || (article.content || "").includes("해 보세요") || (article.content || "").includes("정리해 드릴게요");

    // 이미 블로그 스타일이면서 충분한 분량인 경우 스킵
    if (hasSelfCheck && isFriendlyTone && noSpaceLen >= 1500) {
      console.log(`⏩ ${indexStr} ID ${article.id}: 이미 최신 블로그 포스팅 형식이므로 건너뜁니다.`);
      skippedCount++;
      continue;
    }

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`📌 ${indexStr} ID ${article.id} | "${article.title.slice(0, 35)}"`);
    console.log(`   - 기존 분량: 공백 제외 ${noSpaceLen}자`);
    console.log(`   - 카테고리: ${article.category}`);
    console.log(`   ⏳ 친절한 블로그 완독 가이드로 재생성 중...`);

    let success = false;
    let retries = 0;

    while (!success && retries < 2) {
      try {
        const rewritten = await rewriteArticleWithAI({
          title: article.title,
          content: article.content,
          category: article.category,
          link: article.sourceUrl || undefined,
        });

        const validation = verifyAndSanitizeArticle({
          title: rewritten.title,
          slug: rewritten.slug || article.slug,
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

        // DB 즉시 업데이트 (기존 ID 유지)
        const updateStmt = db.prepare(`
          UPDATE articles SET
            title = @title,
            slug = @slug,
            content = @content,
            summary = @summary,
            category = @category,
            metaTitle = @metaTitle,
            metaDescription = @metaDescription,
            faq = @faq,
            ctaType = @ctaType,
            imageTheme = @imageTheme,
            highlightBadge = @highlightBadge,
            card_title = @card_title,
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = @id
        `);

        // 슬러그 고유성 체크: 다른 기사에서 이미 사용 중인지 확인
        let finalSlug = valid.slug;
        const dupCheck = db.prepare("SELECT id FROM articles WHERE slug = ? AND id != ?").get(finalSlug, article.id);
        if (dupCheck) {
          finalSlug = `${finalSlug}-${article.id}`;
        }

        updateStmt.run({
          id: article.id,
          title: valid.title,
          slug: finalSlug,
          content: valid.content,
          summary: valid.summary,
          category: valid.category,
          metaTitle: valid.metaTitle,
          metaDescription: valid.metaDescription,
          faq: rewritten.faq ? JSON.stringify(rewritten.faq) : null,
          ctaType: rewritten.ctaType || "general",
          imageTheme: rewritten.imageTheme || "policy",
          highlightBadge: rewritten.highlightBadge || null,
          card_title: rewritten.card_title || valid.title.slice(0, 16),
        });

        updatedCount++;
        success = true;

        console.log(`   ✅ 블로그형 변환 완료!`);
        console.log(`      • 신규 제목: ${valid.title}`);
        console.log(`      • 신규 분량: 공백 제외 ${newNoSpaceLen}자 (공백 포함 ${valid.content.length}자)`);
        console.log(`      • 자가진단표: ${valid.content.includes("자가진단") ? "✅ 포함" : "❌ 미포함"}`);
        console.log(`      • 비교표: ${valid.content.includes("|") ? "✅ 포함" : "❌ 미포함"}`);
        console.log(`      • FAQ: ${rewritten.faq ? `${rewritten.faq.length}개 탑재` : "없음"}`);

        // API Rate Limit 방지를 위한 3초 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err: unknown) {
        retries++;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`   ⚠️ [재시도 ${retries}/2] 생성 오류 발생: ${msg}`);

        if (msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests")) {
          console.log(`   ⏳ Rate limit 대기: 20초간 휴식 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, 20000));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    if (!success) {
      failedCount++;
      console.error(`   ❌ [실패] ID ${article.id} 재생성 실패 (기존 내용 유지)`);
    }
  }

  console.log("\n================================================================================");
  console.log(`🎉 [일괄 재생성 완료] 총 기사: ${rows.length}편 | 갱신 성공: ${updatedCount}편 | 기존 유지: ${skippedCount}편 | 실패: ${failedCount}편`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
