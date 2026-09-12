import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, content FROM articles ORDER BY id ASC").all();

console.log("=== 전수조사: 전체 35건 기사 대제목 & 가독성 정밀 진단 ===\n");

const issues = [];

for (const r of rows) {
  const lines = r.content.split("\n");
  const h2s = lines.filter((l) => /^##\s/.test(l));
  const h3s = lines.filter((l) => /^###\s/.test(l));
  
  const articleIssues = [];

  // 1. H2 개수 검사 (이상적인 구조는 정확히 4개의 1~4 H2 대제목)
  const numberedH2s = h2s.filter((h) => /^##\s+[1-4]\./.test(h));
  if (numberedH2s.length !== 4) {
    articleIssues.push(`H2 번호 체계 미흡 (번호 매겨진 H2: ${numberedH2s.length}개 / 전체 H2: ${h2s.length}개)`);
  }

  // 2. 비대제목 H2 오염 (세부 항목이 H2로 들어간 경우)
  const unnumberedH2s = h2s.filter((h) => !/^##\s+[1-4]\./.test(h));
  if (unnumberedH2s.length > 0) {
    articleIssues.push(`불필요한 비대제목 H2 존재: ${unnumberedH2s.join(", ")}`);
  }

  // 3. 내용-카테고리-제목 불일치 검사
  if (r.content.includes("누가 받을 수 있나?") && !r.category.includes("정책") && !r.category.includes("지원")) {
    articleIssues.push(`지원금 헤딩 불일치 (카테고리: ${r.category})`);
  }

  // 4. 벽돌글 검사 (빈 줄 없이 250자 이상 이어지는 문단)
  const paragraphs = r.content.split(/\n\s*\n/);
  const brickParagraphs = paragraphs.filter((p) => {
    const clean = p.replace(/^#+.*$/gm, "").trim();
    return clean.length > 350 && !clean.includes("|"); // 표 제외
  });
  if (brickParagraphs.length > 0) {
    articleIssues.push(`긴 벽돌글 문단 발견 (${brickParagraphs.length}개 문단 > 350자)`);
  }

  if (articleIssues.length > 0) {
    issues.push({
      id: r.id,
      title: r.title,
      category: r.category,
      slug: r.slug,
      issues: articleIssues,
      h2s: h2s,
    });
  }
}

console.log(`총 ${rows.length}건 중 개선 대상: ${issues.length}건\n`);
for (const item of issues) {
  console.log(`[ID ${item.id}] [${item.category}] ${item.title}`);
  console.log(`  - Issues:`);
  item.issues.forEach((iss) => console.log(`      * ${iss}`));
  console.log(`  - 현재 H2s: ${item.h2s.join(" | ")}`);
  console.log("");
}
