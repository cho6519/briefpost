import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, title, category, content FROM articles WHERE id IN (27, 28, 30, 31)").all();

for (const r of rows) {
  console.log(`==================== [ID ${r.id}] ${r.title} ====================`);
  console.log(`Category: ${r.category}`);
  console.log(r.content);
}
