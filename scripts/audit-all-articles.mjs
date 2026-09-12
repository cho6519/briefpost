import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, content FROM articles WHERE id <= 21 ORDER BY id ASC").all();

console.log(`총 기사 수: ${rows.length}\n`);

for (const r of rows) {
  const lines = r.content.split("\n");
  const headings = lines.filter((l) => /^#{1,4}\s/.test(l));
  console.log(`------------------------------------------------------------`);
  console.log(`[ID ${r.id}] [${r.category}] ${r.title}`);
  console.log(`Slug: ${r.slug}`);
  console.log(`헤딩 목록 (${headings.length}개):`);
  headings.forEach((h) => console.log(`  ${h}`));
  
  // 첫 200자 요약
  const cleanBody = r.content.replace(/^#+.*$/gm, "").replace(/\n+/g, " ").trim();
  console.log(`본문 서두: ${cleanBody.slice(0, 150)}...`);
}
