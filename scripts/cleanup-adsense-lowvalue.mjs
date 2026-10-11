import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

console.log("=== 애드센스 가치없는 콘텐츠 대응: DB 정밀 정제 작업 시작 ===");

// 1. 명백한 쓰레기/초단문/입찰공고 기사 삭제
// ID 27: 연합뉴스 이 시각 헤드라인 (674자)
// ID 24: 문명 VII 게임 단신 (895자)
// ID 30: NBA 2K27 농구게임 (715자)
// ID 28: 강남3구 거래 실종 단신 (699자)
// ID 31: 블룸버그 ECB 단신 (674자)
// ID 113: 아시아문화전당 용역 입찰 공고
const deleteIds = [24, 27, 28, 30, 31, 113];

const deleteStmt = db.prepare("DELETE FROM articles WHERE id = ?");
for (const id of deleteIds) {
  const row = db.prepare("SELECT title FROM articles WHERE id = ?").get(id);
  if (row) {
    deleteStmt.run(id);
    console.log(`[삭제 완료] ID ${id}: ${row.title}`);
  }
}

// 2. 극소수 고립 카테고리 정상 통합
// 부동산·세제 -> 금융·경제
// 정치·사회 -> 사회·문화
const catUpdate1 = db.prepare("UPDATE articles SET category = '금융·경제' WHERE category = '부동산·세제'").run();
console.log(`[카테고리 정리] '부동산·세제' -> '금융·경제' (${catUpdate1.changes}건 변경)`);

const catUpdate2 = db.prepare("UPDATE articles SET category = '사회·문화' WHERE category = '정치·사회'").run();
console.log(`[카테고리 정리] '정치·사회' -> '사회·문화' (${catUpdate2.changes}건 변경)`);

// 3. 제목 및 본문의 타 매체 꼬리표/불필요 접미사 정제
const rows = db.prepare("SELECT id, title, content, summary FROM articles").all();

const suffixReplacements = [
  { pattern: /\s*-\s*기업마당\s*$/g, replacement: "" },
  { pattern: /\s*-\s*대한민국\s*정책브리핑\s*$/g, replacement: "" },
  { pattern: /\s*-\s*한국무역협회\s*$/g, replacement: "" },
  { pattern: /\s*-\s*할당관세 적용 거래에 대한 관리·감독 및 조사 강화에 대비해야\s*-\s*법무법인 세종\s*$/g, replacement: "" },
  { pattern: /\s*Martin Cid Magazine\s*$/g, replacement: "" },
  { pattern: /\s*위키트리\s*$/g, replacement: "" },
  { pattern: /^\[서울\]\s*/g, replacement: "서울 " },
];

let titleCleanedCount = 0;
const updateTitleStmt = db.prepare("UPDATE articles SET title = ?, metaTitle = ? WHERE id = ?");

for (const r of rows) {
  let newTitle = r.title;
  for (const { pattern, replacement } of suffixReplacements) {
    newTitle = newTitle.replace(pattern, replacement).trim();
  }

  if (newTitle !== r.title) {
    updateTitleStmt.run(newTitle, newTitle, r.id);
    console.log(`[제목 정제] ID ${r.id}:\n  이전: ${r.title}\n  변경: ${newTitle}`);
    titleCleanedCount++;
  }
}

console.log(`\n제목 정제 총 ${titleCleanedCount}건 완료`);

// 4. 본문 상단에 기형적으로 들어간 제목/꼬리표 중복 라인 정제
let contentCleanedCount = 0;
const updateContentStmt = db.prepare("UPDATE articles SET content = ? WHERE id = ?");

const updatedRows = db.prepare("SELECT id, content FROM articles").all();
for (const r of updatedRows) {
  let content = r.content;
  let changed = false;

  // 본문 내 잔존 꼬리표 텍스트 제거
  if (content.includes("기업마당")) {
    content = content.replace(/-\s*기업마당/g, "").replace(/기업마당\./g, "");
    changed = true;
  }
  if (content.includes("대한민국 정책브리핑")) {
    content = content.replace(/-\s*대한민국\s*정책브리핑/g, "");
    changed = true;
  }
  if (content.includes("Martin Cid Magazine")) {
    content = content.replace(/Martin Cid Magazine/g, "");
    changed = true;
  }

  if (changed) {
    updateContentStmt.run(content, r.id);
    contentCleanedCount++;
  }
}

console.log(`본문 잔여 꼬리표 정제 총 ${contentCleanedCount}건 완료`);

// 5. 정제 후 현황 집계
const finalCount = db.prepare("SELECT count(*) as c FROM articles").get().c;
const finalCats = db.prepare("SELECT category, count(*) as c FROM articles GROUP BY category").all();
console.log("\n=== 정제 후 최종 DB 상태 ===");
console.log(`총 기사 수: ${finalCount}개`);
console.log("카테고리 분포:", finalCats);
