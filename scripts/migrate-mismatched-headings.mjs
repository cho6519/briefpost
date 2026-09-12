import Database from "better-sqlite3";
import path from "path";
import { normalizeArticleContent } from "../src/lib/articleValidator";

const db = new Database(path.join(process.cwd(), "data", "news.db"));

console.log("=== 기존 기사 소제목 템플릿 및 마크다운 정규화 재실행 ===");

const rows = db.prepare("SELECT id, slug, title, category, content FROM articles").all();

let updatedCount = 0;
const updateStmt = db.prepare("UPDATE articles SET content = ? WHERE id = ?");

for (const row of rows) {
  let content = row.content;

  // 단독 '#' 줄 제거
  content = content.replace(/^[ \t]*#[ \t]*$/gm, "");

  if (row.category === "사회·문화") {
    content = content
      .replace(/^##\s+(?:1\.\s*)?핵심\s*개요\s*및\s*주요\s*쟁점/gm, "## 1. 핵심 개요 및 배경")
      .replace(/^##\s+(?:2\.\s*)?(?:지원\s*대상\s*및\s*자격\s*요건|지원\s*대상\s*및\s*시장\s*파급\s*효과|누가\s*받을\s*수\s*있나\?)/gm, "## 2. 주요 쟁점 및 파장")
      .replace(/^##\s+(?:3\.\s*)?세부\s*혜택(?:\s*\n+\s*및\s*수치\s*비교|\s*및\s*수치\s*비교)?/gm, "## 3. 각계 반응 및 주요 쟁점 비교")
      .replace(/^##\s+주요\s*혜택\s*및\s*수치\s*비교/gm, "## 3. 각계 반응 및 주요 쟁점 비교")
      .replace(/^##\s+(?:4\.\s*)?신청\s*방법(?:\s*\n+\s*및\s*향후\s*일정|\s*및\s*향후\s*일정)?/gm, "## 4. 향후 전망 및 관전 포인트")
      .replace(/^##\s+어떻게\s*신청하나\?/gm, "## 4. 향후 전망 및 관전 포인트");

    // 하위 소제목 H2 -> H3
    content = content
      .replace(/^##\s+(주요\s*검증\s*기준[^\n]*)/gm, "### $1")
      .replace(/^##\s+(인사\s*정국\s*대응[^\n]*)/gm, "### $1")
      .replace(/^##\s+(향후\s*주요일정[^\n]*)/gm, "### $1");

  } else if (row.category === "금융·경제") {
    content = content
      .replace(/^##\s+(?:1\.\s*)?핵심\s*개요\s*및\s*주요\s*쟁점/gm, "## 1. 주요 동향 및 배경")
      .replace(/^##\s+(?:2\.\s*)?(?:지원\s*대상\s*및\s*자격\s*요건|지원\s*대상\s*및\s*시장\s*파급\s*효과|누가\s*받을\s*수\s*있나\?)/gm, "## 2. 기술·시장적 파급 효과")
      .replace(/^##\s+(?:3\.\s*)?세부\s*혜택(?:\s*\n+\s*및\s*수치\s*비교|\s*및\s*수치\s*비교)?/gm, "## 3. 핵심 지표 및 수치 비교")
      .replace(/^##\s+주요\s*혜택\s*및\s*수치\s*비교/gm, "## 3. 핵심 지표 및 수치 비교")
      .replace(/^##\s+(?:4\.\s*)?신청\s*방법(?:\s*\n+\s*및\s*향후\s*일정|\s*및\s*향후\s*일정)?/gm, "## 4. 향후 전망 및 시사점")
      .replace(/^##\s+어떻게\s*신청하나\?/gm, "## 4. 향후 전망 및 시사점");

    content = content
      .replace(/^##\s+(주요\s*자격\s*및\s*대출\s*요건[^\n]*)/gm, "### $1")
      .replace(/^##\s+(시장\s*지표\s*및\s*수치\s*비교[^\n]*)/gm, "### $1")
      .replace(/^##\s+(공식\s*확인처\s*및\s*유의\s*사항[^\n]*)/gm, "### $1")
      .replace(/^##\s+(주요\s*수혜\s*대상\s*및\s*경제적\s*파급\s*효과[^\n]*)/gm, "### $1");

  } else if (row.category === "테크·IT") {
    content = content
      .replace(/^##\s+(?:1\.\s*)?핵심\s*개요\s*및\s*주요\s*쟁점/gm, "## 1. 주요 동향 및 배경")
      .replace(/^##\s+(?:2\.\s*)?(?:지원\s*대상\s*및\s*자격\s*요건|누가\s*받을\s*수\s*있나\?)/gm, "## 2. 기술·시장적 파급 효과")
      .replace(/^##\s+(?:3\.\s*)?세부\s*혜택(?:\s*\n+\s*및\s*수치\s*비교|\s*및\s*수치\s*비교)?/gm, "## 3. 핵심 지표 및 스펙 비교")
      .replace(/^##\s+주요\s*혜택\s*및\s*수치\s*비교/gm, "## 3. 핵심 지표 및 스펙 비교")
      .replace(/^##\s+(?:4\.\s*)?신청\s*방법(?:\s*\n+\s*및\s*향후\s*일정|\s*및\s*향후\s*일정)?/gm, "## 4. 향후 전망 및 시사점")
      .replace(/^##\s+어떻게\s*신청하나\?/gm, "## 4. 향후 전망 및 시사점");
  }

  // normalizeArticleContent 적용
  content = normalizeArticleContent(content);

  updateStmt.run(content, row.id);
  updatedCount++;
}

console.log(`🎉 ${updatedCount}건 정규화 완료!`);
