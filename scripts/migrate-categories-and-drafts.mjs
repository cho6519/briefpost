import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "news.db");
const backupPath = path.join(process.cwd(), "data", `news.db.backup.${Date.now()}`);

// 1. Backup
fs.copyFileSync(dbPath, backupPath);
console.log(`📦 DB 백업 완료: ${backupPath}`);

const db = new Database(dbPath);

// 2. ID 117 재분류: 소상공인 중금리 대출/자금지원 글 -> [정책자금·대출], status: 'PUBLISHED'
db.prepare(`
  UPDATE articles 
  SET category = '정책자금·대출', status = 'PUBLISHED'
  WHERE id = 117
`).run();
console.log("✅ ID 117 재분류 완료: [정책자금·대출] (PUBLISHED)");

// 3. 기존 카테고리 5대 핵심 카테고리명으로 표준화
const renameMap = [
  { from: ["정책자금", "정책자금/대출"], to: "정책자금·대출" },
  { from: ["지원금/바우처", "지원금·바우처"], to: "정부지원금·바우처" },
  { from: ["세금/절세"], to: "세금·절세" },
  { from: ["인건비/4대보험"], to: "인건비·4대보험" },
  { from: ["폐업/재기지원"], to: "폐업·재기지원" },
];

for (const item of renameMap) {
  for (const f of item.from) {
    const res = db.prepare(`UPDATE articles SET category = ? WHERE category = ? AND status = 'PUBLISHED'`).run(item.to, f);
    if (res.changes > 0) {
      console.log(`✅ [${f} -> ${item.to}] ${res.changes}건 카테고리명 변경 완료`);
    }
  }
}

// 4. 소상공인 5대 주제와 맞지 않는 이전 글들(IT 단신, 사회 일반 등) 비공개(DRAFT) 유지 확인
const draftCategories = ["테크·IT", "사회·문화", "글로벌 AI 스타트업 & 벤처 생태계", "정책·지원금", "금융·경제"];
for (const cat of draftCategories) {
  const res = db.prepare(`UPDATE articles SET status = 'DRAFT' WHERE category = ? AND id != 117`).run(cat);
  if (res.changes > 0) {
    console.log(`🔒 [비공개 처리] ${cat} 잔여 ${res.changes}건 DRAFT 확정`);
  }
}

// 5. 검증 리포트
const publishedRows = db.prepare(`
  SELECT category, count(*) as count 
  FROM articles 
  WHERE status = 'PUBLISHED' 
  GROUP BY category
  ORDER BY count DESC
`).all();

console.log("\n📊 [최종 공개 기사 현황 (PUBLISHED)]");
console.table(publishedRows);

const draftRows = db.prepare(`
  SELECT category, count(*) as count 
  FROM articles 
  WHERE status = 'DRAFT' 
  GROUP BY category
  ORDER BY count DESC
`).all();

console.log("\n🔒 [최종 비공개 기사 현황 (DRAFT)]");
console.table(draftRows);
