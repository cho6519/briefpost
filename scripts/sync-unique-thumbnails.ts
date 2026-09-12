import Database from "better-sqlite3";
import path from "path";
import { assignUniqueStockThumbnails, STOCK_IMAGE_POOL } from "../src/utils/imageMapper";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

interface ArticleRecord {
  id: number;
  slug: string;
  title: string;
  category: string;
  content: string;
  imageTheme: string | null;
  thumbnailUrl: string | null;
}

console.log("================================================================================");
console.log("🖼️ [BriefPost] 1:1 무중복 고화질 실사 스톡 이미지 일괄 매핑 스크립트");
console.log("================================================================================");

const articles = db
  .prepare("SELECT id, slug, title, category, content, imageTheme, thumbnailUrl FROM articles ORDER BY id ASC")
  .all() as ArticleRecord[];

console.log(`• DB 총 기사 수: ${articles.length}건`);

// 1:1 무중복 배정 알고리즘 실행
const mappedArticles = assignUniqueStockThumbnails(articles);

const urlCounts: Record<string, number> = {};
let duplicateCount = 0;

const updateStmt = db.prepare("UPDATE articles SET thumbnailUrl = @thumbnailUrl, imageTheme = @imageTheme WHERE id = @id");

const updateMany = db.transaction((list) => {
  for (const item of list) {
    urlCounts[item.assignedThumbnailUrl] = (urlCounts[item.assignedThumbnailUrl] || 0) + 1;
    if (urlCounts[item.assignedThumbnailUrl] > 1) {
      duplicateCount++;
    }

    updateStmt.run({
      id: item.id,
      thumbnailUrl: item.assignedThumbnailUrl,
      imageTheme: item.assignedTheme,
    });
  }
});

updateMany(mappedArticles);

console.log("\n📋 [매핑 결과 요약]");
mappedArticles.forEach((art, idx) => {
  const shortTitle = art.title.length > 30 ? art.title.slice(0, 28) + "..." : art.title;
  console.log(
    `[${idx + 1}/${mappedArticles.length}] ID: ${art.id.toString().padStart(2, " ")} | [${art.assignedTheme.padEnd(7, " ")}] "${shortTitle}" ➔ ${art.assignedThumbnailUrl.slice(0, 58)}...`
  );
});

console.log("\n================================================================================");
console.log(`✅ 배정 완료 통계:`);
console.log(`• 전체 기사 수: ${mappedArticles.length}건`);
console.log(`• 고유(Unique) URL 수: ${Object.keys(urlCounts).length}개`);
console.log(`• 중복 발생(Duplicates): ${duplicateCount}건 (목표: 0건)`);
console.log("================================================================================\n");

if (duplicateCount === 0 && Object.keys(urlCounts).length === mappedArticles.length) {
  console.log("🎉 성공! 모든 기사에 서로 다른 실사 이미지가 1:1로 겹침 없이 완벽 배정되었습니다!");
} else {
  console.warn("⚠️ 경고: 일부 URL이 겹쳤습니다. 알고리즘을 재확인하세요.");
}
