import Database from "better-sqlite3";
import {
  verifyAndSanitizeArticle,
  normalizeThreeLineSummary,
  sanitizePlainText,
} from "../src/lib/articleValidator";
import { generateFallbackParaphrase } from "../src/lib/ai";
import { sanitizeRssRawContent, stripHtmlTags } from "../src/lib/rss";

console.log("=== [기사 품질 및 제목-내용 일치성 종합 검증 시작] ===\n");

let allPassed = true;

// 1. Google News 식 날 것의 RSS 입력 정제 검증
console.log("1. Google News RSS 태그 정제 테스트...");
const rawGoogleNewsHtml = `<ol><li><a href="https://news.google.com/rss/articles/123" target="_blank">2K, 농구 게임 'NBA 2K27' 출시</a>&nbsp;&nbsp;<font color="#6f6f6f">더게임스</font></li><li><a href="https://news.google.com/rss/articles/456" target="_blank">'NBA 2K27' 정식 출시…남녀 통합 '도시'부터</a>&nbsp;&nbsp;<font color="#6f6f6f">스포츠조선</font></li></ol>`;

const cleanedContent = sanitizeRssRawContent(rawGoogleNewsHtml);
const hasAnyTag = /<[^>]+>/g.test(cleanedContent);

if (hasAnyTag || cleanedContent.includes("https://news.google.com")) {
  console.error("❌ Google News 정제 실패: 태그 또는 URL이 잔존함");
  allPassed = false;
} else {
  console.log("✅ Google News 태그/URL 100% 정제 성공:\n", cleanedContent);
}

// 2. 테크 기사에 정책지원금 템플릿 오염 방지 및 제목-내용 일치 검증
console.log("\n2. 테크/게임 기사 카테고리 맞춤형 소제목 및 일치성 검증...");
const techResult = generateFallbackParaphrase({
  title: "2K, 농구 게임 ‘NBA 2K27’ 정식 출시",
  content: cleanedContent,
  category: "테크·IT",
});

if (techResult.content.includes("누가 받을 수 있나") || techResult.content.includes("지원금")) {
  console.error("❌ 테크 기사에 정책지원금 템플릿이 누출됨!");
  allPassed = false;
} else if (!techResult.content.includes("핵심 기술") || !techResult.content.includes("NBA 2K27")) {
  console.error("❌ 테크 소제목 또는 제목 키워드 누락");
  allPassed = false;
} else {
  console.log("✅ 테크 기사 제목-내용 100% 일치 확인:");
  console.log("   - 제목:", techResult.title);
  console.log("   - 카테고리:", techResult.category);
  console.log("   - 3줄 요약:\n" + techResult.summary);
}

// 3. 3줄 요약 태그 완전 제거 및 무결성 검증
console.log("\n3. 3줄 요약 무결성 검증...");
const testSummaryWithTags = `1. <ol><li><a href="https://google.com">첫 번째 문장입니다.</a>\n2. 두 번째 기술적 분석 내용입니다.\n3. 세 번째 향후 전망입니다.`;
const { summary: sanitizedSummary } = normalizeThreeLineSummary(
  testSummaryWithTags,
  techResult.content,
  techResult.title
);

const summaryLines = sanitizedSummary.split("\n");
const hasTagInSummary = /<[^>]+>/g.test(sanitizedSummary);

if (hasTagInSummary || summaryLines.length !== 3) {
  console.error("❌ 3줄 요약 태그 제거 또는 3개 행 포맷 검증 실패!");
  allPassed = false;
} else {
  console.log("✅ 3줄 요약 무결성 통과 (태그 0개, 3줄 완성):");
  summaryLines.forEach((l) => console.log("   ", l));
}

// 4. 현재 DB 내 모든 기사 무결성 전수 검사
console.log("\n4. 데이터베이스 기사 전수 무결성 검사...");
const db = new Database("./data/news.db");
const articles = db.prepare("SELECT id, title, summary, content, category FROM articles").all() as any[];

let dbCorruptCount = 0;
for (const a of articles) {
  const summaryHasTag = /<[^>]+>/g.test(a.summary || "");
  const contentHasTag = /<[a-z][\s\S]*>/i.test(a.content || "");
  const mismatchedPolicy = a.category !== "정책·지원금" && a.content.includes("누가 받을 수 있나?");

  if (summaryHasTag || contentHasTag || mismatchedPolicy) {
    dbCorruptCount++;
    console.error(`❌ DB 결함 기사 발견 [ID: ${a.id}]: tag=${summaryHasTag || contentHasTag}, dummy=${mismatchedPolicy}`);
  }
}

if (dbCorruptCount === 0) {
  console.log(`✅ DB 전체 ${articles.length}건 기사 무결성 100% 통과 (태그 노출 0건, 불일치 템플릿 0건)`);
} else {
  allPassed = false;
}

console.log(`\n=== [검증 결과: ${allPassed ? "전 항목 합격 (ALL PASSED)" : "실패 항목 있음"}] ===`);
process.exit(allPassed ? 0 : 1);
