import fs from "fs";
import path from "path";
import { fetchRssFeeds } from "../src/lib/rss";
import { rewriteArticleWithAI } from "../src/lib/ai";
import {
  createArticle,
  ensureUniqueSlug,
  articleExistsBySourceUrl,
} from "../src/lib/articles";
import { verifyAndSanitizeArticle } from "../src/lib/articleValidator";

/**
 * .env.local 파일이 존재할 경우 환경변수 안전 로드 (로컬 수동 실행용)
 */
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

async function main() {
  const startTime = Date.now();
  console.log("================================================================================");
  console.log("🤖 [BriefPost Auto Runner] 뉴스 기사 자동 수집 및 AI 퍼블리싱 파이프라인 가동");
  console.log(`• 시작 일시: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (KST)`);
  console.log("================================================================================");

  // 1. API 키 확인
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) {
    console.warn("⚠️ [경고] GEMINI_API_KEY 환경변수가 설정되지 않았습니다. AI 가공이 실패할 수 있습니다.");
  } else {
    const aiModel = process.env.AI_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash";
    console.log(`✅ Google Gemini API Key 확인 완료 (지정 모델: ${aiModel})`);
  }

  // 한 번에 발행할 기사 개수 (명령줄 인자 우선, 없으면 환경변수, 없으면 3~4개 자연스러운 수량 자동 배정)
  const argLimit = parseInt(process.argv[2], 10);
  const envLimit = parseInt(process.env.PUBLISH_LIMIT || "", 10);
  const defaultRandomLimit = Math.floor(Math.random() * 2) + 3; // 3 또는 4건 자연스러운 분배
  const limit = !isNaN(argLimit) && argLimit > 0 ? argLimit : (!isNaN(envLimit) && envLimit > 0 ? envLimit : defaultRandomLimit);
  console.log(`• 1회 최대 발행 목표 수량(limit): ${limit}건 (설정 기준: 1회당 3~4건)`);

  // 2. 활성화된 RSS 피드 전체 수집
  console.log("\n📡 [1/3] 등록된 공공·언론사 RSS 피드 수집 시작...");
  const rssResult = await fetchRssFeeds();

  console.log(`• 원문 수집 총계:          ${rssResult.totalFetched}건`);
  console.log(`• DB 기존 중복 제외:        ${rssResult.skippedCount}건`);
  console.log(`• 7일 지난 기사 제외:       ${rssResult.expiredCount ?? 0}건`);
  console.log(`• 단순 기관 동정/행사 제외: ${rssResult.noticeSkippedCount ?? 0}건`);
  console.log(`• 타겟 키워드 미포함 제외:  ${rssResult.noKeywordSkippedCount ?? 0}건`);
  console.log(`• 🎯 알짜 키워드 매칭 후보:  ${rssResult.newItemsCount}건`);

  const candidates = rssResult.items.slice(0, limit);
  if (candidates.length === 0) {
    console.log("\nℹ️ 새로 발행할 신규 기사 후보가 없어 작업을 정상 종료합니다.");
    process.exit(0);
  }

  console.log(`\n🧠 [2/3] AI 패러프레이징 및 기사 품질 검증 루프 시작 (대상: ${candidates.length}건)`);
  const publishedArticles = [];
  const failedItems = [];

  for (let i = 0; i < candidates.length; i++) {
    const rawItem = candidates[i];
    const indexStr = `[${i + 1}/${candidates.length}]`;

    try {
      // 2차 중복 체크 (DB 실시간 확인)
      if (articleExistsBySourceUrl(rawItem.link)) {
        console.log(`⏩ ${indexStr} 이미 DB에 존재하는 기사(URL 중복) 건너뜀: ${rawItem.title}`);
        continue;
      }

      const keywordInfo = rawItem.matchedKeywords?.length ? ` [매칭 키워드: ${rawItem.matchedKeywords.join(", ")} | 가중치: ${rawItem.keywordScore}점]` : "";
      console.log(`\n✍️ ${indexStr}${keywordInfo} AI 재작성 진행 중...: "${rawItem.title.slice(0, 45)}"`);
      const rewritten = await rewriteArticleWithAI({
        title: rawItem.title,
        content: rawItem.content || rawItem.contentSnippet,
        category: rawItem.category,
        link: rawItem.link,
      });

      // 3. 기사 품질 및 3줄 요약 태그 검증
      const validation = verifyAndSanitizeArticle({
        title: rewritten.title,
        slug: rewritten.slug,
        summary: rewritten.summary,
        content: rewritten.content,
        category: rewritten.category || rawItem.category,
        metaTitle: rewritten.metaTitle,
        metaDescription: rewritten.metaDescription,
        thumbnailUrl: rawItem.thumbnailUrl,
        sourceUrl: rawItem.link,
      });

      if (!validation.isValid) {
        throw new Error(`품질 검증 미통과: ${validation.rejectionReason}`);
      }

      if (validation.repairedIssues.length > 0) {
        console.log(`🔧 ${indexStr} 자동 보정 적용: ${validation.repairedIssues.join(" | ")}`);
      }

      const validArticle = validation.sanitized;
      const uniqueSlug = ensureUniqueSlug(validArticle.slug);

      // 4. SQLite DB 저장
      const saved = createArticle({
        title: validArticle.title,
        slug: uniqueSlug,
        content: validArticle.content,
        summary: validArticle.summary,
        category: validArticle.category,
        metaTitle: validArticle.metaTitle ?? null,
        metaDescription: validArticle.metaDescription ?? null,
        thumbnailUrl: rawItem.thumbnailUrl,
        sourceUrl: rawItem.link,
        faq: rewritten.faq ? JSON.stringify(rewritten.faq) : null,
        ctaType: rewritten.ctaType || "general",
        imageTheme: rewritten.imageTheme || null,
        createdAt: new Date().toISOString(),
      });

      publishedArticles.push(saved);
      console.log(`✅ ${indexStr} 발행 성공! [ID: ${saved.id}] [${saved.category}] "${saved.title}" (slug: ${saved.slug})`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${indexStr} 처리 실패 ("${rawItem.title}"):`, errMsg);
      failedItems.push({ title: rawItem.title, error: errMsg });
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n================================================================================");
  console.log(`🎉 [3/3] 파이프라인 완료! (총 소요시간: ${durationSec}초)`);
  console.log(`• 최종 발행 성공: ${publishedArticles.length}건`);
  console.log(`• 처리 실패 건수: ${failedItems.length}건`);
  console.log("================================================================================\n");

  if (publishedArticles.length === 0 && failedItems.length > 0) {
    process.exit(1);
  }
}

main().catch((fatalErr) => {
  console.error("💥 [FATAL ERROR] 파이프라인 치명적 오류:", fatalErr);
  process.exit(1);
});
