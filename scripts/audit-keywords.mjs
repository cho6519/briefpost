import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));

const keywords = [
  "준비 중",
  "준비중",
  "미완성",
  "Lorem",
  "ChatGPT",
  "Gemini",
  "GPT-4",
  "GPT-3",
  "인공지능이 작성",
  "인공지능 모델",
];

console.log("=== DB 기사 텍스트 전수 감사 시작 ===");

const rows = db.prepare("SELECT id, slug, title, summary, content, category FROM articles").all();
console.log("검사 대상 총 기사 수:", rows.length);

let foundCount = 0;

for (const row of rows) {
  for (const kw of keywords) {
    const inTitle = row.title.includes(kw);
    const inSummary = row.summary.includes(kw);
    const inContent = row.content ? row.content.includes(kw) : false;

    if (inTitle || inSummary || inContent) {
      console.log(`[키워드 발견] ID ${row.id} (${row.category}) - 키워드: "${kw}"`);
      console.log(`  제목: ${row.title}`);
      if (inTitle) console.log("  -> 제목에 포함됨");
      if (inSummary) console.log("  -> 3줄 요약에 포함됨");
      if (inContent) console.log("  -> 본문에 포함됨");
      foundCount++;
    }
  }
}

if (foundCount === 0) {
  console.log("✅ 결과: DB 내 탈락 유발 키워드(준비 중, 미완성, Lorem, ChatGPT, Gemini 등)가 단 1건도 발견되지 않았습니다!");
} else {
  console.log(`⚠️ 결과: 총 ${foundCount}건의 키워드가 발견되었습니다.`);
}
