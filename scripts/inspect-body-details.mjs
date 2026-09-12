import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, summary, content FROM articles ORDER BY id ASC").all();

console.log("=== 전체 35건 기사 본문 첫 300자 및 소제목 전수 정밀 진단 ===");

for (const r of rows) {
  const headings = r.content.match(/^#{1,3}\s+[^\n]+/gm) || [];
  console.log(`\n================================================================`);
  console.log(`[ID: ${r.id}] [카테고리: ${r.category}]`);
  console.log(`제목: ${r.title}`);
  console.log(`소제목: ${headings.join(" | ")}`);
  console.log(`본문 서두: ${r.content.slice(0, 180).replace(/\n/g, " ")}...`);
}
