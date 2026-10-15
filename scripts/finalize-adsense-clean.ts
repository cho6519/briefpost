import fs from "fs";
import path from "path";
import db from "../src/lib/db";
import { isNeonConfigured, getNeonSql } from "../src/lib/neonDb";

// 5대 핵심 카테고리 분류 함수
function classifyArticle(id: number, title: string, currentCategory: string, len: number): { keep: boolean; targetCategory?: string; reason: string } {
  const t = title.toLowerCase();

  // 1. 1500자 미만 무조건 제외
  if (len < 1500) {
    return { keep: false, reason: "1500자 미만 (Thin Content)" };
  }

  // 2. 비관련/테스트/일반 뉴스/증시/부동산/IT
  if (
    t.includes("b2b saas") ||
    t.includes("edge llm") ||
    t.includes("orchestration") ||
    t.includes("반도체") ||
    t.includes("ai 속도") ||
    t.includes("ai 위험") ||
    t.includes("ai 개발 제동") ||
    t.includes("ai 트렌드") ||
    t.includes("딥마인드") ||
    t.includes("클라우드 서비스 보안인증") ||
    t.includes("우주") ||
    t.includes("은하") ||
    t.includes("픽셀워치") ||
    t.includes("애플워치") ||
    t.includes("ps6") ||
    t.includes("미디어 지형도") ||
    t.includes("크롬 제로데이") ||
    t.includes("지브리") ||
    t.includes("피아니스트") ||
    t.includes("클래식") ||
    t.includes("에세이") ||
    t.includes("태풍") ||
    t.includes("피난처 도시") ||
    t.includes("딩크 부부") ||
    t.includes("혼인지원금") ||
    t.includes("보도자료") ||
    t.includes("의사록") ||
    t.includes("코스피") ||
    t.includes("뉴욕증시") ||
    t.includes("국채 금리") ||
    t.includes("국채금리") ||
    t.includes("fx스와프") ||
    t.includes("빚투") ||
    t.includes("애프터마켓") ||
    t.includes("노무라") ||
    t.includes("미 연준") ||
    t.includes("미국 금리") ||
    t.includes("기준금리 인상") ||
    t.includes("세계 1위 국부펀드") ||
    t.includes("증시") ||
    t.includes("토허구역") ||
    t.includes("청문회") ||
    t.includes("국토장관") ||
    t.includes("비거주 1주택") ||
    t.includes("서울 아파트") ||
    t.includes("강북 아파트") ||
    t.includes("석유화학") ||
    t.includes("응급실") ||
    t.includes("서울청년문화패스") ||
    t.includes("청년 주택드림") ||
    t.includes("청년도약계좌") ||
    t.includes("청년 주거정책") ||
    t.includes("재생에너지") ||
    t.includes("수출물가") ||
    t.includes("할당관세") ||
    t.includes("중동 원유") ||
    t.includes("대미투자") ||
    t.includes("환율 1370") ||
    t.includes("환율 23개월") ||
    t.includes("금융안정 상황") ||
    t.includes("일자리 양극화") ||
    t.includes("노동시장 격차") ||
    t.includes("인류 멸종") ||
    t.includes("보건복지부") ||
    t.includes("확장재정 논란") ||
    t.includes("주식시장")
  ) {
    return { keep: false, reason: "비관련 일반/증시/IT/부동산/정책" };
  }

  // 3. 5대 핵심 카테고리 매핑
  // 3-1. 폐업·재기지원
  if (
    t.includes("새출발기금") ||
    t.includes("희망리턴패키지") ||
    t.includes("폐업") ||
    t.includes("재창업") ||
    t.includes("채무조정") ||
    t.includes("철거비")
  ) {
    return { keep: true, targetCategory: "폐업·재기지원", reason: "소상공인 폐업 및 재기지원" };
  }

  // 3-2. 인건비·4대보험
  if (
    t.includes("두루누리") ||
    t.includes("4대보험") ||
    t.includes("사회보험료") ||
    t.includes("청년 일자리 도약장려금") ||
    t.includes("산안법") ||
    t.includes("고용지원금") ||
    t.includes("인건비")
  ) {
    return { keep: true, targetCategory: "인건비·4대보험", reason: "소상공인 인건비 및 4대보험" };
  }

  // 3-3. 세금·절세
  if (
    t.includes("간이과세") ||
    t.includes("노란우산공제") ||
    t.includes("부가가치세") ||
    t.includes("소득세") ||
    t.includes("절세") ||
    t.includes("세무")
  ) {
    return { keep: true, targetCategory: "세금·절세", reason: "소상공인 세무 및 절세" };
  }

  // 3-4. 정책자금·대출
  if (
    t.includes("정책자금") ||
    t.includes("대환대출") ||
    t.includes("직접대출") ||
    t.includes("대리대출") ||
    t.includes("경영안정자금") ||
    t.includes("이차보전") ||
    t.includes("저리 대출") ||
    t.includes("저리 융자") ||
    t.includes("소상공인 금융") ||
    t.includes("온투업")
  ) {
    return { keep: true, targetCategory: "정책자금·대출", reason: "소상공인 정책자금 및 대출" };
  }

  // 3-5. 정부지원금·바우처
  if (
    t.includes("전기요금") ||
    t.includes("스마트상점") ||
    t.includes("고효율") ||
    t.includes("민생지원금") ||
    t.includes("소상공인 원스톱") ||
    t.includes("소상공인 맞춤형") ||
    t.includes("바우처") ||
    t.includes("경영비 부담 완화") ||
    t.includes("피해지원금") ||
    t.includes("정부 정책 지원금") ||
    t.includes("지원사업") ||
    t.includes("온양온천시장")
  ) {
    return { keep: true, targetCategory: "정부지원금·바우처", reason: "소상공인 지원금 및 바우처" };
  }

  return { keep: false, reason: "5대 주제 미해당" };
}

async function runClean() {
  console.log("🚀 [Final Adsense Clean] 시작...");

  // 1. SQLite 백업
  const dbPath = path.join(process.cwd(), "data", "news.db");
  const backupPath = path.join(process.cwd(), "data", `news.db.backup.${Date.now()}`);
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`📦 DB 백업 완료: ${backupPath}`);
  }

  // 2. 전체 기사 조회
  const rows = db.prepare("SELECT id, title, category, length(content) as len, status FROM articles").all() as any[];
  console.log(`총 ${rows.length}개 기사 검사 중...`);

  const updateDraftStmt = db.prepare("UPDATE articles SET status = 'DRAFT' WHERE id = ?");
  const updatePubStmt = db.prepare("UPDATE articles SET status = 'PUBLISHED', category = ? WHERE id = ?");

  let draftCount = 0;
  let keepCount = 0;
  const categoryStats: Record<string, number> = {};

  for (const r of rows) {
    const res = classifyArticle(r.id, r.title, r.category, r.len);
    if (res.keep && res.targetCategory) {
      updatePubStmt.run(res.targetCategory, r.id);
      categoryStats[res.targetCategory] = (categoryStats[res.targetCategory] || 0) + 1;
      keepCount++;
    } else {
      updateDraftStmt.run(r.id);
      draftCount++;
    }
  }

  console.log(`\n✅ SQLite 정리 완료!`);
  console.log(`- PUBLISHED (노출 유지): ${keepCount}개`);
  console.log(`- DRAFT (노출 제외): ${draftCount}개`);
  console.log(`- 카테고리별 분포:`, JSON.stringify(categoryStats, null, 2));

  // 3. Neon DB 동기화 (설정되어 있을 경우)
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      console.log("\n🐘 Neon PostgreSQL 동기화 진행...");
      for (const r of rows) {
        const res = classifyArticle(r.id, r.title, r.category, r.len);
        if (res.keep && res.targetCategory) {
          await sql`UPDATE articles SET status = 'PUBLISHED', category = ${res.targetCategory} WHERE id = ${r.id}`;
        } else {
          await sql`UPDATE articles SET status = 'DRAFT' WHERE id = ${r.id}`;
        }
      }
      console.log("✅ Neon PostgreSQL 동기화 완료!");
    }
  }
}

runClean().catch(console.error);
