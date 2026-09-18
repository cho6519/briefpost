const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, title, summary, content FROM articles").all();

const domainRegex = /[a-zA-Z0-9-]+\.(?:com|co\.kr|net|org|kr|asia|news)/gi;

const contaminated = [];

for (const row of rows) {
  const sumMatches = (row.summary || "").match(domainRegex) || [];
  const conMatches = (row.content || "").match(domainRegex) || [];
  
  // 공식 사이트 안내(예: semas.or.kr, bizinfo.go.kr 등)는 의도된 것이므로 제외하고, 언론사 도메인만 체크
  const isExcluded = (d) => /semas\.or\.kr|bizinfo\.go\.kr|gov\.kr|bok\.or\.kr|kostat\.go\.kr|nts\.go\.kr/i.test(d);
  
  const badSum = sumMatches.filter(d => !isExcluded(d));
  const badCon = conMatches.filter(d => !isExcluded(d));
  
  if (badSum.length > 0 || badCon.length > 0) {
    contaminated.push({
      id: row.id,
      title: row.title,
      badSum,
      badCon,
    });
  }
}

console.log(`총 ${contaminated.length}건의 기사에서 언론사 도메인 발견:`);
contaminated.forEach(c => {
  console.log(`- [ID ${c.id}] ${c.title}`);
  if (c.badSum.length > 0) console.log(`  요약 도메인:`, c.badSum);
  if (c.badCon.length > 0) console.log(`  본문 도메인:`, c.badCon);
});
