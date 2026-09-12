import Database from "better-sqlite3";
import { normalizeArticleContent } from "../src/lib/articleValidator";

const db = new Database("./data/news.db");

const rows = db.prepare("SELECT id, title, content FROM articles").all() as {
  id: number;
  title: string;
  content: string;
}[];

console.log(`Starting content normalization for ${rows.length} articles...`);

let updateCount = 0;
const updateStmt = db.prepare("UPDATE articles SET content = ? WHERE id = ?");

for (const row of rows) {
  const normalized = normalizeArticleContent(row.content);
  if (normalized !== row.content) {
    updateStmt.run(normalized, row.id);
    updateCount++;
    console.log(`[UPDATED] ID ${row.id}: ${row.title.slice(0, 30)}`);
  }
}

console.log(`\nMigration completed. ${updateCount} articles updated out of ${rows.length}.`);
