import Database from "better-sqlite3";
import {
  verifyAndSanitizeArticle,
  normalizeThreeLineSummary,
  sanitizePlainText,
  repairMismatchedHeadings,
} from "../src/lib/articleValidator";

const db = new Database("./data/news.db");

console.log("=== [DB 기사 무결성 및 태그 정제 클린업 시작] ===");

interface DbArticle {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  category: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

const articles = db.prepare("SELECT * FROM articles").all() as DbArticle[];
console.log(`총 ${articles.length}건의 기사 검사 중...`);

let cleanedCount = 0;

const updateStmt = db.prepare(`
  UPDATE articles
  SET title = @title,
      summary = @summary,
      content = @content,
      category = @category,
      metaTitle = @metaTitle,
      metaDescription = @metaDescription,
      updatedAt = datetime('now')
  WHERE id = @id
`);

for (const article of articles) {
  let wasModified = false;

  // 1. 제목 정제
  const cleanTitle = sanitizePlainText(article.title || "");
  if (cleanTitle !== article.title) wasModified = true;

  // 2. 3줄 요약 정제 및 태그 제거
  const { summary: cleanSummary, wasRepaired: summaryRepaired } = normalizeThreeLineSummary(
    article.summary || "",
    article.content || "",
    cleanTitle
  );
  if (summaryRepaired || cleanSummary !== article.summary) wasModified = true;

  // 3. 본문 소제목 및 카테고리 불일치 자동 교정
  const { content: cleanContent, wasRepaired: contentRepaired } = repairMismatchedHeadings(
    article.content || "",
    article.category || "정책·지원금",
    cleanTitle
  );
  if (contentRepaired || cleanContent !== article.content) wasModified = true;

  // 4. 종합 품질 검증 게이트
  const validated = verifyAndSanitizeArticle({
    title: cleanTitle,
    slug: article.slug,
    summary: cleanSummary,
    content: cleanContent,
    category: article.category,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
  });

  const finalArticle = validated.sanitized;

  if (
    wasModified ||
    finalArticle.summary !== article.summary ||
    finalArticle.content !== article.content
  ) {
    updateStmt.run({
      id: article.id,
      title: finalArticle.title,
      summary: finalArticle.summary,
      content: finalArticle.content,
      category: finalArticle.category,
      metaTitle: finalArticle.metaTitle,
      metaDescription: finalArticle.metaDescription,
    });

    cleanedCount++;
    console.log(`[정제 완료] ID: ${article.id} | [${article.category}] ${finalArticle.title.slice(0, 40)}`);
  }
}

console.log(`=== [클린업 완료: 총 ${articles.length}건 중 ${cleanedCount}건 정상 정제 및 교정 완료] ===`);
