import db from "../src/lib/db";
import { isNeonConfigured, getNeonSql } from "../src/lib/neonDb";

// 소상공인 5대 주제와 맞지 않는 비관련/테스트성 키워드 및 슬러그
const IRRELEVANT_PATTERNS = [
  "Multi-Agent Workflow Orchestration",
  "Edge LLM Compression",
  "피아니스트 김유빈",
  "인공지능 반도체 혁신연구소",
  "클라우드 서비스 보안인증",
  "디지털 추석 명절",
  "일자리 양극화",
  "노동시장 격차",
  "AI 개발 제동론",
  "AI 속도 조절론",
  "인류 멸종 경고",
  "AI 위험론",
  "AI 속도조절론",
  "우주의 비밀, 우리 은하는",
  "구글 픽셀워치",
  "애플워치 watchOS",
  "PS6 가격",
  "모바일 스크롤 시대의 미디어",
  "우주 수소는 그대로인데",
  "구글 크롬 제로데이",
  "제주 바이오 산업",
  "미야자키 하야오",
  "경량화 SLM",
  "구글 딥마인드",
  "B2B SaaS",
  "Edge LLM",
  "SaaS",
  "LLM",
  "클래식",
  "반도체",
  "오피니언",
  "사설",
  "칼럼",
];

async function cleanContent() {
  console.log("🧹 [Clean Content] Thin Content 및 비관련 기사 DRAFT 처리 시작...");

  // SQLite 처리
  const rows = db.prepare("SELECT id, title, slug, category, length(content) as len, status FROM articles").all() as any[];

  let draftCount = 0;
  let keepCount = 0;

  const updateDraftStmt = db.prepare("UPDATE articles SET status = 'DRAFT' WHERE id = ?");
  const updatePublishStmt = db.prepare("UPDATE articles SET status = 'PUBLISHED' WHERE id = ?");

  for (const row of rows) {
    const isThin = row.len < 1500;
    const isIrrelevant = IRRELEVANT_PATTERNS.some((p) => 
      row.title.toLowerCase().includes(p.toLowerCase()) || 
      row.slug.toLowerCase().includes(p.toLowerCase())
    ) || (row.category === "테크·IT" && !row.title.includes("소상공인"));

    if (isThin || isIrrelevant) {
      updateDraftStmt.run(row.id);
      console.log(`[DRAFT 처리] ID ${row.id} (${isThin ? '1500자미만' : '비관련'}) | [${row.category}] ${row.title}`);
      draftCount++;
    } else {
      updatePublishStmt.run(row.id);
      keepCount++;
    }
  }

  console.log(`\n✅ [SQLite 완료] 총 ${rows.length}개 중 ${draftCount}개 DRAFT 처리, ${keepCount}개 PUBLISHED 유지.`);

  // Neon DB 처리 (설정되어 있을 경우)
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      console.log("\n🐘 [Neon DB] Neon 데이터베이스 DRAFT 일괄 처리 진행...");
      const neonRows = await sql`SELECT id, title, slug, category, length(content) as len FROM articles`;
      for (const row of neonRows) {
        const isThin = row.len < 1500;
        const isIrrelevant = IRRELEVANT_PATTERNS.some((p) => 
          row.title.toLowerCase().includes(p.toLowerCase()) || 
          row.slug.toLowerCase().includes(p.toLowerCase())
        ) || (row.category === "테크·IT" && !row.title.includes("소상공인"));

        if (isThin || isIrrelevant) {
          await sql`UPDATE articles SET status = 'DRAFT' WHERE id = ${row.id}`;
        } else {
          await sql`UPDATE articles SET status = 'PUBLISHED' WHERE id = ${row.id}`;
        }
      }
      console.log("✅ [Neon DB 완료] Neon DB DRAFT 처리 완료!");
    }
  }
}

cleanContent().catch(console.error);
