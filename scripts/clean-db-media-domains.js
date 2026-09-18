const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(process.cwd(), "data", "news.db"));
const rows = db.prepare("SELECT id, title, summary, content FROM articles").all();

// 공공/정부기관 공식 신청처 도메인은 제외 (보존)
const isPublicDomain = (domain) => {
  return /go\.kr|gov\.kr|semas\.or\.kr|bizinfo\.go\.kr|bok\.or\.kr|kostat\.go\.kr|nts\.go\.kr/i.test(domain);
};

// 일반 언론사 도메인 패턴 (예: bplusnews.com, eanews.kr, gukjenews.com, edaily.co.kr 등)
const mediaDomainRegex = /\b[a-zA-Z0-9.-]+\.(?:com|co\.kr|net|org|kr|asia|news|tv|cc)\b/gi;

function cleanMediaDomains(text) {
  if (!text) return "";
  return text.replace(mediaDomainRegex, (match) => {
    if (isPublicDomain(match)) {
      return match; // 공공기관 도메인은 보존
    }
    return ""; // 언론사 도메인은 제거
  }).replace(/[ \t]{2,}/g, " ").trim();
}

let fixedCount = 0;

for (const row of rows) {
  const originalSummary = row.summary || "";
  const originalContent = row.content || "";

  let newSummary = cleanMediaDomains(originalSummary);
  let newContent = cleanMediaDomains(originalContent);

  // 이중 공백 및 어색한 조사 정리 (예: "받는다 지원 요건과" -> "받는다. 지원 요건과" 또는 "받는다 관련 지원 요건과")
  newSummary = newSummary
    .replace(/받는다\s+지원 요건과/g, "받는다. 이에 따라 지원 요건과")
    .replace(/등장\s+지원 요건과/g, "등장했습니다. 지원 요건과")
    .replace(/상담\s+지원 요건과/g, "상담을 실시합니다. 지원 요건과")
    .replace(/\s{2,}/g, " ");

  // 본문 상단 ## 1. 지원 사업 개요 및 목적 바로 아래 중복 타이틀 라인 정돈
  newContent = newContent
    .replace(/## 1\. 지원 사업 개요 및 목적\n\n[^\n]+\n\n중소벤처기업부/g, "## 1. 지원 사업 개요 및 목적\n\n중소벤처기업부")
    .replace(/## 1\. 지원 사업 개요 및 목적\n\n[^\n]+\n\n정부/g, "## 1. 지원 사업 개요 및 목적\n\n정부")
    .replace(/\s{2,}/g, " ");

  if (newSummary !== originalSummary || newContent !== originalContent) {
    db.prepare("UPDATE articles SET summary = ?, content = ? WHERE id = ?").run(newSummary, newContent, row.id);
    console.log(`✅ [ID ${row.id}] 기사 요약 및 본문 언론사 도메인 정제 완료!`);
    fixedCount++;
  }
}

console.log(`\n🎉 총 ${fixedCount}건의 기사 정제 완료.`);
