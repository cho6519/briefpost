import Database from "better-sqlite3";
import path from "path";
import {
  cleanseHeadline,
  stripMediaAndPortalTags,
  normalizeThreeLineSummary,
  repairMismatchedHeadings,
} from "../src/lib/articleValidator";

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  category: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

async function migrateAllArticles() {
  const dbPath = path.join(process.cwd(), "data", "news.db");
  const db = new Database(dbPath);

  console.log("================================================================================");
  console.log("🧹 [기존 기사 전수 정제 마이그레이션] news.db 데이터베이스 일괄 클린업");
  console.log("================================================================================\n");

  const articles = db.prepare("SELECT * FROM articles ORDER BY id ASC").all() as ArticleRow[];
  console.log(`• 전체 대상 기사 수: 총 ${articles.length}건\n`);

  const updateStmt = db.prepare(`
    UPDATE articles
    SET title = @title,
        summary = @summary,
        content = @content,
        metaTitle = @metaTitle,
        metaDescription = @metaDescription
    WHERE id = @id
  `);

  let modifiedCount = 0;

  for (const article of articles) {
    const originalTitle = article.title;
    const originalSummary = article.summary || "";
    const originalContent = article.content || "";

    // 1. 제목 정제 (고정 태그 [심층 분석], : 핵심 쟁점과 향후 전망, 언론사명 제거)
    const cleanTitle = cleanseHeadline(originalTitle);

    // 2. 3줄 요약 정제 (언론사 대괄호 태그 [연합뉴스], [v.daum.net] 등 완벽 제거)
    const { summary: cleanSummary } = normalizeThreeLineSummary(
      originalSummary,
      originalContent,
      cleanTitle
    );

    // 3. 본문 정제 (언론사 찌꺼기 제거 및 소제목/인트로 교정)
    let cleanContent = stripMediaAndPortalTags(originalContent);
    // 본문 인트로에 ': 핵심 쟁점과 향후 전망을 심층 분석합니다.' 문구가 있으면 정갈하게 다듬음
    cleanContent = cleanContent
      .replace(/핵심 쟁점과 향후 전망을 심층 분석합니다\./g, "핵심 쟁점과 주요 세부 내용을 심층적으로 살펴봅니다.")
      .replace(/\[심층\s*분석\]/g, "");

    const headingRepaired = repairMismatchedHeadings(cleanContent, article.category, cleanTitle);
    cleanContent = headingRepaired.content;

    // 4. 메타데이터 정제
    const cleanMetaTitle = cleanseHeadline(article.metaTitle || `${cleanTitle} | Brief Post`);
    const cleanMetaDescription = stripMediaAndPortalTags(
      article.metaDescription || cleanSummary.replace(/\n/g, " ").slice(0, 130)
    );

    // 변경 여부 확인
    const isChanged =
      cleanTitle !== originalTitle ||
      cleanSummary !== originalSummary ||
      cleanContent !== originalContent;

    if (isChanged) {
      updateStmt.run({
        id: article.id,
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        metaTitle: cleanMetaTitle,
        metaDescription: cleanMetaDescription,
      });

      modifiedCount++;
      console.log(`[수정 ID: ${article.id}] [${article.category}]`);
      console.log(`  • 이전 제목: "${originalTitle}"`);
      console.log(`  • 변경 제목: "👉 ${cleanTitle}"`);
      console.log(`  • 정제 요약문 1행: ${cleanSummary.split("\n")[0]?.slice(0, 70)}...`);
      console.log("--------------------------------------------------------------------------------");
    }
  }

  console.log("\n================================================================================");
  console.log(`🎉 [마이그레이션 완료] 전체 ${articles.length}건 중 ${modifiedCount}건 정제 및 업데이트 완료!`);
  console.log("================================================================================\n");
}

migrateAllArticles();
