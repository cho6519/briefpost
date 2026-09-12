import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, title, category, content FROM articles WHERE id IN (1, 2, 3, 4, 6, 7, 8, 9, 11) ORDER BY id ASC").all();

for (const r of rows) {
  console.log(`==================== [ID ${r.id}] ${r.title} ====================`);
  console.log(`Category: ${r.category}`);
  const lines = r.content.split("\n");
  const headings = lines.filter((l) => /^#{1,4}\s/.test(l));
  console.log("Headings:", headings);
}
