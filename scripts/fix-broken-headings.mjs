import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));

console.log("=== [전수 검사 및 복원] 빈 헤딩 및 비정상 소제목 교정 ===");

const rows = db.prepare("SELECT id, slug, title, category, content FROM articles").all();
const updateStmt = db.prepare("UPDATE articles SET content = ? WHERE id = ?");

let fixedCount = 0;

for (const r of rows) {
  let c = r.content;
  const original = c;

  // 1. ID 41 특화 복원
  if (r.id === 41) {
    c = c.replace(/##\s*\n+여권 지도부는/g, "## 4. 향후 전망 및 관전 포인트\n\n여권 지도부는");
  }

  // 2. 단독 빈 헤딩 '##' 바로 뒤에 문단이 오는 경우 탐지 및 복원
  c = c.replace(/^##\s*$/gm, "");

  // 3. '## 1. ', '## 2. ', '## 3. ', '## 4. ' 대제목이 정상적인지 확인
  // ID 37 (유가 기사)
  if (r.id === 37) {
    c = c
      .replace(/^##\s+1\.\s*주요\s*동향\s*$/gm, "## 1. 주요 동향 및 배경")
      .replace(/^##\s+2\.\s*기술·시장적\s*파급\s*효과\s*$/gm, "## 2. 기술·시장적 파급 효과")
      .replace(/^##\s+3\.\s*핵심\s*지표\s*및\s*수치\s*비교\s*$/gm, "## 3. 핵심 지표 및 수치 비교")
      .replace(/^##\s+4\.\s*향후\s*전망\s*및\s*시사점\s*$/gm, "## 4. 향후 전망 및 시사점");
  }

  // ID 38 (대출 규제 강북 아파트값 기사)
  if (r.id === 38) {
    c = c
      .replace(/^##\s+1\.\s*주요\s*동향\s*$/gm, "## 1. 주요 동향 및 배경")
      .replace(/^##\s+2\.\s*기술·시장적\s*파급\s*효과\s*$/gm, "## 2. 기술·시장적 파급 효과")
      .replace(/^##\s+3\.\s*핵심\s*지표\s*및\s*수치\s*비교\s*$/gm, "## 3. 핵심 지표 및 수치 비교")
      .replace(/^##\s+4\.\s*향후\s*전망\s*및\s*시사점\s*$/gm, "## 4. 향후 전망 및 시사점");
  }

  // 4. 불필요한 연속 개행 정리
  c = c.replace(/\n{3,}/g, "\n\n").trim();

  if (c !== original) {
    updateStmt.run(c, r.id);
    console.log(`[복원 완료] ID ${r.id} [${r.category}] "${r.title}"`);
    fixedCount++;
  }
}

console.log(`\n🎉 총 ${fixedCount}건의 기사 헤딩 정상 복원 완료!`);
