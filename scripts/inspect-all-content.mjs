import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, content FROM articles ORDER BY id ASC").all();

console.log("=== 전체 기사 35건 대제목(H2/H3) 및 본문 전수조사 ===");
for (const r of rows) {
  const headings = r.content.match(/^#{1,3}\s+[^\n]+/gm) || [];
  console.log(`\n================================================================`);
  console.log(`[ID: ${r.id}] [${r.category}] ${r.title}`);
  console.log(`- slug: ${r.slug}`);
  console.log(`- 헤딩 개수: ${headings.length}`);
  headings.forEach((h) => console.log("   " + h));
}
