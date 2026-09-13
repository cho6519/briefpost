import Database from "better-sqlite3";
import path from "path";
import { extractKeywordTitle } from "../src/lib/catchphraseExtractor";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

// 1. 컬럼 존재 여부 확인 및 컬럼 추가
const tableInfo = db.pragma("table_info(articles)") as { name: string }[];
const hasCardTitle = tableInfo.some((col) => col.name === "card_title");
if (!hasCardTitle) {
  console.log("Adding card_title column to articles table...");
  db.exec("ALTER TABLE articles ADD COLUMN card_title TEXT");
}

// 2. 전체 기사 조회
const articles = db.prepare("SELECT id, title, category, card_title FROM articles").all() as {
  id: number;
  title: string;
  category: string;
  card_title: string | null;
}[];

console.log(`\n총 ${articles.length}건의 기사에 대해 card_title 소급 마이그레이션을 시작합니다...\n`);

const updateStmt = db.prepare("UPDATE articles SET card_title = ? WHERE id = ?");

let updatedCount = 0;
for (const article of articles) {
  const generatedCardTitle = extractKeywordTitle(article.title);

  updateStmt.run(generatedCardTitle, article.id);
  updatedCount++;

  console.log(`[ID ${article.id}]`);
  console.log(`  원문 제목(h1): ${article.title}`);
  console.log(`  ➔ card_title: "${generatedCardTitle}" (${generatedCardTitle.length}자)\n`);
}

console.log(`================================================================`);
console.log(`🎉 성공적으로 ${updatedCount}건의 기사 card_title 마이그레이션 완료!`);
console.log(`================================================================`);
