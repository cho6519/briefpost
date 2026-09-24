import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "news.db");
const db = new Database(dbPath);

console.log("=== DB 기사 검사 및 칼럼/오피니언 기사 정리 ===");
const articles = db.prepare("SELECT * FROM articles").all() as any[];

console.log(`현재 총 기사 수: ${articles.length}건`);
if (articles.length > 0) {
  console.log("테이블 컬럼들:", Object.keys(articles[0]));
}

const targetsToDelete: { id: number; slug: string; title: string; reason: string }[] = [];

const opinionKeywords = ["칼럼", "사설", "오피니언", "시론", "기고", "기자수첩", "데스크", "만평"];

for (const a of articles) {
  // 1. 특정 요청된 슬러그 또는 subsidy-welfare
  if (a.slug === "subsidy-welfare" || a.slug?.includes("column") || a.slug?.includes("opinion")) {
    targetsToDelete.push({ id: a.id, slug: a.slug, title: a.title, reason: `슬러그 매칭 (${a.slug})` });
    continue;
  }

  // 2. 제목에 칼럼/사설/오피니언 키워드 포함
  for (const kw of opinionKeywords) {
    if (a.title?.includes(kw) || a.title?.includes(`[${kw}]`)) {
      targetsToDelete.push({ id: a.id, slug: a.slug, title: a.title, reason: `제목에 칼럼/오피니언 키워드 '${kw}' 포함` });
      break;
    }
  }
}

console.log(`\n삭제 대상 칼럼성 기사: 총 ${targetsToDelete.length}건`);
targetsToDelete.forEach((t) => {
  console.log(`- [ID ${t.id}] (${t.slug}) ${t.title} -> 사유: ${t.reason}`);
});

if (targetsToDelete.length > 0) {
  const deleteStmt = db.prepare("DELETE FROM articles WHERE id = ?");
  for (const t of targetsToDelete) {
    deleteStmt.run(t.id);
  }
  console.log(`\n✅ ${targetsToDelete.length}건의 칼럼성 기사가 DB에서 완전히 삭제되었습니다.`);
} else {
  console.log("\n삭제 대상 칼럼성 기사가 없습니다.");
}

const remaining = db.prepare("SELECT count(*) as count FROM articles").get() as { count: number };
console.log(`\n남은 기사 수: ${remaining.count}건`);
