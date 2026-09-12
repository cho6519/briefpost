import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, content FROM articles ORDER BY id ASC").all();

console.log("=== Fix Perfect Headings Line-by-Line ===");

for (const r of rows) {
  let content = r.content;

  // 1. 줄바꿈 정규화
  content = content.replace(/\r\n/g, "\n");

  // 2. 혹시나 이전에 잘못 생성된 '# \n\n## ' 또는 '## #' 형태 정제
  content = content.replace(/#\s*\n+##\s+/g, "### ");
  content = content.replace(/^##\s*#\s+/gm, "### ");

  // 3. 줄 단위로 순회하면서 오직 ## 1. ~ ## 4. 만 H2로 유지하고 나머지는 모두 ### 으로 변환
  const lines = content.split("\n");
  const fixedLines = lines.map((line) => {
    const trimmed = line.trim();
    // 2개 이상의 해시로 시작하는 헤딩인 경우
    if (/^##(?:\s+|$)/.test(trimmed)) {
      // 정확히 ## 1. ~ ## 4. 로 시작하면 H2 유지
      if (/^##\s+[1-4]\./.test(trimmed)) {
        return trimmed;
      }
      // 그 외의 모든 H2(비교표, 세부항목, 소제목 등)는 H3(###)으로 강등
      const headingText = trimmed.replace(/^##\s*/, "");
      return `### ${headingText}`;
    }
    return line;
  });

  content = fixedLines.join("\n");

  // 4. 문단 간격 정돈: 연속 3개 이상의 개행을 2개로 통일
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  // 5. DB 저장
  db.prepare("UPDATE articles SET content = ? WHERE id = ?").run(content, r.id);
}

console.log("=== Fix Perfect Headings Line-by-Line 완료 ===");
