import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));

// 1. ID 10에 ## 4. 부여
const id10 = db.prepare("SELECT content FROM articles WHERE id = 10").get();
if (id10) {
  let content = id10.content;
  content = content.replace(/#\s*\n+###\s*독자를 위한 추천 감상 가이드/, "## 4. 향후 문학적 평가 및 감상 가이드\n\n### 독자를 위한 추천 감상 가이드");
  db.prepare("UPDATE articles SET content = ? WHERE id = 10").run(content);
  console.log("[ID 10] ## 4. 헤딩 추가 완료");
}

// 2. ID 29, 35, 36 불릿 리스트 간격 및 문단 여백 보완
for (const id of [29, 35, 36]) {
  const row = db.prepare("SELECT content FROM articles WHERE id = ?").get(id);
  if (row) {
    let content = row.content;
    // 불릿 리스트 사이에 빈 줄을 주어 가독성을 더욱 높임
    content = content.replace(/\n(-\s+\*\*)/g, "\n\n$1");
    content = content.replace(/\n{3,}/g, "\n\n");
    db.prepare("UPDATE articles SET content = ? WHERE id = ?").run(content, id);
    console.log(`[ID ${id}] 리스트 간격 및 가독성 최적화 완료`);
  }
}

// 3. 전체 기사 전수 재스캔: 오직 정확히 4개의 ## 1. ~ ## 4. 만 남기고 비대제목은 일괄 ### 으로 확정
const allRows = db.prepare("SELECT id, content FROM articles").all();
for (const r of allRows) {
  const lines = r.content.split("\n");
  const fixed = lines.map((line) => {
    const trimmed = line.trim();
    if (/^##\s+/.test(trimmed) && !/^##\s+[1-4]\./.test(trimmed)) {
      return `### ${trimmed.replace(/^##\s+/, "")}`;
    }
    return line;
  });
  const newContent = fixed.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (newContent !== r.content) {
    db.prepare("UPDATE articles SET content = ? WHERE id = ?").run(newContent, r.id);
  }
}

console.log("=== polish-final-perfection 완료 ===");
