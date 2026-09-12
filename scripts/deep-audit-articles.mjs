import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, slug, title, category, content FROM articles ORDER BY id ASC").all();

console.log("=== 전체 35건 기사 불일치 헤딩 및 서두 진단 ===");

const problematic = [];

for (const r of rows) {
  const issues = [];
  const lines = r.content.split("\n");

  // 1. 소제목 줄바꿈 깨짐 검사 (예: '## 1. 주요 동향' 뒤에 바로 다음 줄에 '및 배경')
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i].trim();
    const l2 = lines[i + 1].trim();
    if (l1.startsWith("## ") && (l2.startsWith("및 ") || l2.startsWith("수치 비교") || l2.startsWith("자격 요건") || l2.startsWith("파장") || l2.startsWith("시사점"))) {
      issues.push(`소제목 줄바꿈 깨짐: "${l1}" + "${l2}"`);
    }
  }

  // 2. 카테고리-내용 불일치 검사
  if (r.title.includes("딩크 부부") || r.title.includes("시어머니")) {
    if (r.category !== "사회·문화" || r.content.includes("디지털 산업") || r.content.includes("신제품")) {
      issues.push("상속 기사에 테크 카테고리 및 IT 신제품 텍스트 오염");
    }
  }

  if (r.title.includes("우리 은하") && (r.content.includes("제품 출시") || r.content.includes("사용자 경험"))) {
    issues.push("은하 천문학 기사에 제품 출시/사용자 경험 오염");
  }

  if (r.title.includes("눈을 크게 떠라") && r.content.includes("기술 동향")) {
    issues.push("도서/문화 기사에 기술 동향 오염");
  }

  // 3. 비정책 기사에 '지원 대상' 잔존 검사
  if (r.category !== "정책·지원금" && (r.content.includes("## 2. 지원 대상") || r.content.includes("## 4. 신청 방법"))) {
    issues.push("비정책 기사에 지원 대상/신청 방법 잔존");
  }

  // 4. 테이블 캡션이 H2로 잘못 들어간 경우
  if (/^##\s+[^\n]*(?:비교표|표\b)/m.test(r.content)) {
    issues.push("비교표 캡션이 H2(##)로 렌더링되어 불필요한 블루바 생성");
  }

  if (issues.length > 0) {
    problematic.push({ id: r.id, title: r.title, category: r.category, issues });
  }
}

console.log(`총 ${problematic.length}건의 기사에서 개선 포인트 발견:\n`);
problematic.forEach((p) => {
  console.log(`[ID: ${p.id}] [${p.category}] ${p.title}`);
  p.issues.forEach((iss) => console.log(`   ⚠️ ${iss}`));
});
