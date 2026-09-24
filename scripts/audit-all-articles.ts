import Database from "better-sqlite3";
import path from "path";
import { getArticleBySlug } from "../src/lib/articles";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

console.log("=== DB 전체 기사 슬러그 및 조회 전수 검사 ===");
const articles = db.prepare("SELECT id, slug, title, category FROM articles ORDER BY id DESC").all() as {
  id: number;
  slug: string;
  title: string;
  category: string;
}[];

console.log(`총 기사 수: ${articles.length}건`);

let errorCount = 0;
for (const a of articles) {
  if (!a.slug || a.slug.trim() === "") {
    console.error(`❌ [ID ${a.id}] 슬러그가 비어있습니다!`);
    errorCount++;
    continue;
  }

  // getArticleBySlug 검사
  const found = getArticleBySlug(a.slug);
  if (!found) {
    console.error(`❌ [ID ${a.id}] getArticleBySlug('${a.slug}') 조회 실패! (제목: ${a.title})`);
    errorCount++;
  }

  // URL 인코딩된 슬러그로도 조회 테스트
  const encoded = encodeURIComponent(a.slug);
  const foundByEncoded = getArticleBySlug(encoded);
  if (!foundByEncoded) {
    console.error(`⚠️ [ID ${a.id}] 인코딩된 슬러그('${encoded}') 조회 실패!`);
    errorCount++;
  }
}

if (errorCount === 0) {
  console.log("✅ DB 전체 102건 기사 슬러그 및 조회 테스트 100% 통과!");
} else {
  console.error(`❌ 총 ${errorCount}건의 조회 오류 발견!`);
}
